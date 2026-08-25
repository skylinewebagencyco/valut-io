import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { WorkerUser, SecurityAuditEntry, DirectConversation } from '../types';
import { getOrCreateUserKeyPair, UserKeyPair } from '../lib/crypto';
import { isOwner } from '../utils';

export interface DemoPreset {
  displayName: string;
  email: string;
  username: string;
  role: string;
  department: string;
  avatarColor: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    displayName: 'Alex Rivera',
    email: 'alex.rivera@vault-company.internal',
    username: 'alex.rivera',
    role: 'Lead Cryptographer',
    department: 'Security & Core Infra',
    avatarColor: '#5A5A40',
  },
  {
    displayName: 'Sarah Jenkins',
    email: 'sarah.jenkins@vault-company.internal',
    username: 'sarah.jenkins',
    role: 'DevOps & Infra Lead',
    department: 'Cloud Operations',
    avatarColor: '#D1C7B7',
  },
  {
    displayName: 'Liam O\'Connor',
    email: 'liam.oconnor@vault-company.internal',
    username: 'liam.oconnor',
    role: 'Staff Product Architect',
    department: 'Strategy & Engineering',
    avatarColor: '#8DAA82',
  },
  {
    displayName: 'Elena Vance',
    email: 'elena.vance@vault-company.internal',
    username: 'elena.vance',
    role: 'Chief Security Officer',
    department: 'Executive Board',
    avatarColor: '#7A7A70',
  },
];

const PRESET_DEFAULT_PASSWORD = 'VaultEnterprisePassword2026!';

