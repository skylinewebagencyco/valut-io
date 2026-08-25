import React, { useState } from 'react';
import { 
  Pin, 
  Bookmark, 
  Trash2, 
  Plus, 
  ExternalLink, 
  FileText, 
  MessageSquare, 
  Check, 
  X,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EncryptedMessage, ChannelBookmark } from '../types';

interface PinnedMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: EncryptedMessage[];
  bookmarks: ChannelBookmark[];
  onUnpinMessage: (msgId: string) => void;
  onAddBookmark: (bookmark: Omit<ChannelBookmark, 'id' | 'createdAt'>) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onJumpToMessage?: (msgId: string) => void;
  currentUserName: string;
}

export const PinnedMessagesDrawer: React.FC<PinnedMessagesDrawerProps> = ({
  isOpen,
  onClose,
  pinnedMessages,
  bookmarks,
  onUnpinMessage,
  onAddBookmark,
  onDeleteBookmark,
  onJumpToMessage,
  currentUserName,
}) => {
  const [activeTab, setActiveTab] = useState<'pinned' | 'bookmarks'>('pinned');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<'doc' | 'link' | 'guideline' | 'announcement'>('link');

  if (!isOpen) return null;

  const handleSaveBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    onAddBookmark({
      title: newTitle.trim(),
      url: newUrl.trim(),
      category: newCategory,
      createdBy: 'current',
      createdByName: currentUserName,
    });

    setNewTitle('');
    setNewUrl('');
    setIsAddingBookmark(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 bg-[#1A1A17]/40 backdrop-blur-[2px] flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-white dark:bg-[#1E1E1B] border-l border-[#D9D9D0] dark:border-[#353530] h-full shadow-2xl flex flex-col z-50 text-left"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <Pin className="w-4 h-4" />
              </div>
              <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                Channel Pins & Bookmarks
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#D9D9D0] dark:border-[#353530] bg-[#F7F7F4] dark:bg-[#252521] px-5 gap-4">
            <button
              onClick={() => setActiveTab('pinned')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pinned'
                  ? 'border-[#5A5A40] dark:border-[#8DAA82] text-[#5A5A40] dark:text-[#8DAA82]'
                  : 'border-transparent text-[#7A7A70] dark:text-[#A1A19A]'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Pinned Messages ({pinnedMessages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bookmarks'
                  ? 'border-[#5A5A40] dark:border-[#8DAA82] text-[#5A5A40] dark:text-[#8DAA82]'
                  : 'border-transparent text-[#7A7A70] dark:text-[#A1A19A]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Channel Bookmarks ({bookmarks.length})</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {activeTab === 'pinned' ? (
              pinnedMessages.length === 0 ? (
                <div className="text-center py-12 text-[#7A7A70] dark:text-[#A1A19A]">
                  <Pin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No pinned messages yet</p>
                  <p className="text-[11px] mt-1">
                    Hover over any message in chat and click "Pin to Channel" to pin critical guidelines or updates.
                  </p>
                </div>
              ) : (
                pinnedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] relative group hover:border-[#8DAA82]/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">
                        <span>{msg.senderName}</span>
                        <span className="text-[10px] text-[#7A7A70] dark:text-[#8A8A80] font-normal">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        onClick={() => onUnpinMessage(msg.id)}
                        className="p-1 text-[#7A7A70] hover:text-rose-500 rounded transition-colors cursor-pointer"
                        title="Unpin Message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[#2D2D2A] dark:text-[#D1C7B7] text-xs break-words">
                      {msg.decryptedText || (msg.file ? `📎 File: ${msg.file.name}` : '[Encrypted Content]')}
                    </div>

                    {msg.pinnedByName && (
                      <div className="mt-2 text-[10px] text-[#7A7A70] dark:text-[#8A8A80] flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Pinned by {msg.pinnedByName}</span>
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              <div className="space-y-4">
                {/* Add Bookmark Trigger */}
                {!isAddingBookmark ? (
                  <button
                    onClick={() => setIsAddingBookmark(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-[#D9D9D0] dark:border-[#3A3A34] text-[#5A5A40] dark:text-[#8DAA82] hover:bg-[#F7F7F4] dark:hover:bg-[#252521] flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Bookmark / Resource</span>
                  </button>
                ) : (
                  <form onSubmit={handleSaveBookmark} className="p-3.5 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] space-y-3">
                    <div className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">New Bookmark</div>
                    <input
                      type="text"
                      placeholder="Title (e.g. Infrastructure Specs & Runbook)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="URL or internal URI (https://...)"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none"
                    />
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none"
                    >
                      <option value="link">Web Resource / Link</option>
                      <option value="doc">Architecture Document</option>
                      <option value="guideline">Security Guideline</option>
                      <option value="announcement">Team Announcement</option>
                    </select>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingBookmark(false)}
                        className="px-3 py-1.5 rounded-lg text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#5A5A40] hover:bg-[#4A4A32] text-white font-medium shadow-sm"
                      >
                        Save Bookmark
                      </button>
                    </div>
                  </form>
                )}

                {/* Bookmark List */}
                {bookmarks.length === 0 ? (
                  <div className="text-center py-10 text-[#7A7A70] dark:text-[#A1A19A]">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No channel bookmarks added</p>
                  </div>
                ) : (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="p-3.5 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] flex items-start justify-between group hover:border-[#8DAA82]/50 transition-all"
                    >
                      <div className="flex items-start gap-2.5 flex-1 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-[#8DAA82]/15 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bookmark className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <a
                            href={bm.url.startsWith('http') ? bm.url : `https://${bm.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] hover:text-[#5A5A40] dark:hover:text-[#8DAA82] flex items-center gap-1"
                          >
                            <span>{bm.title}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                          <div className="text-[10px] text-[#7A7A70] dark:text-[#8A8A80] mt-0.5 truncate max-w-[240px]">
                            {bm.url}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="p-1 text-[#7A7A70] hover:text-rose-500 rounded transition-colors cursor-pointer"
                        title="Delete Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
