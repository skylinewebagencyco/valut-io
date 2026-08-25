import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { UsernameSetupModal } from './components/UsernameSetupModal';
import { NavigationRail } from './components/NavigationRail';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { FileVaultView } from './components/FileVaultView';
import { UserSearchModal } from './components/UserSearchModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { CreateChannelModal } from './components/CreateChannelModal';
import { PinScreenLockModal } from './components/PinScreenLockModal';
import { KeyManagementModal } from './components/KeyManagementModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { RolesManagementModal } from './components/RolesManagementModal';
import { Channel, WorkerUser } from './types';
import { Bell, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn("Audio play failed", err);
  }
};

function MainApp() {
  const { firebaseUser, currentUser, loading, needsUsername, handleSignOut, conversations, activeWorkers } = useAuth();
  
  // Notification State
  const [notification, setNotification] = useState<{ id: string; title: string; text: string; action: () => void } | null>(null);
  const prevConvsRef = useRef<Record<string, number>>({});
  const prevChannelsRef = useRef<Record<string, number>>({});
  
  const [currentView, setCurrentView] = useState<'chat' | 'files' | 'audit' | 'keys'>('chat');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>('strategy-sync');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [dmRecipient, setDmRecipient] = useState<WorkerUser | null>(null);

  // Security & Screen Lock State
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [isConfiguringPin, setIsConfiguringPin] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('valut_notification_settings');
    return saved ? JSON.parse(saved) : {
      allowNotifications: true,
      playSound: true,
      showPreviews: 'when_unlocked',
      bannerStyle: 'temporary',
      announce: 'off',
      grouping: 'automatic'
    };
  });
  const updateNotificationSettings = (settings) => {
    setNotificationSettings(settings);
    localStorage.setItem('valut_notification_settings', JSON.stringify(settings));
  };
  const lastActivityRef = useRef<number>(Date.now());

  // Additional Feature Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isKeyAuditOpen, setIsKeyAuditOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isKeyRotationOpen, setIsKeyRotationOpen] = useState(false);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Auto-lock on inactivity listener
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const interval = setInterval(() => {
      const minutesSetting = parseInt(localStorage.getItem('vault_screenlock_minutes') || '15', 10);
      if (minutesSetting > 0 && !isScreenLocked && currentUser) {
        const elapsed = (Date.now() - lastActivityRef.current) / 1000 / 60;
        if (elapsed >= minutesSetting) {
          setIsScreenLocked(true);
        }
      }
    }, 15000);

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [isScreenLocked, currentUser]);

  // Global Keyboard Shortcuts (Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Request native notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const requestPerm = () => {
        Notification.requestPermission();
        document.removeEventListener('click', requestPerm);
      };
      document.addEventListener('click', requestPerm);
      return () => document.removeEventListener('click', requestPerm);
    }
  }, []);

  // Monitor for incoming DM notifications
  useEffect(() => {
    if (!conversations || conversations.length === 0 || !currentUser) return;
    
    conversations.forEach((conv) => {
      const prevTime = prevConvsRef.current[conv.id];
      const newTime = conv.lastMessageTime || conv.updatedAt || 0;
      
      if (prevTime && newTime > prevTime && selectedConversationId !== conv.id && conv.lastMessageTime) {
        const otherUid = conv.participantUids?.find(uid => uid !== currentUser.uid);
        if (otherUid) {
          const senderName = conv.participantNames?.[otherUid] || 'A coworker';
          const title = `New Secure Message`;
          const text = `Encrypted message received from ${senderName}.`;
          const notifId = Date.now().toString();
          
          setNotification({
            id: notifId,
            title,
            text,
            action: () => {
              const worker = activeWorkers.find(w => w.uid === otherUid) || { uid: otherUid } as any;
              handleSelectConversation(conv.id, worker);
              setNotification(null);
            }
          });
          
          if (notificationSettings.playSound) playNotificationSound();
          
          if (notificationSettings.allowNotifications && 'Notification' in window && Notification.permission === 'granted') {
            const n = new Notification(title, { body: text, icon: '/vite.svg' });
            n.onclick = () => {
              window.focus();
              const worker = activeWorkers.find(w => w.uid === otherUid) || { uid: otherUid } as any;
              handleSelectConversation(conv.id, worker);
              n.close();
            };
          }
          
          setTimeout(() => {
            setNotification((prev) => prev?.id === notifId ? null : prev);
          }, 5000);
        }
      }
      
      prevConvsRef.current[conv.id] = newTime;
    });
  }, [conversations, selectedConversationId, currentUser, activeWorkers, notificationSettings]);

  // Monitor for channel activity
  useEffect(() => {
    if (!channels || channels.length === 0 || !currentUser) return;
    
    channels.forEach((ch) => {
      const prevTime = prevChannelsRef.current[ch.id];
      const newTime = ch.lastActivity || 0;
      
      if (prevTime && newTime > prevTime && (selectedChannelId !== ch.id || currentView !== 'chat')) {
        const title = `New Activity in #${ch.name}`;
        const text = `New message dispatched to channel.`;
        const notifId = Date.now().toString();
        
        setNotification({
          id: notifId,
          title,
          text,
          action: () => {
            handleSelectChannel(ch.id);
            setNotification(null);
          }
        });
        
        if (notificationSettings.playSound) playNotificationSound();
        
        if (notificationSettings.allowNotifications && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(title, { body: text, icon: '/vite.svg' });
          n.onclick = () => {
            window.focus();
            handleSelectChannel(ch.id);
            n.close();
          };
        }
        
        setTimeout(() => {
          setNotification((prev) => prev?.id === notifId ? null : prev);
        }, 5000);
      }
      
      prevChannelsRef.current[ch.id] = newTime;
    });
  }, [channels, selectedChannelId, currentView, currentUser, notificationSettings]);

  // Listen to Channels
  useEffect(() => {
    if (!firebaseUser) return;

    const unsub = onSnapshot(collection(db, 'channels'), (snapshot) => {
      const list: Channel[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Channel);
      });
      setChannels(list);
      if (!selectedChannelId && list.length > 0) {
        setSelectedChannelId(list[0].id);
      }
    });

    return () => unsub();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#F5F5F0] flex flex-col items-center justify-center text-[#5A5A40] space-y-4">
        <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white font-serif text-2xl animate-pulse shadow-sm">
          V
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="w-3.5 h-3.5 border-2 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" />
          <span>Verifying Cryptographic Session...</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthScreen />;
  }

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedConversationId(null);
    setDmRecipient(null);
    if (currentView !== 'chat') setCurrentView('chat');
    setIsMobileMenuOpen(false);
  };

  const handleSelectConversation = (convId: string, recipient: WorkerUser) => {
    setSelectedConversationId(convId);
    setSelectedChannelId(null);
    setDmRecipient(recipient);
    if (currentView !== 'chat') setCurrentView('chat');
    setIsMobileMenuOpen(false);
  };

  const handleViewChange = (view: string) => {
    if (view === 'audit' || view === 'keys') {
      setIsKeyAuditOpen(true);
    } else {
      setCurrentView(view as any);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F5F0] dark:bg-[#1A1A17] text-[#2D2D2A] dark:text-[#E8E8E1] font-sans antialiased transition-colors relative">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation Container */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex fixed md:static inset-y-0 left-0 z-50 h-full max-w-[90vw] shadow-2xl md:shadow-none`}>
        {/* 1. Left Navigation Rail */}
        <NavigationRail
          currentView={currentView}
          onSelectView={handleViewChange}
          onOpenWorkerModal={() => {
            setIsProfileModalOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onOpenKeyModal={() => {
            setIsKeyAuditOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onOpenKeyRotation={() => {
            setIsKeyRotationOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onOpenRoles={() => {
            setIsRolesModalOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onOpenSearch={() => {
            setIsGlobalSearchOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onLockScreen={() => setIsScreenLocked(true)}
          onOpenPinConfig={() => setIsConfiguringPin(true)}
          onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
        />

        {/* 2. Workplace Channels & Workers Sidebar */}
        <Sidebar
          channels={channels}
          selectedChannelId={selectedChannelId}
          selectedConversationId={selectedConversationId}
          selectedDmRecipient={dmRecipient}
          onSelectChannel={handleSelectChannel}
          onSelectConversation={handleSelectConversation}
          onOpenCreateChannel={() => {
            setIsCreateChannelOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onOpenUserSearch={() => {
            setIsUserSearchOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onOpenProfileModal={() => {
            setIsProfileModalOpen(true);
            setIsMobileMenuOpen(false);
          }}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* 3. Main Center Workspace (Chat or File Vault) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        {currentView === 'files' ? (
          <FileVaultView
            channels={channels}
            selectedChannelId={selectedChannelId}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
        ) : (
          <ChatView
            channel={selectedChannel}
            dmRecipient={dmRecipient}
            conversationId={selectedConversationId}
            onOpenUploadModal={() => setCurrentView('files')}
            onOpenUserSearch={() => setIsUserSearchOpen(true)}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
        )}
      </div>

      {/* Global In-App Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className="bg-[#2D2D2A] text-[#E8E8E1] p-4 rounded-2xl shadow-2xl border border-[#4D4D4A] flex items-start gap-4 cursor-pointer hover:bg-[#353530] transition-colors" onClick={notification.action}>
              <div className="bg-[#8DAA82]/20 p-2 rounded-xl text-[#8DAA82]">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-0.5">{notification.title}</h4>
                <p className="text-xs text-[#A1A19A] truncate">{notification.text}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setNotification(null); }}
                className="p-1.5 text-[#7A7A70] hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Lock PIN / Biometric Modal */}
      <PinScreenLockModal
        isLocked={isScreenLocked}
        onUnlock={() => setIsScreenLocked(false)}
        isConfiguringPin={isConfiguringPin}
        onCloseSettings={() => setIsConfiguringPin(false)}
      />

      {/* Forward Secrecy Key Rotation Timeline Modal */}
      <KeyManagementModal
        isOpen={isKeyRotationOpen}
        onClose={() => setIsKeyRotationOpen(false)}
      />

      {/* Roles & Permissions (RBAC) Modal */}
      <RolesManagementModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        workers={activeWorkers}
      />

      {/* Global Search Modal (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        channels={channels}
        workers={activeWorkers}
        onSelectChannel={handleSelectChannel}
        onSelectConversation={(worker) => {
          const uids = [currentUser?.uid || '', worker.uid].sort();
          const convId = `dm_${uids.join('_')}`;
          handleSelectConversation(convId, worker);
        }}
      />

      {/* Username Setup / Edit Modal */}
      <UsernameSetupModal
        isOpen={needsUsername || isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        isMandatory={needsUsername}
      />

      {/* Worker Search by @username Modal */}
      <UserSearchModal
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
        onSelectWorkerForDM={(worker) => {
          const uids = [currentUser?.uid || '', worker.uid].sort();
          const convId = `dm_${uids.join('_')}`;
          handleSelectConversation(convId, worker);
        }}
      />

      {/* Security Audit & RSA/AES Key Inspector Modal */}
      <SecurityAuditModal
        isOpen={isKeyAuditOpen}
        onClose={() => setIsKeyAuditOpen(false)}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onChannelCreated={(newChId) => handleSelectChannel(newChId)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
