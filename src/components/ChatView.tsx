import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Send, 
  Paperclip, 
  Image as ImageIcon,
  FileText, 
  Download, 
  Check, 
  Smile, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  FileLock2, 
  AtSign, 
  X, 
  Info,
  ShieldAlert,
  Clock,
  Mic,
  Square,
  Menu,
  Play,
  Pause,
  Volume2,
  Radio,
  Trash2,
  Maximize2,
  ZoomIn,
  Plus,
  Copy,
  Phone,
  Video,
  Camera,
  Flame,
  BarChart2,
  Code,
  Pin,
  Bookmark,
  Calendar,
  Share2,
  Key,
  Fingerprint,
  CheckCircle2
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  EncryptedMessage, 
  EncryptedFileMetadata, 
  Channel, 
  WorkerUser,
  PollData,
  CodeSnippetData,
  ChannelBookmark,
  ScheduledMessage
} from '../types';
import { isOwner, isUserVerified, optimizeImageForUpload } from '../utils';
import { VerifiedBadge } from './VerifiedBadge';
import { 
  encryptTextMessage, 
  decryptTextMessage, 
  encryptFile, 
  decryptFile,
  computeMessageChecksum
} from '../lib/crypto';
import { CreatePollModal } from './CreatePollModal';
import { CodeSnippetModal } from './CodeSnippetModal';
import { MessageChecksumModal } from './MessageChecksumModal';
import { PinnedMessagesDrawer } from './PinnedMessagesDrawer';
import { ScheduledMessagesModal } from './ScheduledMessagesModal';
import { PasswordExportModal } from './PasswordExportModal';

