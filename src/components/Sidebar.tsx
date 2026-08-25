import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Lock, 
  Hash, 
  MessageSquare, 
  AtSign, 
  ShieldCheck, 
  Circle, 
  Users, 
  Sparkles,
  ChevronDown,
  X,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Channel, DirectConversation, WorkerUser } from '../types';
import { isOwner, isUserVerified } from '../utils';
import { VerifiedBadge } from './VerifiedBadge';
import { encryptTextMessage } from '../lib/crypto';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

interface SidebarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  selectedConversationId: string | null;
  selectedDmRecipient?: WorkerUser | null;
  onSelectChannel: (channelId: string) => void;
  onSelectConversation: (conversationId: string, otherUser: WorkerUser) => void;
  onOpenCreateChannel: () => void;
  onOpenUserSearch: () => void;
  onOpenProfileModal: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  selectedChannelId,
  selectedConversationId,
  selectedDmRecipient,
  onSelectChannel,
  onSelectConversation,
  onOpenCreateChannel,
  onOpenUserSearch,
  onOpenProfileModal,
  onClose,
}) => {
  const { currentUser, activeWorkers, conversations, isUserBlocked } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');

  // Map all active workers to show in the Direct Messages section
  const conversationWorkersMap = new Map<string, { convId: string; worker: WorkerUser; updatedAt: number, hasUnread: boolean }>();

  // First, map everyone so no one is left out
  activeWorkers.forEach((worker) => {
    if (worker.uid !== currentUser?.uid) {
      const uids = [currentUser?.uid || '', worker.uid].sort();
      const tempConvId = `dm_${uids.join('_')}`;
      conversationWorkersMap.set(worker.uid, {
        convId: tempConvId,
        worker,
        updatedAt: 0,
        hasUnread: false,
      });
    }
  });

  // Then, override with actual conversation data for those the user has texted
  conversations.forEach((conv) => {
    const otherUid = conv.participantUids?.find((uid) => uid !== currentUser?.uid);
    if (!otherUid) return;

    const found = activeWorkers.find((w) => w.uid === otherUid);
    const worker: WorkerUser = found || {
      uid: otherUid,
      email: '',
      displayName: conv.participantNames?.[otherUid] || 'Colleague',
      username: conv.participantUsernames?.[otherUid] || 'colleague',
      usernameLower: (conv.participantUsernames?.[otherUid] || 'colleague').toLowerCase(),
      role: 'Team Member',
      department: 'Operations',
      avatarColor: conv.participantAvatars?.[otherUid] || '#5A5A40',
      status: 'offline',
      createdAt: 0,
      lastSeen: 0,
    };

    const myReadTime = currentUser?.uid && conv.participantReadTimes ? conv.participantReadTimes[currentUser.uid] : 0;
    const hasUnread = Boolean(
      conv.lastMessageTime && 
      conv.lastSenderUsername !== currentUser?.username && 
      conv.lastSenderUsername !== currentUser?.email &&
      myReadTime < conv.lastMessageTime
    );

    conversationWorkersMap.set(otherUid, {
      convId: conv.id,
      worker,
      updatedAt: conv.updatedAt || conv.lastMessageTime || 0,
      hasUnread,
    });
  });

  // If user selected a DM recipient from search that doesn't have a message history yet, show them in list
  if (selectedDmRecipient && selectedConversationId && !conversationWorkersMap.has(selectedDmRecipient.uid)) {
    conversationWorkersMap.set(selectedDmRecipient.uid, {
      convId: selectedConversationId,
      worker: selectedDmRecipient,
      updatedAt: Date.now(),
      hasUnread: false,
    });
  }

  const messagedItems = Array.from(conversationWorkersMap.values()).sort((a, b) => {
    if (b.updatedAt === a.updatedAt) {
      return (a.worker.displayName || '').localeCompare(b.worker.displayName || '');
    }
    return b.updatedAt - a.updatedAt;
  });

  const filteredDMs = filterQuery
    ? messagedItems.filter(
        ({ worker }) =>
          worker.displayName?.toLowerCase().includes(filterQuery.toLowerCase()) ||
          worker.username?.toLowerCase().includes(filterQuery.toLowerCase()) ||
          worker.department?.toLowerCase().includes(filterQuery.toLowerCase()) ||
          worker.bio?.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : messagedItems;

  const handleBroadcast = async () => {
    if (!currentUser || !isOwner(currentUser)) return;
    const text = window.prompt("Enter broadcast message for all public channels:");
    if (!text || text.trim() === '') return;
    
    try {
      const snap = await getDocs(collection(db, 'channels'));
      for (const docSnap of snap.docs) {
        const channelId = docSnap.id;
        const msg = await encryptTextMessage(`📢 BROADCAST: ${text.trim()}`, channelId);
        await addDoc(collection(db, 'channels', channelId, 'messages'), {
          senderUid: currentUser.uid,
          senderName: currentUser.displayName,
          senderUsername: currentUser.username || currentUser.displayName,
          senderAvatar: currentUser.avatarColor,
          ciphertext: msg.ciphertext,
          iv: msg.iv,
          createdAt: Date.now(),
          isBroadcast: true
        });
      }
      alert("Broadcast sent successfully to all channels.");
    } catch (err) {
      console.error(err);
      alert("Failed to send broadcast.");
    }
  };

  return (
    <aside
      id="workspace-sidebar"
      className="w-64 sm:w-72 bg-[#F1F1EB] dark:bg-[#20201C] flex flex-col border-r border-[#D9D9D0] dark:border-[#353530] select-none flex-shrink-0 h-full overflow-hidden transition-colors"
    >
      {/* Workspace Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-[#D9D9D0]/70 dark:border-[#353530] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl text-[#5A5A40] dark:text-[#E8E8E1] font-bold tracking-tight truncate">
              Valut.io
            </h1>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8A8A80] dark:text-[#A1A19A] font-bold mt-0.5 truncate">
              Secure Comms
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* User Handle Badge */}
            <button
              onClick={onOpenProfileModal}
              title="Edit Profile & Username"
              className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#1A1A17] hover:bg-[#FAF9F6] dark:hover:bg-[#2A2A25] border border-[#D9D9D0] dark:border-[#353530] rounded-xl text-xs font-semibold text-[#5A5A40] dark:text-[#D1C7B7] shadow-2xs transition-all cursor-pointer"
            >
              {isOwner(currentUser) ? (
                <span className="px-1.5 py-0.2 bg-[#2D2D2A] text-white text-[8px] font-bold uppercase tracking-wider rounded">
                  Owner
                </span>
              ) : isUserVerified(currentUser) ? (
                <VerifiedBadge size="xs" />
              ) : null}
              <span className="font-mono text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-none">
                @{currentUser?.username || 'handle'}
              </span>
            </button>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 text-[#7A7A70] hover:text-[#2D2D2A] hover:bg-[#E8E8E1] dark:hover:bg-[#2A2A25] rounded-xl transition-colors"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {isOwner(currentUser) && (
          <button
            onClick={handleBroadcast}
            className="w-full px-2.5 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Broadcast Message</span>
          </button>
        )}
      </div>

      {/* Quick Search Workers / Channels */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-[#8A8A80]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search @username or channel..."
            className="w-full bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium placeholder-[#A1A19A] dark:placeholder-[#7A7A70] text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#D1C7B7] transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Navigation Lists */}
      <div className="flex-1 px-3 py-2 overflow-y-auto space-y-6">
        {/* CHANNELS SECTION */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[11px] font-bold text-[#8A8A80] uppercase tracking-wider">
              Channels
            </p>
            <button
              id="create-channel-btn"
              onClick={onOpenCreateChannel}
              title="Create Encrypted Channel"
              className="p-1 hover:bg-[#E8E8E1] rounded-lg text-[#7A7A70] hover:text-[#2D2D2A] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <ul className="space-y-1">
            {channels
              .filter((ch) => !filterQuery || ch.name.toLowerCase().includes(filterQuery.toLowerCase()))
              .map((channel) => {
                const isSelected = selectedChannelId === channel.id && !selectedConversationId;
                return (
                  <li key={channel.id}>
                    <button
                      onClick={() => onSelectChannel(channel.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#5A5A40] font-bold shadow-xs border border-[#E8E8E1]'
                          : 'text-[#7A7A70] hover:bg-[#E8E8E1] hover:text-[#2D2D2A]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[#8DAA82] font-semibold">#</span>
                        <span className="truncate">{channel.name}</span>
                      </div>
                      {channel.isPrivate && (
                        <Lock className="w-3 h-3 text-[#A1A19A] flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>

        {/* DIRECT MESSAGES SECTION (ONLY People the user has messaged) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-[#8A8A80] uppercase tracking-wider">
                Direct Messages
              </p>
              <span className="text-[10px] bg-[#E8E8E1] dark:bg-[#2A2A25] text-[#7A7A70] dark:text-[#A1A19A] px-1.5 py-0.2 rounded-full font-semibold">
                {messagedItems.length}
              </span>
            </div>
            <button
              id="search-user-btn"
              onClick={onOpenUserSearch}
              title="Search and Message by @Username"
              className="text-[11px] text-[#5A5A40] dark:text-[#D1C7B7] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <AtSign className="w-3 h-3" />
              <span>Search</span>
            </button>
          </div>

          <ul className="space-y-1.5">
            {filteredDMs.length === 0 ? (
              <li className="px-3 py-4 text-center bg-white/50 dark:bg-[#1A1A17]/50 rounded-2xl border border-dashed border-[#D9D9D0] dark:border-[#353530]">
                <div className="w-8 h-8 rounded-full bg-[#E8E8E1] dark:bg-[#2A2A25] flex items-center justify-center mx-auto text-[#7A7A70] dark:text-[#A1A19A] mb-2">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-[#5A5A40] dark:text-[#E8E8E1]">
                  {filterQuery ? 'No contacts match search' : 'No coworkers found'}
                </p>
                <p className="text-[11px] text-[#8A8A80] dark:text-[#7A7A70] mt-0.5 mb-2.5">
                  {filterQuery
                    ? 'Try searching by another @username.'
                    : 'Search for coworkers to start an encrypted direct conversation.'}
                </p>
                {!filterQuery && (
                  <button
                    onClick={onOpenUserSearch}
                    className="px-3 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <AtSign className="w-3 h-3" />
                    <span>Find Coworker</span>
                  </button>
                )}
              </li>
            ) : (
              filteredDMs.map(({ convId, worker, hasUnread }) => {
                const isSelected = selectedConversationId === convId;
                const isBlocked = isUserBlocked(worker.uid);

                return (
                  <li key={worker.uid}>
                    <button
                      onClick={() => onSelectConversation(convId, worker)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-white dark:bg-[#252521] text-[#5A5A40] dark:text-[#E8E8E1] font-semibold shadow-xs border border-[#E8E8E1] dark:border-[#353530]'
                          : hasUnread 
                            ? 'bg-[#E8E8E1] dark:bg-[#2A2A25] text-[#2D2D2A] dark:text-[#E8E8E1] font-bold shadow-2xs border border-[#D9D9D0] dark:border-[#353530]'
                            : 'hover:bg-[#E8E8E1] dark:hover:bg-[#2A2A25] text-[#4D4D4A] dark:text-[#A1A19A]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative shadow-2xs"
                          style={!worker.photoURL ? { backgroundColor: worker.avatarColor || '#5A5A40' } : undefined}
                        >
                          {worker.photoURL ? (
                            <img src={worker.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            worker.displayName?.charAt(0) || 'W'
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                              worker.status === 'online'
                                ? 'bg-[#8DAA82]'
                                : worker.status === 'busy'
                                ? 'bg-amber-500'
                                : 'bg-[#D9D9D0]'
                            }`}
                          />
                          {isUserVerified(worker) && (
                            <div className="absolute -top-1 -right-1 ring-1 ring-white rounded-full bg-white scale-75">
                              <VerifiedBadge size="xs" tooltip={isOwner(worker) ? "Verified Owner" : "Verified Account"} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 truncate flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`font-medium truncate text-xs ${hasUnread && !isSelected ? 'font-bold' : ''}`}>{worker.displayName}</p>
                            {isOwner(worker) ? (
                              <span className="px-1.5 py-0.2 bg-[#2D2D2A] text-white text-[8px] font-bold uppercase tracking-wider rounded">
                                Owner
                              </span>
                            ) : isUserVerified(worker) ? (
                              <VerifiedBadge size="xs" />
                            ) : null}
                            {isBlocked && (
                              <span className="px-1 py-0.2 bg-rose-600 text-white text-[8px] font-bold uppercase tracking-wider rounded">
                                Blocked
                              </span>
                            )}
                            {worker.isBanned && (
                              <span className="px-1 py-0.2 bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider rounded">
                                Banned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-[10px] font-mono truncate ${hasUnread && !isSelected ? 'font-semibold text-[#5A5A40] dark:text-[#D1C7B7]' : 'text-[#8A8A80] dark:text-[#7A7A70]'}`}>
                              @{worker.username || 'user'}
                            </p>
                            {worker.bio && (
                              <span className="text-[10px] text-[#A1A19A] dark:text-[#5A5A50] truncate italic">
                                • {worker.bio}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasUnread && !isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[#1D9BF0] shadow-sm flex-shrink-0 ml-1.5" />
                        )}
                      </div>
                      {/* E2EE Lock Icon */}
                      <Lock className="w-3 h-3 text-[#8DAA82] opacity-60 group-hover:opacity-100 flex-shrink-0 ml-1.5" />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {/* Bottom Security Engine Status Card (Matching Natural Tones Theme Spec) */}
      <div className="p-4 bg-[#E8E8E1] m-3 rounded-2xl border border-[#D9D9D0]/70 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-[#5A5A40] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8DAA82]" />
            Firebase E2EE Active
          </p>
          <span className="text-[9px] font-mono text-[#8DAA82] font-semibold">AES-256</span>
        </div>
        <div className="h-1.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
          <div className="w-full h-full bg-[#5A5A40] rounded-full"></div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-[#7A7A70]">
          <span>Zero-Knowledge Relay</span>
          <span className="font-mono">RSA-2048</span>
        </div>
      </div>
    </aside>
  );
};