interface AuthContextType {
  currentUser: WorkerUser | null;
  firebaseUser: User | null;
  keyPair: UserKeyPair | null;
  loading: boolean;
  needsUsername: boolean;
  activeWorkers: WorkerUser[];
  conversations: DirectConversation[];
  searchWorkers: (query: string) => WorkerUser[];
  signInWithGoogle: () => Promise<void>;
  signInWithDemoPreset: (preset: DemoPreset) => Promise<void>;
  saveUsernameAndProfile: (username: string, role: string, department: string, avatarColor: string, photoURL?: string, bio?: string) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  loginAsDemoWorker: (workerPreset: Partial<WorkerUser>) => Promise<void>;
  updateUserStatus: (status: 'online' | 'busy' | 'away' | 'offline') => Promise<void>;
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  isUserBlocked: (targetUid: string) => boolean;
  banUser: (targetUid: string, reason?: string) => Promise<void>;
  unbanUser: (targetUid: string) => Promise<void>;
  toggleUserVerified: (targetUid: string, isVerified: boolean) => Promise<void>;
  verifyAllUsers: (verify?: boolean) => Promise<void>;
  logSecurityAudit: (eventType: SecurityAuditEntry['eventType'], details: string, target?: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role: string) => Promise<void>;
  updateUserPin: (pinHash: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<WorkerUser | null>(null);
  const [keyPair, setKeyPair] = useState<UserKeyPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkers, setActiveWorkers] = useState<WorkerUser[]>([]);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);

  // Listen to active workers in company workspace (ONLY when authenticated)
  useEffect(() => {
    if (!firebaseUser) {
      setActiveWorkers([]);
      return;
    }

    const unsubWorkers = onSnapshot(
      collection(db, 'users'), 
      (snapshot) => {
        const workers: WorkerUser[] = [];
        snapshot.forEach((docSnap) => {
          const wData = docSnap.data() as WorkerUser;
          workers.push(wData);
          if (firebaseUser && wData.uid === firebaseUser.uid) {
            setCurrentUser((prev) => ({ ...prev, ...wData }));
          }
        });
        setActiveWorkers(workers);
      },
      (err) => {
        console.warn('Users collection listener error (handled):', err.message);
      }
    );

    return () => unsubWorkers();
  }, [firebaseUser]);

  // Listen to Direct Conversations where current user is a participant
  useEffect(() => {
    if (!firebaseUser) {
      setConversations([]);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participantUids', 'array-contains', firebaseUser.uid)
    );

    const unsubConvs = onSnapshot(
      q,
      (snapshot) => {
        const list: DirectConversation[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as DirectConversation);
        });
        list.sort((a, b) => (b.updatedAt || b.lastMessageTime || 0) - (a.updatedAt || a.lastMessageTime || 0));
        setConversations(list);
      },
      (err) => {
        console.warn('Conversations listener error:', err.message);
      }
    );

    return () => unsubConvs();
  }, [firebaseUser]);

  // Track Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          // Load user data from Firestore
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);

          let userDocData: WorkerUser;
          if (snap.exists()) {
            userDocData = snap.data() as WorkerUser;
          } else {
            // New user registration
            const defaultName = user.displayName || user.email?.split('@')[0] || 'Team Worker';
            const defaultUsername = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
            userDocData = {
              uid: user.uid,
              email: user.email || `${defaultUsername}@vault.io`,
              displayName: defaultName,
              username: defaultUsername,
              usernameLower: defaultUsername.toLowerCase(),
              role: 'Staff Specialist',
              department: 'Core Team',
              avatarColor: '#5A5A40',
              status: 'online',
              lastSeen: Date.now(),
              createdAt: Date.now(),
            };
            await setDoc(userRef, userDocData, { merge: true });
          }

          // Initialize or load WebCrypto RSA/AES Key Pair
          try {
            const keys = await getOrCreateUserKeyPair(user.uid);
            setKeyPair(keys);

            // Update public key and fingerprint in Firestore
            if (!userDocData.publicKey || userDocData.keyFingerprint !== keys.fingerprint) {
              userDocData.publicKey = keys.publicKeyJwk;
              userDocData.keyFingerprint = keys.fingerprint;
              await setDoc(userRef, {
                publicKey: keys.publicKeyJwk,
                keyFingerprint: keys.fingerprint,
                status: 'online',
                lastSeen: Date.now(),
              }, { merge: true });
            }
          } catch (err) {
            console.error('Failed to initialize cryptographic key pair:', err);
          }

          setCurrentUser(userDocData);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setCurrentUser(null);
        setKeyPair(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const signInWithDemoPreset = async (preset: DemoPreset) => {
    setLoading(true);
    try {
      // Try sign in with email and password
      try {
        await signInWithEmailAndPassword(auth, preset.email, PRESET_DEFAULT_PASSWORD);
      } catch (err: any) {
        // If user doesn't exist, create account
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          const cred = await createUserWithEmailAndPassword(auth, preset.email, PRESET_DEFAULT_PASSWORD);
          const keys = await getOrCreateUserKeyPair(cred.user.uid);
          const newDoc: WorkerUser = {
            uid: cred.user.uid,
            email: preset.email,
            displayName: preset.displayName,
            username: preset.username,
            usernameLower: preset.username.toLowerCase(),
            role: preset.role,
            department: preset.department,
            avatarColor: preset.avatarColor,
            publicKey: keys.publicKeyJwk,
            keyFingerprint: keys.fingerprint,
            status: 'online',
            lastSeen: Date.now(),
            createdAt: Date.now(),
          };
          await setDoc(doc(db, 'users', cred.user.uid), newDoc, { merge: true });
          setCurrentUser(newDoc);
          setKeyPair(keys);
        } else {
          throw err;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const saveUsernameAndProfile = async (
    username: string,
    role: string,
    department: string,
    avatarColor: string,
    photoURL?: string,
    bio?: string
  ) => {
    if (!currentUser || !auth.currentUser) return;
    
    // Double check availability to prevent race conditions
    const isAvail = await checkUsernameAvailable(username);
    if (!isAvail && currentUser.username?.toLowerCase() !== username.toLowerCase()) {
      throw new Error('Username is already taken by another user.');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const updated: WorkerUser = {
      ...currentUser,
      username,
      usernameLower: username.toLowerCase(),
      role,
      department,
      avatarColor,
      bio: bio !== undefined ? bio : (currentUser.bio || ''),
      ...(photoURL ? { photoURL } : {}),
      lastSeen: Date.now(),
    };
    await setDoc(userRef, updated, { merge: true });
    setCurrentUser(updated);
    await logSecurityAudit('KEY_PAIR_GENERATED', `Worker profile & username @${username} registered`, `@${username}`);
  };

  const checkUsernameAvailable = async (uname: string): Promise<boolean> => {
    if (!uname || uname.length < 3) return false;
    if (currentUser?.username?.toLowerCase() === uname.toLowerCase()) return true;
    try {
      const q = query(
        collection(db, 'users'),
        where('usernameLower', '==', uname.toLowerCase())
      );
      const snap = await getDocs(q);
      return snap.empty;
    } catch (e) {
      console.warn('Check username query error:', e);
      return true;
    }
  };

  const loginAsDemoWorker = async (preset: Partial<WorkerUser>) => {
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const userRef = doc(db, 'users', uid);
      const keys = await getOrCreateUserKeyPair(uid);
      setKeyPair(keys);

      const updatedUser: WorkerUser = {
        uid,
        email: preset.email || `${preset.displayName?.toLowerCase().replace(/\s+/g, '.')}@vault.io`,
        displayName: preset.displayName || 'Security Operator',
        username: preset.username || preset.displayName?.toLowerCase().replace(/\s+/g, '.') || 'operator',
        usernameLower: (preset.username || preset.displayName?.toLowerCase().replace(/\s+/g, '.') || 'operator').toLowerCase(),
        role: preset.role || 'Security Analyst',
        department: preset.department || 'Operations',
        avatarColor: preset.avatarColor || '#5A5A40',
        publicKey: keys.publicKeyJwk,
        keyFingerprint: keys.fingerprint,
        status: 'online',
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      await setDoc(userRef, updatedUser, { merge: true });
      setCurrentUser(updatedUser);
      await logSecurityAudit('KEY_PAIR_GENERATED', `Identity switched to ${updatedUser.displayName}`, `@${updatedUser.username}`);
    }
  };

  const updateUserStatus = async (status: 'online' | 'busy' | 'away' | 'offline') => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { status, lastSeen: Date.now() }, { merge: true });
    setCurrentUser({ ...currentUser, status, lastSeen: Date.now() });
  };

  const logSecurityAudit = async (
    eventType: SecurityAuditEntry['eventType'],
    details: string,
    target?: string
  ) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        eventType,
        actorUid: currentUser.uid,
        actorName: currentUser.displayName,
        actorUsername: currentUser.username || currentUser.email,
        details,
        channelOrTarget: target || 'Workspace',
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const keys = await getOrCreateUserKeyPair(cred.user.uid);
    const uname = name.toLowerCase().replace(/\s+/g, '.');
    const newWorker: WorkerUser = {
      uid: cred.user.uid,
      email,
      displayName: name,
      username: uname,
      usernameLower: uname.toLowerCase(),
      role: role || 'Cryptographic Engineer',
      department: 'Security & Operations',
      avatarColor: '#5A5A40',
      publicKey: keys.publicKeyJwk,
      keyFingerprint: keys.fingerprint,
      status: 'online',
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newWorker, { merge: true });
    setCurrentUser(newWorker);
    setKeyPair(keys);
  };

  const searchWorkers = (term: string): WorkerUser[] => {
    if (!term.trim()) return activeWorkers;
    const clean = term.toLowerCase().trim().replace(/^@/, '');
    return activeWorkers.filter((w) => 
      w.displayName?.toLowerCase().includes(clean) ||
      w.username?.toLowerCase().includes(clean) ||
      w.department?.toLowerCase().includes(clean) ||
      w.role?.toLowerCase().includes(clean) ||
      w.email?.toLowerCase().includes(clean)
    );
  };

  const blockUser = async (targetUid: string) => {
    if (!currentUser || !targetUid) return;
    const currentBlocked = currentUser.blockedUserUids || [];
    if (currentBlocked.includes(targetUid)) return;
    const updatedBlocked = [...currentBlocked, targetUid];
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { blockedUserUids: updatedBlocked }, { merge: true });
    setCurrentUser({ ...currentUser, blockedUserUids: updatedBlocked });
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Contact blocked (UID: ${targetUid})`, `@${currentUser.username || 'user'}`);
  };

  const unblockUser = async (targetUid: string) => {
    if (!currentUser || !targetUid) return;
    const currentBlocked = currentUser.blockedUserUids || [];
    const updatedBlocked = currentBlocked.filter((uid) => uid !== targetUid);
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { blockedUserUids: updatedBlocked }, { merge: true });
    setCurrentUser({ ...currentUser, blockedUserUids: updatedBlocked });
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Contact unblocked (UID: ${targetUid})`, `@${currentUser.username || 'user'}`);
  };

  const isUserBlocked = (targetUid: string): boolean => {
    if (!currentUser || !currentUser.blockedUserUids || !targetUid) return false;
    return currentUser.blockedUserUids.includes(targetUid);
  };

  const banUser = async (targetUid: string, reason = 'Account suspended by workspace owner.') => {
    if (!currentUser || !isOwner(currentUser)) {
      throw new Error('Unauthorized: Only the workspace Owner can issue bans.');
    }
    const userRef = doc(db, 'users', targetUid);
    await setDoc(userRef, {
      isBanned: true,
      bannedReason: reason,
      bannedAt: Date.now(),
      bannedBy: currentUser.username || currentUser.displayName || 'Owner',
    }, { merge: true });
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Worker UID ${targetUid} was banned by Owner. Reason: ${reason}`, `@${currentUser.username || 'owner'}`);
  };

  const unbanUser = async (targetUid: string) => {
    if (!currentUser || !isOwner(currentUser)) {
      throw new Error('Unauthorized: Only the workspace Owner can revoke bans.');
    }
    const userRef = doc(db, 'users', targetUid);
    await setDoc(userRef, {
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
      bannedBy: null,
    }, { merge: true });
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Worker UID ${targetUid} ban was revoked by Owner.`, `@${currentUser.username || 'owner'}`);
  };

  const toggleUserVerified = async (targetUid: string, isVerified: boolean) => {
    if (!currentUser || !isOwner(currentUser)) {
      throw new Error('Unauthorized: Only the workspace Owner can grant verified status.');
    }
    const userRef = doc(db, 'users', targetUid);
    await setDoc(userRef, { isVerified }, { merge: true });
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Worker UID ${targetUid} verified badge set to ${isVerified} by Owner.`, `@${currentUser.username || 'owner'}`);
  };

  const verifyAllUsers = async (verify = true) => {
    if (!currentUser || !isOwner(currentUser)) {
      throw new Error('Unauthorized: Only the workspace Owner can batch verify all members.');
    }
    const promises = activeWorkers.map((w) => 
      setDoc(doc(db, 'users', w.uid), { isVerified: verify }, { merge: true })
    );
    await Promise.all(promises);
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Owner updated verified status to ${verify} for all ${activeWorkers.length} workspace members.`, `@${currentUser.username || 'owner'}`);
  };

  const updateUserPin = async (pinHash: string) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { pinHash }, { merge: true });
    setCurrentUser({ ...currentUser, pinHash });
    await logSecurityAudit('FINGERPRINT_VERIFIED', `Security PIN updated`, `@${currentUser.username || 'user'}`);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setKeyPair(null);
  };

  const needsUsername = Boolean(currentUser && (!currentUser.username || currentUser.username.trim() === ''));

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        keyPair,
        loading,
        needsUsername,
        activeWorkers,
        conversations,
        searchWorkers,
        signInWithGoogle,
        signInWithDemoPreset,
        saveUsernameAndProfile,
        checkUsernameAvailable,
        loginAsDemoWorker,
        updateUserStatus,
        blockUser,
        unblockUser,
        isUserBlocked,
        banUser,
        unbanUser,
        toggleUserVerified,
        verifyAllUsers,
        logSecurityAudit,
        handleSignOut,
        signInWithEmail,
        signUpWithEmail,
        updateUserPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