interface ChatViewProps {
  channel: Channel | null;
  dmRecipient: WorkerUser | null;
  conversationId: string | null;
  onOpenUploadModal: () => void;
  onOpenUserSearch: () => void;
  onMenuClick?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  channel,
  dmRecipient,
  conversationId,
  onOpenUploadModal,
  onOpenUserSearch,
  onMenuClick,
}) => {
  const { currentUser, logSecurityAudit, activeWorkers, blockUser, unblockUser, isUserBlocked, conversations } = useAuth();
  
  const activeConversation = conversationId ? conversations.find(c => c.id === conversationId) : null;
  const otherParticipantUid = conversationId && activeConversation && currentUser
    ? activeConversation.participantUids.find(uid => uid !== currentUser.uid)
    : null;
  const otherParticipantReadTime = otherParticipantUid && activeConversation?.participantReadTimes
    ? activeConversation.participantReadTimes[otherParticipantUid]
    : 0;

  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Ephemeral message controls
  const [ephemeralTimer, setEphemeralTimer] = useState<number>(0); // 0 = off, 30, 300, 3600
  const [isBurnOnRead, setIsBurnOnRead] = useState(false);

  // Voice memo recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  
  // Audio & media playback / inspect states
  const [decryptedMediaUrls, setDecryptedAudioUrls] = useState<Record<string, string>>({});
  const [inspectMessage, setInspectMessage] = useState<EncryptedMessage | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Feature Modals
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isCodeSnippetOpen, setIsCodeSnippetOpen] = useState(false);
  const [checksumInspectMsg, setChecksumInspectMsg] = useState<EncryptedMessage | null>(null);
  const [isPinsDrawerOpen, setIsPinsDrawerOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Bookmarks & Scheduled lists
  const [channelBookmarks, setChannelBookmarks] = useState<ChannelBookmark[]>([]);
  const [scheduledQueue, setScheduledQueue] = useState<ScheduledMessage[]>([]);

  // Message Reactions & Long-press state
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState<string | null>(null);
  const [showFullEmojiList, setShowFullEmojiList] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const longPressTimeoutRef = useRef<any>(null);
  const touchStartCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '🎉', '🚀', '👏', '👀', '💯'];
  const EXTENDED_EMOJIS = [
    '✨', '🙌', '🤝', '💡', '✅', '⚡', '😎', '🤔', '☕', '🔒',
    '🦾', '🎯', '🥳', '🫡', '💪', '🤩', '💐', '🏆', '📌', '🛡️',
    '⭐️', '💥', '🎈', '🍕', '🍻', '💼', '📊', '📈', '🔑', '🌈'
  ];

  // Close popovers on outside clicks or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.reaction-popover-container') && !target.closest('.reaction-trigger-btn')) {
        setReactionMenuMsgId(null);
        setShowFullEmojiList(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReactionMenuMsgId(null);
        setShowFullEmojiList(false);
        setLightboxImageUrl(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Global paste handler for images from clipboard (e.g. screenshots)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessAndSetFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Long-press Touch Handlers
  const handleTouchStart = (msgId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartCoordsRef.current = { x: touch.clientX, y: touch.clientY };
    
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    
    longPressTimeoutRef.current = setTimeout(() => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(35); } catch {}
      }
      setReactionMenuMsgId(msgId);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartCoordsRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartCoordsRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Toggle Reaction in Firestore & Local State
  const handleToggleReaction = async (msg: EncryptedMessage, emoji: string) => {
    if (!currentUser) return;
    setReactionMenuMsgId(null);
    setShowFullEmojiList(false);

    const existingReactions: Record<string, string[]> = msg.reactions ? { ...msg.reactions } : {};
    const currentUids: string[] = existingReactions[emoji] ? [...existingReactions[emoji]] : [];
    let updatedUids: string[];

    if (currentUids.includes(currentUser.uid)) {
      updatedUids = currentUids.filter((uid) => uid !== currentUser.uid);
    } else {
      updatedUids = [...currentUids, currentUser.uid];
    }

    const updatedReactions: Record<string, string[]> = { ...existingReactions };
    if (updatedUids.length > 0) {
      updatedReactions[emoji] = updatedUids;
    } else {
      delete updatedReactions[emoji];
    }

    // Optimistic local state update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: updatedReactions } : m))
    );

    try {
      const msgRef = channel
        ? doc(db, 'channels', channel.id, 'messages', msg.id)
        : doc(db, 'conversations', currentTargetId, 'messages', msg.id);

      await updateDoc(msgRef, {
        reactions: updatedReactions,
      });
    } catch (err) {
      console.error('Failed to update message reaction in Firestore:', err);
    }
  };

  // Pin / Unpin message
  const handleTogglePin = async (msg: EncryptedMessage) => {
    if (!currentUser) return;
    const isCurrentlyPinned = !!msg.isPinned;
    const msgRef = channel
      ? doc(db, 'channels', channel.id, 'messages', msg.id)
      : doc(db, 'conversations', currentTargetId, 'messages', msg.id);

    try {
      await updateDoc(msgRef, {
        isPinned: !isCurrentlyPinned,
        pinnedAt: !isCurrentlyPinned ? Date.now() : null,
        pinnedByUid: !isCurrentlyPinned ? currentUser.uid : null,
        pinnedByName: !isCurrentlyPinned ? currentUser.displayName : null,
      });

      await logSecurityAudit(
        !isCurrentlyPinned ? 'MESSAGE_PINNED' : 'MESSAGE_UNPINNED',
        `${!isCurrentlyPinned ? 'Pinned' : 'Unpinned'} message in ${displayName}`,
        displayName
      );
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Vote on Poll
  const handleVotePoll = async (msg: EncryptedMessage, optionId: string) => {
    if (!currentUser || !msg.poll) return;
    const poll = msg.poll;
    if (poll.isClosed) return;

    const updatedOptions = poll.options.map((opt) => {
      const isSelected = opt.id === optionId;
      let voters = [...(opt.voterUids || opt.voters || [])];

      if (poll.allowMultiple) {
        if (isSelected) {
          if (voters.includes(currentUser.uid)) {
            voters = voters.filter((v) => v !== currentUser.uid);
          } else {
            voters.push(currentUser.uid);
          }
        }
      } else {
        // Single choice: remove user from all options, add to selected if was not selected
        if (isSelected) {
          if (voters.includes(currentUser.uid)) {
            voters = voters.filter((v) => v !== currentUser.uid);
          } else {
            voters.push(currentUser.uid);
          }
        } else {
          voters = voters.filter((v) => v !== currentUser.uid);
        }
      }

      return {
        ...opt,
        voterUids: voters,
        voters,
        votesCount: voters.length,
      };
    });

    const totalVotes = updatedOptions.reduce((sum, opt) => sum + (opt.votesCount || 0), 0);

    const msgRef = channel
      ? doc(db, 'channels', channel.id, 'messages', msg.id)
      : doc(db, 'conversations', currentTargetId, 'messages', msg.id);

    try {
      await updateDoc(msgRef, {
        poll: {
          ...poll,
          options: updatedOptions,
          totalVotes,
        },
      });
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  // Helper to handle and optimize files (including pictures)
  const handleProcessAndSetFile = async (rawFile: File) => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    try {
      if (rawFile.type.startsWith('image/')) {
        const optimized = await optimizeImageForUpload(rawFile);
        const preview = URL.createObjectURL(optimized);
        setImagePreviewUrl(preview);
        setSelectedFileForUpload(optimized);
      } else {
        if (rawFile.size > 800 * 1024) {
          alert('For maximum performance over zero-knowledge E2EE Firestore channels, non-image files are optimized up to 800KB.');
        }
        setSelectedFileForUpload(rawFile);
      }
    } catch (e) {
      console.warn('File processing error:', e);
      setSelectedFileForUpload(rawFile);
    }
  };

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const ext = actualMime.includes('mp4') ? 'mp4' : actualMime.includes('ogg') ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        const file = new File([audioBlob], `Voice_Memo_${Date.now()}.${ext}`, { type: actualMime });
        
        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
        }
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);
        setSelectedFileForUpload(file);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const msg = isDenied
        ? 'Microphone permission was denied. Please allow microphone access in your browser bar.'
        : (err?.message || 'Unable to access microphone device.');
      setMicError(msg);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const currentTargetId = channel ? channel.id : (conversationId || 'default_room');
  const displayName = channel ? `# ${channel.name}` : `@${dmRecipient?.username || dmRecipient?.displayName || 'Direct Message'}`;
  const subtitle = channel
    ? (channel.description || 'Company Channel • End-to-End Encrypted')
    : `${dmRecipient?.role || 'Team Member'} • ${dmRecipient?.department || 'Operations'}`;

  // Real-Time Listener for Messages & Ephemeral Purge
  useEffect(() => {
    if (!currentTargetId) return;

    const messagesCol = channel
      ? collection(db, 'channels', channel.id, 'messages')
      : collection(db, 'conversations', currentTargetId, 'messages');

    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const loaded: EncryptedMessage[] = [];
      const now = Date.now();

      for (const docSnap of snapshot.docs) {
        const raw = { id: docSnap.id, ...docSnap.data() } as EncryptedMessage;

        // Auto purge expired ephemeral messages
        if (raw.expiresAt && raw.expiresAt <= now) {
          deleteDoc(docSnap.ref).catch(() => {});
          continue;
        }

        // Decrypt text in real-time
        if (raw.ciphertext && raw.iv) {
          try {
            raw.decryptedText = await decryptTextMessage(raw.ciphertext, raw.iv, currentTargetId);
          } catch (e) {
            raw.decryptionError = true;
            raw.decryptedText = '[Encrypted Payload - Decryption Error]';
          }
        }
        loaded.push(raw);

        // Auto-decrypt photos
        if (raw.file && raw.file.mimeType && raw.file.mimeType.startsWith('image/')) {
          const fId = raw.file.id;
          if (!decryptedMediaUrls[fId]) {
            decryptFile(
              raw.file.encryptedData,
              raw.file.iv,
              currentTargetId,
              raw.file.sha256Hash,
              raw.file.mimeType
            ).then(({ objectUrl }) => {
              setDecryptedAudioUrls((prev) => ({ ...prev, [fId]: objectUrl }));
            }).catch(() => {});
          }
        }
      }

      setMessages(loaded);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Update read receipts
      if (conversationId && currentUser && loaded.length > 0) {
        const lastMsg = loaded[loaded.length - 1];
        if (lastMsg.senderUid !== currentUser.uid) {
          const convRef = doc(db, 'conversations', conversationId);
          updateDoc(convRef, {
            [`participantReadTimes.${currentUser.uid}`]: Date.now()
          }).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
  }, [currentTargetId, channel, conversationId, currentUser]);

  // Scheduled message dispatcher ticker
  useEffect(() => {
    const timer = setInterval(async () => {
      const now = Date.now();
      const readyToDispatch = scheduledQueue.filter((item) => item.scheduledFor <= now && item.status === 'pending');

      for (const item of readyToDispatch) {
        // Send message
        try {
          const encrypted = await encryptTextMessage(item.text, item.targetId);
          const checksum = await computeMessageChecksum(encrypted.ciphertext, encrypted.iv, currentUser?.publicKey || 'RSA_FP');
          const messagesCol = item.targetType === 'channel'
            ? collection(db, 'channels', item.targetId, 'messages')
            : collection(db, 'conversations', item.targetId, 'messages');

          await addDoc(messagesCol, {
            channelId: item.targetType === 'channel' ? item.targetId : null,
            conversationId: item.targetType === 'dm' ? item.targetId : null,
            senderUid: currentUser?.uid || item.senderUid,
            senderName: currentUser?.displayName || item.senderName,
            senderUsername: currentUser?.username || 'user',
            senderRole: currentUser?.role || 'Team Member',
            senderAvatar: currentUser?.avatarColor || '#5A5A40',
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            sha256Checksum: checksum,
            isEncrypted: true,
            isBurnOnRead: item.burnOnRead,
            expiresAt: item.ephemeralSeconds ? Date.now() + item.ephemeralSeconds * 1000 : null,
            reactions: {},
            createdAt: Date.now(),
          });

          // Mark dispatched in local queue
          setScheduledQueue((prev) => prev.filter((p) => p.id !== item.id));
        } catch (e) {
          console.error('Scheduled dispatch error:', e);
        }
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [scheduledQueue, currentUser]);

  // Handle Send Standard Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFileForUpload) || sending || !currentUser) return;

    setSending(true);
    try {
      let fileMeta: EncryptedFileMetadata | null = null;

      if (selectedFileForUpload) {
        setUploadProgress(10);
        const encFile = await encryptFile(
          selectedFileForUpload,
          currentTargetId,
          (p) => setUploadProgress(p)
        );

        fileMeta = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: encFile.name,
          size: encFile.size,
          mimeType: encFile.mimeType,
          sha256Hash: encFile.sha256Hash,
          encryptedData: encFile.encryptedData,
          iv: encFile.iv,
          uploadedBy: currentUser.uid,
          uploadedByName: currentUser.displayName,
          uploadedByUsername: currentUser.username || currentUser.displayName,
          timestamp: Date.now(),
        };

        await logSecurityAudit(
          'FILE_ENCRYPTED_AES256',
          `Encrypted file ${encFile.name} (${(encFile.size / 1024).toFixed(1)} KB) with SHA-256 integrity hash`,
          displayName
        );
      }

      // Encrypt message text
      const messageText = inputText.trim();
      let ciphertext = '';
      let iv = '';
      let checksum = '';

      if (messageText) {
        const encrypted = await encryptTextMessage(messageText, currentTargetId);
        ciphertext = encrypted.ciphertext;
        iv = encrypted.iv;
        checksum = await computeMessageChecksum(ciphertext, iv, currentUser.publicKey || currentUser.uid);
      }

      const messagesCol = channel
        ? collection(db, 'channels', channel.id, 'messages')
        : collection(db, 'conversations', currentTargetId, 'messages');

      const expiresAt = ephemeralTimer > 0 ? Date.now() + ephemeralTimer * 1000 : null;

      await addDoc(messagesCol, {
        channelId: channel ? channel.id : null,
        conversationId: !channel ? currentTargetId : null,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderUsername: currentUser.username || currentUser.displayName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarColor,
        senderPhotoURL: currentUser.photoURL || null,
        ciphertext,
        iv,
        sha256Checksum: checksum,
        isEncrypted: true,
        file: fileMeta,
        reactions: {},
        isBurnOnRead,
        expiresAt,
        createdAt: Date.now(),
      });

      if (channel) {
        await updateDoc(doc(db, 'channels', channel.id), { lastActivity: Date.now() }).catch(console.error);
      }

      if (!channel && dmRecipient) {
        const convRef = doc(db, 'conversations', currentTargetId);
        await setDoc(
          convRef,
          {
            id: currentTargetId,
            participantUids: [currentUser.uid, dmRecipient.uid],
            participantNames: {
              [currentUser.uid]: currentUser.displayName,
              [dmRecipient.uid]: dmRecipient.displayName,
            },
            participantUsernames: {
              [currentUser.uid]: currentUser.username || currentUser.displayName,
              [dmRecipient.uid]: dmRecipient.username || dmRecipient.displayName,
            },
            participantAvatars: {
              [currentUser.uid]: currentUser.avatarColor,
              [dmRecipient.uid]: dmRecipient.avatarColor,
            },
            updatedAt: Date.now(),
            lastMessageTime: Date.now(),
            lastMessageCiphertext: ciphertext || (fileMeta ? `[Attachment: ${fileMeta.name}]` : ''),
          },
          { merge: true }
        );
      }

      setInputText('');
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      setSelectedFileForUpload(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (photoInputRef.current) photoInputRef.current.value = '';

      await logSecurityAudit(
        'MESSAGE_SENT_E2EE',
        `Dispatched AES-256 encrypted payload to ${displayName}`,
        displayName
      );
    } catch (err) {
      console.error('Error sending encrypted message:', err);
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  };

  // Create Poll Message
  const handleCreatePoll = async (pollData: Omit<PollData, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'totalVotes'>) => {
    if (!currentUser) return;
    try {
      const poll: PollData = {
        ...pollData,
        id: `poll_${Date.now()}`,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
        createdAt: Date.now(),
        totalVotes: 0,
      };

      const encrypted = await encryptTextMessage(`📊 Poll: ${poll.question}`, currentTargetId);
      const checksum = await computeMessageChecksum(encrypted.ciphertext, encrypted.iv, currentUser.publicKey || currentUser.uid);

      const messagesCol = channel
        ? collection(db, 'channels', channel.id, 'messages')
        : collection(db, 'conversations', currentTargetId, 'messages');

      await addDoc(messagesCol, {
        channelId: channel ? channel.id : null,
        conversationId: !channel ? currentTargetId : null,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderUsername: currentUser.username || currentUser.displayName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarColor,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        sha256Checksum: checksum,
        isEncrypted: true,
        type: 'poll',
        poll,
        reactions: {},
        createdAt: Date.now(),
      });

      await logSecurityAudit('POLL_CREATED', `Created poll: "${poll.question}" in ${displayName}`);
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  // Insert Code Snippet Message
  const handleInsertCodeSnippet = async (snippet: Omit<CodeSnippetData, 'id' | 'authorUid' | 'authorName'>) => {
    if (!currentUser) return;
    try {
      const codeSnippet: CodeSnippetData = {
        ...snippet,
        id: `code_${Date.now()}`,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName,
      };

      const encrypted = await encryptTextMessage(`[Code Snippet: ${codeSnippet.title || codeSnippet.language}]`, currentTargetId);
      const checksum = await computeMessageChecksum(encrypted.ciphertext, encrypted.iv, currentUser.publicKey || currentUser.uid);

      const messagesCol = channel
        ? collection(db, 'channels', channel.id, 'messages')
        : collection(db, 'conversations', currentTargetId, 'messages');

      await addDoc(messagesCol, {
        channelId: channel ? channel.id : null,
        conversationId: !channel ? currentTargetId : null,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderUsername: currentUser.username || currentUser.displayName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarColor,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        sha256Checksum: checksum,
        isEncrypted: true,
        type: 'code',
        codeSnippet,
        reactions: {},
        createdAt: Date.now(),
      });

      await logSecurityAudit('CODE_SNIPPET_SHARED', `Shared ${codeSnippet.language} code snippet in ${displayName}`);
    } catch (err) {
      console.error('Failed to share code snippet:', err);
    }
  };

  // Schedule Message
  const handleScheduleMessage = (scheduled: Omit<ScheduledMessage, 'id' | 'createdAt' | 'status'>) => {
    const newItem: ScheduledMessage = {
      ...scheduled,
      id: `sched_${Date.now()}`,
      status: 'pending',
      createdAt: Date.now(),
    };
    setScheduledQueue((prev) => [...prev, newItem]);
  };

  // Decrypt and Download File
  const handleDownloadAndDecryptFile = async (fileMeta: EncryptedFileMetadata) => {
    try {
      setDownloadingFileId(fileMeta.id);
      const { blob, objectUrl, isHashValid } = await decryptFile(
        fileMeta.encryptedData,
        fileMeta.iv,
        currentTargetId,
        fileMeta.sha256Hash,
        fileMeta.mimeType
      );

      if (fileMeta.mimeType.startsWith('audio/') || fileMeta.mimeType.startsWith('image/') || fileMeta.mimeType.startsWith('video/')) {
        setDecryptedAudioUrls(prev => ({ ...prev, [fileMeta.id]: objectUrl }));
      } else {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileMeta.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }

      await logSecurityAudit(
        'FILE_DECRYPTED_VERIFIED',
        `Decrypted file ${fileMeta.name}. SHA-256 integrity: ${isHashValid ? 'VERIFIED' : 'MISMATCH'}`,
        displayName
      );
    } catch (err) {
      console.error('File decryption failed:', err);
      alert('File decryption failed or cryptographic hash verification error.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <main id="chat-workspace-main" className="flex-1 flex flex-col h-full bg-[#F5F5F0] dark:bg-[#1A1A17] overflow-hidden transition-colors">
      {/* Header */}
      <header className="h-16 sm:h-20 bg-white/70 dark:bg-[#20201C]/80 backdrop-blur-md flex items-center justify-between px-3.5 sm:px-8 border-b border-[#D9D9D0] dark:border-[#353530] flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Open Navigation Menu"
              className="md:hidden w-9 h-9 flex items-center justify-center text-[#5A5A40] dark:text-[#E8E8E1] bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] hover:bg-[#E8E8E1] dark:hover:bg-[#2A2A25] rounded-xl transition-colors flex-shrink-0 shadow-2xs cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2D2D2A] dark:text-[#E8E8E1] truncate max-w-[170px] sm:max-w-none">
                {displayName}
              </h2>
              {dmRecipient && isOwner(dmRecipient) ? (
                <span className="px-1.5 py-0.5 bg-[#2D2D2A] text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                  Owner
                </span>
              ) : dmRecipient && isUserVerified(dmRecipient) ? (
                <VerifiedBadge size="sm" tooltip="Verified Account" />
              ) : null}
              {dmRecipient && dmRecipient.isBanned && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                  Banned
                </span>
              )}
              {dmRecipient && isUserBlocked(dmRecipient.uid) && (
                <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                  Blocked
                </span>
              )}
              {dmRecipient && (
                <span className="text-xs font-mono text-[#5A5A40] dark:text-[#D1C7B7] bg-[#E8E8E1] dark:bg-[#2A2A25] px-2 py-0.5 rounded-md font-semibold hidden sm:inline-block">
                  @{dmRecipient.username || 'user'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#7A7A70] dark:text-[#A1A19A] mt-0.5">
              <span className="flex items-center gap-1 text-[#5A5A40] dark:text-[#8DAA82] font-semibold">
                <Lock className="w-3 h-3" />
                <span>AES-256 E2EE</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="truncate max-w-[200px] sm:max-w-sm hidden sm:inline">{subtitle}</span>
            </div>
          </div>
        </div>

        {/* Right Header Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Pinned Messages & Bookmarks Drawer Toggle */}
          <button
            onClick={() => setIsPinsDrawerOpen(true)}
            title={`View Pinned Messages (${pinnedMessages.length}) & Bookmarks`}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs relative"
          >
            <Pin className="w-4 h-4" />
            {pinnedMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#5A5A40] text-white text-[9px] font-bold flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Password-Protected Archive Export */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            title="Download Password-Protected Encrypted Transcript"
            className="w-8 h-8 sm:w-9 sm:h-9 bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Block button for DM */}
          {dmRecipient && (
            <button
              onClick={async () => {
                if (isUserBlocked(dmRecipient.uid)) {
                  await unblockUser(dmRecipient.uid);
                } else {
                  if (confirm(`Are you sure you want to block @${dmRecipient.username || dmRecipient.displayName}?`)) {
                    await blockUser(dmRecipient.uid);
                  }
                }
              }}
              title={isUserBlocked(dmRecipient.uid) ? "Unblock contact" : "Block contact"}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isUserBlocked(dmRecipient.uid)
                  ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300'
                  : 'bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] text-[#7A7A70] dark:text-[#A1A19A] hover:text-red-600 hover:border-red-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isUserBlocked(dmRecipient.uid) ? 'Blocked' : 'Block'}</span>
            </button>
          )}

          <button
            id="share-secure-photo-header-btn"
            onClick={() => photoInputRef.current?.click()}
            title="Send Encrypted Photo"
            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-2 bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] rounded-full text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 text-[#5A5A40] dark:text-[#D1C7B7]" />
            <span className="hidden sm:inline">Photo</span>
          </button>

          <button
            id="share-secure-file-header-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Share Secure File"
            className="w-8 h-8 sm:w-auto sm:px-3.5 sm:py-2 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-full text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">File</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll View */}
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleProcessAndSetFile(e.dataTransfer.files[0]);
          }
        }}
        className="flex-1 p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-y-auto relative"
      >
        {isDraggingFile && (
          <div className="absolute inset-4 z-40 bg-[#5A5A40]/90 text-white rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/70 shadow-2xl pointer-events-none">
            <ImageIcon className="w-12 h-12 text-[#D1C7B7] animate-bounce" />
            <p className="font-serif text-lg font-bold">Drop photo or file to encrypt & send</p>
            <p className="text-xs text-white/80">Secured client-side with AES-256 GCM</p>
          </div>
        )}

        {/* Welcome Channel Banner */}
        <div className="bg-white/70 dark:bg-[#20201C]/70 border border-[#E8E8E1] dark:border-[#353530] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs max-w-xl mx-auto text-center space-y-2">
          <div className="w-10 h-10 bg-[#5A5A40] text-white rounded-2xl flex items-center justify-center mx-auto shadow-xs font-serif text-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-sm sm:text-base font-bold text-[#5A5A40] dark:text-[#D1C7B7]">
            Encrypted Workplace Communication
          </h3>
          <p className="text-[11px] sm:text-xs text-[#7A7A70] dark:text-[#A1A19A] leading-relaxed">
            All text, code snippets, polls, and attachments in {displayName} are encrypted client-side with
            AES-256-GCM. Firebase relays only cryptographically sealed ciphertexts.
          </p>
        </div>

        {/* Message Items */}
        {messages.length === 0 ? (
          <div className="text-center py-12 text-[#A1A19A] text-xs">
            No messages yet. Send an encrypted message, poll, code snippet, or share a secure file below.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === currentUser?.uid;
            const senderWorker = activeWorkers.find(
              (w) => w.uid === msg.senderUid || (w.username && w.username === msg.senderUsername)
            );
            const isSenderOwner = isOwner(senderWorker || { username: msg.senderUsername });
            const isVerified = isUserVerified(senderWorker || { username: msg.senderUsername });

            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs relative"
                  style={!msg.senderPhotoURL ? { backgroundColor: msg.senderAvatar || '#5A5A40' } : undefined}
                  title={`${msg.senderName} (@${msg.senderUsername || 'worker'})`}
                >
                  {msg.senderPhotoURL ? (
                    <img src={msg.senderPhotoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    msg.senderName?.charAt(0) || 'W'
                  )}
                  {isVerified && (
                    <div className="absolute -top-1 -right-1 ring-1 ring-white rounded-full bg-white scale-75">
                      <VerifiedBadge size="xs" tooltip={isSenderOwner ? "Verified Owner" : "Verified Account"} />
                    </div>
                  )}
                </div>

                {/* Content Container */}
                <div 
                  className={`space-y-1.5 max-w-lg relative ${isMe ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}
                  onTouchStart={(e) => handleTouchStart(msg.id, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Message Action Toolbar */}
                  <div
                    className={`absolute -top-3 ${
                      isMe ? 'left-0' : 'right-0'
                    } opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-0.5 bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] shadow-sm rounded-full px-1.5 py-0.5`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReactionMenuMsgId(reactionMenuMsgId === msg.id ? null : msg.id);
                        setShowFullEmojiList(false);
                      }}
                      title="Add Reaction"
                      className="reaction-trigger-btn p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white hover:bg-[#F0EFEA] dark:hover:bg-[#353530] rounded-full transition-colors cursor-pointer"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePin(msg)}
                      title={msg.isPinned ? "Unpin message" : "Pin to Channel"}
                      className={`p-1 rounded-full transition-colors cursor-pointer ${
                        msg.isPinned
                          ? 'text-[#8DAA82] bg-[#8DAA82]/20'
                          : 'text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white hover:bg-[#F0EFEA] dark:hover:bg-[#353530]'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setChecksumInspectMsg(msg)}
                      title="Inspect SHA-256 Integrity Checksum"
                      className="p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white hover:bg-[#F0EFEA] dark:hover:bg-[#353530] rounded-full transition-colors cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-[#8DAA82]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectMessage(msg)}
                      title="Inspect Cryptographic Payload"
                      className="p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white hover:bg-[#F0EFEA] dark:hover:bg-[#353530] rounded-full transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {msg.decryptedText && !msg.decryptionError && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.decryptedText || '');
                          setCopiedMsgId(msg.id);
                          setTimeout(() => setCopiedMsgId(null), 1500);
                        }}
                        title="Copy text"
                        className="p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white hover:bg-[#F0EFEA] dark:hover:bg-[#353530] rounded-full transition-colors cursor-pointer"
                      >
                        {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Reaction Popover Bar */}
                  {reactionMenuMsgId === msg.id && (
                    <div
                      className={`reaction-popover-container absolute z-30 -top-11 ${
                        isMe ? 'right-0' : 'left-0'
                      } bg-white dark:bg-[#1E1E1A] border border-[#D9D9D0] dark:border-[#353530] shadow-xl rounded-2xl p-1.5 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 select-none`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        {QUICK_EMOJIS.map((emoji) => {
                          const hasReacted = currentUser && msg.reactions?.[emoji]?.includes(currentUser.uid);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg, emoji)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-base sm:text-lg rounded-xl transition-all cursor-pointer hover:scale-125 active:scale-95 ${
                                hasReacted ? 'bg-[#5A5A40]/25 scale-110' : 'hover:bg-[#F0EFEA] dark:hover:bg-[#30302B]'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setShowFullEmojiList(!showFullEmojiList)}
                          title="More emojis"
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {showFullEmojiList && (
                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 p-2 pt-1 border-t border-[#E8E8E1] dark:border-[#30302B] max-h-40 overflow-y-auto">
                          {EXTENDED_EMOJIS.map((emoji) => {
                            const hasReacted = currentUser && msg.reactions?.[emoji]?.includes(currentUser.uid);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg, emoji)}
                                className={`w-7 h-7 flex items-center justify-center text-base rounded-lg transition-transform hover:scale-125 ${
                                  hasReacted ? 'bg-[#5A5A40]/30' : 'hover:bg-[#F0EFEA] dark:hover:bg-[#30302B]'
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Header info above bubble */}
                  <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">
                      {msg.senderName}
                    </span>
                    <span className="text-[#A1A19A] font-mono text-[10px]">
                      {formatTime(msg.createdAt)}
                    </span>
                    {msg.isPinned && (
                      <span className="flex items-center gap-0.5 text-[#5A5A40] dark:text-[#8DAA82] font-semibold text-[10px]">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                    {msg.isBurnOnRead && (
                      <span className="flex items-center gap-0.5 text-rose-500 font-semibold text-[10px]">
                        <Flame className="w-2.5 h-2.5 animate-pulse" /> Burn on read
                      </span>
                    )}
                  </div>

                  {/* Message Bubble: Normal Text, Poll, Code Snippet, or File */}
                  {msg.type === 'poll' && msg.poll ? (
                    /* Interactive Poll Card */
                    <div className="w-72 sm:w-80 p-4 rounded-2xl bg-white dark:bg-[#20201C] border border-[#D9D9D0] dark:border-[#353530] shadow-sm space-y-3 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                            <BarChart2 className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs text-[#2D2D2A] dark:text-[#E8E8E1]">
                            {msg.poll.question}
                          </span>
                        </div>
                        {msg.poll.isClosed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold uppercase">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {msg.poll.options.map((opt) => {
                          const hasVoted = currentUser && opt.voters.includes(currentUser.uid);
                          const total = msg.poll!.totalVotes || 0;
                          const pct = total > 0 ? Math.round((opt.votesCount / total) * 100) : 0;

                          return (
                            <button
                              key={opt.id}
                              disabled={msg.poll!.isClosed}
                              onClick={() => handleVotePoll(msg, opt.id)}
                              className={`w-full p-2.5 rounded-xl border text-left relative overflow-hidden transition-all cursor-pointer ${
                                hasVoted
                                  ? 'border-[#5A5A40] dark:border-[#8DAA82] bg-[#5A5A40]/10 dark:bg-[#8DAA82]/10'
                                  : 'border-[#D9D9D0] dark:border-[#353530] bg-[#F7F7F4] dark:bg-[#252521] hover:border-[#A1A19A]'
                              }`}
                            >
                              {/* Percentage Progress Fill */}
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-[#5A5A40]/15 dark:bg-[#8DAA82]/20 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />

                              <div className="relative z-10 flex items-center justify-between text-xs">
                                <span className="font-medium text-[#2D2D2A] dark:text-[#E8E8E1] flex items-center gap-1.5">
                                  {hasVoted && <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40] dark:text-[#8DAA82]" />}
                                  {opt.text}
                                </span>
                                <span className="text-[11px] font-bold text-[#7A7A70] dark:text-[#A1A19A]">
                                  {pct}% ({opt.votesCount})
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#7A7A70] dark:text-[#8A8A80] pt-1">
                        <span>{msg.poll.totalVotes} total votes</span>
                        <span>{msg.poll.isAnonymous ? '🔒 Anonymous' : '👥 Public tally'}</span>
                      </div>
                    </div>
                  ) : msg.type === 'code' && msg.codeSnippet ? (
                    /* Code Snippet Card */
                    <div className="w-80 sm:w-96 rounded-2xl overflow-hidden bg-[#1E1E1B] border border-[#353530] shadow-md text-left">
                      {/* Code Header */}
                      <div className="px-3.5 py-2 bg-[#252521] border-b border-[#353530] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code className="w-3.5 h-3.5 text-[#8DAA82]" />
                          <span className="font-mono text-xs font-bold text-[#E8E8E1]">
                            {msg.codeSnippet.title || 'Code Snippet'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#8DAA82]/20 text-[#8DAA82]">
                            {msg.codeSnippet.language}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.codeSnippet!.code);
                            setCopiedCodeId(msg.id);
                            setTimeout(() => setCopiedCodeId(null), 1500);
                          }}
                          className="px-2 py-1 rounded bg-[#1A1A17] hover:bg-[#353530] text-[10px] text-[#E8E8E1] flex items-center gap-1 font-medium cursor-pointer transition-colors"
                        >
                          {copiedCodeId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Code Lines with line numbers */}
                      <div className="p-3 font-mono text-xs overflow-x-auto max-h-72 text-[#E8E8E1] bg-[#181815] leading-relaxed">
                        <pre className="m-0">
                          {msg.codeSnippet.code.split('\n').map((line, idx) => (
                            <div key={idx} className="table-row">
                              <span className="table-cell pr-3 text-[#5A5A40] text-right select-none opacity-60">
                                {idx + 1}
                              </span>
                              <span className="table-cell">{line || ' '}</span>
                            </div>
                          ))}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    /* Standard Message / File / Photo Bubble */
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xs transition-all ${
                        isMe
                          ? 'bg-[#5A5A40] text-white rounded-br-xs'
                          : 'bg-white dark:bg-[#20201C] text-[#2D2D2A] dark:text-[#E8E8E1] border border-[#E8E8E1] dark:border-[#353530] rounded-bl-xs'
                      }`}
                    >
                      {/* Text Content */}
                      {msg.decryptedText && (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed font-sans">
                          {msg.decryptedText}
                        </p>
                      )}

                      {/* Decrypted Inline Photo Thumbnail */}
                      {msg.file && msg.file.mimeType && msg.file.mimeType.startsWith('image/') && (
                        <div className="mt-2.5 relative group/img cursor-pointer" onClick={() => decryptedMediaUrls[msg.file!.id] && setLightboxImageUrl(decryptedMediaUrls[msg.file!.id])}>
                          {decryptedMediaUrls[msg.file.id] ? (
                            <img
                              src={decryptedMediaUrls[msg.file.id]}
                              alt={msg.file.name}
                              className="max-h-60 rounded-xl object-cover border border-black/10 shadow-xs"
                            />
                          ) : (
                            <button
                              onClick={() => handleDownloadAndDecryptFile(msg.file!)}
                              className="p-4 bg-black/10 rounded-xl flex items-center gap-2 text-xs font-semibold"
                            >
                              <Lock className="w-4 h-4" />
                              <span>Click to Decrypt Photo ({formatFileSize(msg.file.size)})</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Decrypted Audio Voice Memo */}
                      {msg.file && msg.file.mimeType && msg.file.mimeType.startsWith('audio/') && (
                        <div className="mt-2.5">
                          {decryptedMediaUrls[msg.file.id] ? (
                            <audio controls src={decryptedMediaUrls[msg.file.id]} className="h-9 w-60 sm:w-64 max-w-full" />
                          ) : (
                            <button
                              onClick={() => handleDownloadAndDecryptFile(msg.file!)}
                              className="px-3.5 py-2 bg-black/10 hover:bg-black/20 rounded-xl flex items-center gap-2 text-xs font-semibold"
                            >
                              <Play className="w-4 h-4" />
                              <span>Decrypt & Play Voice Memo</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Non-image / Non-audio File Attachment */}
                      {msg.file && !msg.file.mimeType.startsWith('image/') && !msg.file.mimeType.startsWith('audio/') && (
                        <div className="mt-2.5 p-3 bg-black/10 dark:bg-white/5 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-5 h-5 flex-shrink-0" />
                            <div className="truncate text-xs">
                              <div className="font-semibold truncate">{msg.file.name}</div>
                              <div className="text-[10px] opacity-75">{formatFileSize(msg.file.size)} • SHA-256 verified</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadAndDecryptFile(msg.file!)}
                            disabled={downloadingFileId === msg.file.id}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Reactions Badges */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(msg.reactions).map(([emoji, uids]) => {
                        const uidList = Array.isArray(uids) ? (uids as string[]) : [];
                        const hasReacted = currentUser && uidList.includes(currentUser.uid);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg, emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                              hasReacted
                                ? 'bg-[#5A5A40]/15 border-[#5A5A40] text-[#5A5A40] dark:bg-[#8DAA82]/20 dark:border-[#8DAA82] dark:text-[#8DAA82]'
                                : 'bg-white dark:bg-[#20201C] border-[#D9D9D0] dark:border-[#353530] text-[#7A7A70] dark:text-[#A1A19A]'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-bold">{uidList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Footer */}
      <footer className="p-3.5 sm:p-5 bg-white/80 dark:bg-[#20201C]/80 backdrop-blur-md border-t border-[#D9D9D0] dark:border-[#353530] flex-shrink-0 space-y-2">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleProcessAndSetFile(e.target.files[0])}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleProcessAndSetFile(e.target.files[0])}
        />

        {/* Ephemeral Timer & Burn on Read Options Bar */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7A7A70] dark:text-[#A1A19A] flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> Ephemeral Expiry:
            </span>
            {[
              { label: 'Off', val: 0 },
              { label: '30s', val: 30 },
              { label: '5m', val: 300 },
              { label: '1h', val: 3600 },
            ].map((timer) => (
              <button
                key={timer.val}
                type="button"
                onClick={() => setEphemeralTimer(timer.val)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  ephemeralTimer === timer.val
                    ? 'bg-[#5A5A40] text-white dark:bg-[#8DAA82] dark:text-[#1A1A17]'
                    : 'bg-[#F0EFEB] dark:bg-[#282823] text-[#7A7A70] dark:text-[#A1A19A] hover:bg-[#D9D9D0]'
                }`}
              >
                {timer.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsBurnOnRead(!isBurnOnRead)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isBurnOnRead
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#F0EFEB] dark:bg-[#282823] text-[#7A7A70] dark:text-[#A1A19A] hover:bg-[#D9D9D0]'
              }`}
            >
              <Flame className="w-2.5 h-2.5" />
              <span>Burn on Read</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Poll creator trigger */}
            <button
              type="button"
              onClick={() => setIsCreatePollOpen(true)}
              className="p-1 text-[#7A7A70] dark:text-[#A1A19A] hover:text-[#5A5A40] dark:hover:text-[#8DAA82] rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Poll</span>
            </button>

            {/* Code Snippet editor trigger */}
            <button
              type="button"
              onClick={() => setIsCodeSnippetOpen(true)}
              className="p-1 text-[#7A7A70] dark:text-[#A1A19A] hover:text-[#5A5A40] dark:hover:text-[#8DAA82] rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Code</span>
            </button>

            {/* Scheduled Messages trigger */}
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="p-1 text-[#7A7A70] dark:text-[#A1A19A] hover:text-[#5A5A40] dark:hover:text-[#8DAA82] rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schedule</span>
            </button>
          </div>
        </div>

        {/* Input bar */}
        <form onSubmit={handleSendMessage} className="relative">
          <div className="flex items-center bg-white dark:bg-[#252521] rounded-2xl sm:rounded-3xl shadow-xs sm:shadow-md px-3 sm:px-5 py-1.5 sm:py-2.5 border border-[#E8E8E1] dark:border-[#353530] gap-1.5 sm:gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type an encrypted message or paste a photo..."
              disabled={sending}
              className="flex-1 min-w-0 outline-none text-xs sm:text-sm placeholder-[#A1A19A] dark:placeholder-[#7A7A70] text-[#2D2D2A] dark:text-[#E8E8E1] bg-transparent py-1"
            />
            
            <div className="flex items-center gap-1 sm:gap-1.5 text-[#5A5A40] dark:text-[#D1C7B7] flex-shrink-0">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                title="Attach & Encrypt Photo"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach & Encrypt File"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] transition-all cursor-pointer"
              >
                <Paperclip className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              <button
                type="button"
                onClick={onOpenUserSearch}
                title="Search @username to DM"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] font-serif text-sm font-bold transition-all cursor-pointer"
              >
                @
              </button>

              <button
                type="button"
                onClick={startRecording}
                title="Record Encrypted Voice Memo"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-[#F0EFEA] dark:hover:bg-[#30302B] text-[#5A5A40] dark:text-[#D1C7B7] transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              <div className="hidden sm:block w-px h-5 bg-[#D9D9D0] dark:bg-[#353530] mx-0.5" />

              <button
                type="submit"
                disabled={sending || (!inputText.trim() && !selectedFileForUpload)}
                className="w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-[#5A5A40] hover:bg-[#4A4A32] disabled:opacity-30 text-white rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {sending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </footer>

      {/* Feature Modals */}
      <CreatePollModal
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        onCreatePoll={handleCreatePoll}
      />

      <CodeSnippetModal
        isOpen={isCodeSnippetOpen}
        onClose={() => setIsCodeSnippetOpen(false)}
        onInsertCode={handleInsertCodeSnippet}
      />

      <MessageChecksumModal
        isOpen={!!checksumInspectMsg}
        onClose={() => setChecksumInspectMsg(null)}
        message={checksumInspectMsg}
      />

      <PinnedMessagesDrawer
        isOpen={isPinsDrawerOpen}
        onClose={() => setIsPinsDrawerOpen(false)}
        pinnedMessages={pinnedMessages}
        bookmarks={channelBookmarks}
        onUnpinMessage={(id) => {
          const m = messages.find((x) => x.id === id);
          if (m) handleTogglePin(m);
        }}
        onAddBookmark={(bm) => {
          setChannelBookmarks((prev) => [...prev, { ...bm, id: `bm_${Date.now()}`, createdAt: Date.now() }]);
        }}
        onDeleteBookmark={(id) => {
          setChannelBookmarks((prev) => prev.filter((b) => b.id !== id));
        }}
        currentUserName={currentUser?.displayName || 'Worker'}
      />

      <ScheduledMessagesModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        pendingScheduled={scheduledQueue}
        onScheduleMessage={handleScheduleMessage}
        onCancelScheduled={(id) => setScheduledQueue((prev) => prev.filter((s) => s.id !== id))}
        targetType={channel ? 'channel' : 'dm'}
        targetId={currentTargetId}
        targetName={displayName}
        senderUid={currentUser?.uid || ''}
        senderName={currentUser?.displayName || ''}
      />

      <PasswordExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        messages={messages}
        contextName={displayName}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6" onClick={() => setLightboxImageUrl(null)}>
          <div className="w-full flex items-center justify-between text-white max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#8DAA82]" />
              <span className="font-serif text-sm font-bold">Encrypted Photo Viewer</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={lightboxImageUrl}
                download="decrypted_photo.jpg"
                className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
              <button
                onClick={() => setLightboxImageUrl(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxImageUrl} 
              alt="Full size decrypted" 
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10" 
            />
          </div>

          <p className="text-white/60 text-[11px] text-center">
            Zero-knowledge decrypted in browser memory • Click anywhere to dismiss
          </p>
        </div>
      )}

      {/* Raw Payload Inspector Modal */}
      {inspectMessage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F5F0] border border-[#D9D9D0] rounded-3xl max-w-xl w-full p-6 shadow-2xl text-[#2D2D2A] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9D9D0] pb-3">
              <div className="flex items-center gap-2 text-[#5A5A40]">
                <ShieldCheck className="w-5 h-5 text-[#8DAA82]" />
                <h3 className="font-serif text-lg font-bold">Cryptographic Payload Inspector</h3>
              </div>
              <button
                onClick={() => setInspectMessage(null)}
                className="p-1 hover:bg-[#E8E8E1] rounded-full text-[#7A7A70]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#7A7A70]">
              This verifies that only raw encrypted ciphertexts and IVs are stored on Firebase Firestore:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8A8A80] block mb-1">
                  Decrypted Local Plaintext:
                </span>
                <div className="bg-white p-3 rounded-xl border border-[#E8E8E1] text-[#2D2D2A]">
                  {inspectMessage.decryptedText}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#8A8A80] block mb-1">
                  Raw Ciphertext Stored on Firestore:
                </span>
                <div className="bg-[#E8E8E1] p-3 rounded-xl border border-[#D9D9D0] text-[#5A5A40] break-all max-h-24 overflow-y-auto">
                  {inspectMessage.ciphertext || '[File Binary Payload Encrypted]'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8A8A80] block mb-1">
                    AES-GCM IV:
                  </span>
                  <div className="bg-[#E8E8E1] p-2 rounded-xl border border-[#D9D9D0] text-[#5A5A40] truncate">
                    {inspectMessage.iv}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8A8A80] block mb-1">
                    SHA-256 Checksum:
                  </span>
                  <div className="bg-[#E8E8E1] p-2 rounded-xl border border-[#D9D9D0] text-[#5A5A40] truncate">
                    {inspectMessage.sha256Checksum || 'Verified AES-GCM'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectMessage(null)}
                className="px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
