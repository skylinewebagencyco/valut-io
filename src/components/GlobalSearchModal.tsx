import React, { useState, useEffect, useMemo } from 'react';
import { Search, Hash, AtSign, FileText, Pin, MessageSquare, ArrowRight, User, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel, WorkerUser, EncryptedMessage, DirectConversation } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  workers: WorkerUser[];
  onSelectChannel: (channelId: string) => void;
  onSelectConversation: (worker: WorkerUser) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  channels,
  workers,
  onSelectChannel,
  onSelectConversation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'channels' | 'people' | 'files'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredResults = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) {
      return {
        channels: channels.slice(0, 5),
        workers: workers.slice(0, 5),
      };
    }

    const matchedChannels = channels.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
    );

    const matchedWorkers = workers.filter(
      (w) =>
        w.displayName.toLowerCase().includes(query) ||
        w.username.toLowerCase().includes(query) ||
        w.role.toLowerCase().includes(query) ||
        w.department.toLowerCase().includes(query)
    );

    return {
      channels: matchedChannels,
      workers: matchedWorkers,
    };
  }, [searchTerm, channels, workers]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[75vh]"
        >
          {/* Search Input Bar */}
          <div className="p-4 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center gap-3 bg-[#F7F7F4] dark:bg-[#252521]">
            <Search className="w-5 h-5 text-[#7A7A70] dark:text-[#A1A19A]" />
            <input
              type="text"
              placeholder="Search channels, coworkers, roles, or files (Cmd + K)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none placeholder:text-[#A1A19A]"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-[#7A7A70] dark:text-[#8A8A80] bg-[#E8E8E1] dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded">
              ESC
            </kbd>
          </div>

          {/* Filter Chips */}
          <div className="px-4 py-2 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center gap-2 bg-white dark:bg-[#1E1E1B] text-xs">
            <span className="text-[#7A7A70] dark:text-[#A1A19A] text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3" /> Quick filters:
            </span>
            {[
              { label: 'All', value: 'all' },
              { label: 'Channels', value: 'channels' },
              { label: 'Coworkers', value: 'people' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value as any)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === f.value
                    ? 'bg-[#5A5A40] text-white dark:bg-[#8DAA82] dark:text-[#1A1A17]'
                    : 'bg-[#F0EFEB] dark:bg-[#282823] text-[#7A7A70] dark:text-[#A1A19A] hover:bg-[#D9D9D0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Channels Section */}
            {(filterType === 'all' || filterType === 'channels') && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A70] dark:text-[#A1A19A] mb-2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Channels ({filteredResults.channels.length})
                </div>
                <div className="space-y-1">
                  {filteredResults.channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        onSelectChannel(channel.id);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-[#F7F7F4] dark:hover:bg-[#252521] flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#5A5A40]/10 dark:bg-[#8DAA82]/20 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center font-bold">
                          #
                        </div>
                        <div>
                          <div className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] group-hover:text-[#5A5A40] dark:group-hover:text-[#8DAA82]">
                            {channel.name}
                          </div>
                          <div className="text-[11px] text-[#7A7A70] dark:text-[#8A8A80] truncate max-w-sm">
                            {channel.description || 'Secure workspace communication channel'}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7A7A70] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Coworkers Section */}
            {(filterType === 'all' || filterType === 'people') && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A70] dark:text-[#A1A19A] mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Coworkers & Key Identities ({filteredResults.workers.length})
                </div>
                <div className="space-y-1">
                  {filteredResults.workers.map((worker) => (
                    <button
                      key={worker.uid}
                      onClick={() => {
                        onSelectConversation(worker);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-[#F7F7F4] dark:hover:bg-[#252521] flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                          style={{ backgroundColor: worker.avatarColor || '#5A5A40' }}
                        >
                          {worker.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] group-hover:text-[#5A5A40] dark:group-hover:text-[#8DAA82] flex items-center gap-1.5">
                            <span>{worker.displayName}</span>
                            <span className="text-[11px] font-normal text-[#7A7A70] dark:text-[#8A8A80]">
                              @{worker.username}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7A7A70] dark:text-[#8A8A80]">
                            {worker.role} • {worker.department}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7A7A70] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
