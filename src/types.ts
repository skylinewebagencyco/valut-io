export type UserStatusType = 'online' | 'busy' | 'meeting' | 'deep_work' | 'afk' | 'vacation' | 'dnd' | 'offline';

export type WorkplaceRoleType = 'owner' | 'security_admin' | 'member' | 'guest';

export interface RolePermissions {
  canCreateChannels: boolean;
  canInviteWorkers: boolean;
  canPurgeMessages: boolean;
  canManageRoles: boolean;
  canRotateKeys: boolean;
}

export interface WorkerUser {
  uid: string;
  email: string;
  displayName: string;
  username: string; // e.g. @alex.rivera
  usernameLower: string; // for case-insensitive Firestore lookup
  role: string;
  workplaceRole?: WorkplaceRoleType;
  department: string;
  avatarColor: string;
  photoURL?: string;
  publicKey?: string;
  keyFingerprint?: string;
  status: UserStatusType;
  customStatusText?: string;
  bio?: string;
  blockedUserUids?: string[];
  isVerified?: boolean;
  pinHash?: string;
  isBanned?: boolean;
  bannedReason?: string;
  bannedAt?: number;
  bannedBy?: string;
  lastSeen: number;
  createdAt: number;
}

export interface EncryptedFileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  sha256Hash: string;
  encryptedData: string; // Base64 ciphertext
  iv: string; // Base64 IV
  fileKeyEncrypted?: string; // If separate file key used
  uploadedBy: string;
  uploadedByName: string;
  uploadedByUsername: string;
  timestamp: number;
  tags?: string[];
}

export interface MessageReaction {
  [emoji: string]: string[]; // array of user UIDs
}

export interface PollOption {
  id: string;
  text: string;
  voterUids: string[];
  voters?: string[];
  votesCount?: number;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple?: boolean;
  isAnonymous?: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  totalVotes?: number;
  isClosed?: boolean;
}

export interface CodeSnippetData {
  id?: string;
  title?: string;
  language: string;
  code: string;
  authorUid?: string;
  authorName?: string;
}

export interface EncryptedMessage {
  id: string;
  channelId?: string;
  conversationId?: string;
  senderUid: string;
  senderName: string;
  senderUsername?: string;
  senderRole?: string;
  senderAvatar?: string;
  senderPhotoURL?: string;
  ciphertext: string; // Base64 AES-GCM ciphertext
  iv: string; // Base64 IV
  isEncrypted: boolean;
  file?: EncryptedFileMetadata | null;
  reactions?: MessageReaction;
  createdAt: number;

  // Poll & Code Snippet features
  type?: 'text' | 'poll' | 'code' | 'file';
  poll?: PollData;
  codeSnippet?: CodeSnippetData;

  // Ephemeral & Self-Destruct
  ephemeralSeconds?: number;
  expiresAt?: number;
  burnOnRead?: boolean;
  isBurned?: boolean;
  viewedAt?: number;
  burnedAt?: number;

  // Pinned & Bookmarks
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedByName?: string;
  pinnedAt?: number;

  // Verification
  sha256Checksum?: string;
  senderKeyFingerprint?: string;

  // Client-side decrypted cache (not stored in db)
  decryptedText?: string;
  decryptionError?: boolean;
}

export interface ChannelBookmark {
  id: string;
  title: string;
  url: string;
  category: 'doc' | 'link' | 'guideline' | 'announcement';
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdBy: string;
  createdByUsername?: string;
  memberUids: string[];
  createdAt: number;
  lastActivity: number;
  unreadCount?: number;
  bookmarks?: ChannelBookmark[];
}

export interface DirectConversation {
  id: string;
  participantUids: string[];
  participantUsernames: { [uid: string]: string };
  participantNames: { [uid: string]: string };
  participantAvatars?: { [uid: string]: string };
  lastMessageCiphertext?: string;
  lastMessageIv?: string;
  lastMessageTime?: number;
  lastSenderName?: string;
  lastSenderUsername?: string;
  participantReadTimes?: { [uid: string]: number };
  updatedAt: number;
  bookmarks?: ChannelBookmark[];
}

export interface ScheduledMessage {
  id: string;
  targetType: 'channel' | 'dm';
  targetId: string;
  targetName: string;
  senderUid: string;
  senderName: string;
  text: string;
  type?: 'text' | 'code' | 'poll';
  codeSnippet?: CodeSnippetData;
  poll?: PollData;
  ephemeralSeconds?: number;
  burnOnRead?: boolean;
  scheduledFor: number;
  createdAt: number;
  status: 'pending' | 'sent' | 'cancelled';
}

export interface KeyEpoch {
  epoch: number;
  algorithm: string;
  keyFingerprint: string;
  publicKeyJwk: string;
  createdAt: number;
  status: 'active' | 'retired';
  rotatedBy: string;
}

export interface SecurityAuditEntry {
  id: string;
  eventType: 'KEY_PAIR_GENERATED' | 'CHANNEL_KEY_ROTATED' | 'FILE_ENCRYPTED_AES256' | 'FILE_DECRYPTED_VERIFIED' | 'MESSAGE_SENT_E2EE' | 'FINGERPRINT_VERIFIED' | 'USERNAME_CLAIMED' | 'MESSAGE_BURNED' | 'ROLE_CHANGED';
  actorUid: string;
  actorName: string;
  actorUsername?: string;
  details: string;
  timestamp: number;
  channelOrTarget?: string;
}

export interface NotificationSettings {
  allowNotifications: boolean;
  lockScreenAlerts: boolean;
  notificationCenterAlerts: boolean;
  bannerAlerts: boolean;
  bannerStyle: 'temporary' | 'persistent';
  sounds: boolean;
  badges: boolean;
  announce: 'off' | 'spoken';
  showPreviews: 'always' | 'when_unlocked' | 'never';
  grouping: 'automatic' | 'by_conversation' | 'off';
  dndEnabled?: boolean;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connected' | 'ended' | 'declined' | 'busy' | 'missed';

export interface WhiteboardElement {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'line' | 'arrow' | 'note';
  color: string;
  strokeWidth: number;
  points?: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  authorUid?: string;
  authorName?: string;
}

export interface CallSession {
  id: string;
  callerUid: string;
  callerName: string;
  callerUsername?: string;
  callerAvatar?: string;
  callerPhotoURL?: string;
  receiverUid: string;
  receiverName: string;
  receiverUsername?: string;
  channelId?: string | null;
  channelName?: string | null;
  conversationId?: string | null;
  isChannelCall?: boolean;
  type: CallType;
  status: CallStatus;
  offer?: {
    type: string;
    sdp: string;
  } | null;
  answer?: {
    type: string;
    sdp: string;
  } | null;
  createdAt: number;
  connectedAt?: number;
  endedAt?: number;
  whiteboardData?: WhiteboardElement[];
}



