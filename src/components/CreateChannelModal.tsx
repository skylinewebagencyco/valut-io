import React, { useState } from 'react';
import { Hash, Lock, X, Plus, ShieldCheck } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Channel } from '../types';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channelId: string) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onChannelCreated,
}) => {
  const { currentUser, logSecurityAudit, activeWorkers } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!cleanName || cleanName.length < 2) {
      setError('Channel name must be at least 2 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const memberUids = isPrivate 
        ? Array.from(new Set([currentUser?.uid || '', ...selectedMembers]))
        : [currentUser?.uid || ''];

      const channelDoc = await addDoc(collection(db, 'channels'), {
        name: cleanName,
        description: description.trim() || 'Encrypted company channel',
        isPrivate,
        createdBy: currentUser?.uid || '',
        createdByUsername: currentUser?.username || '',
        memberUids,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });

      await logSecurityAudit(
        'CHANNEL_KEY_ROTATED',
        `Created ${isPrivate ? 'private' : 'workspace'} encrypted channel #${cleanName}`,
        `#${cleanName}`
      );

      onChannelCreated(channelDoc.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to create channel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F5F5F0] border border-[#D9D9D0] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-[#2D2D2A]">
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center font-serif text-lg font-bold">
              #
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#5A5A40]">
                Create Encrypted Channel
              </h3>
              <p className="text-[11px] text-[#7A7A70]">
                Channels are sealed with dedicated AES-256 symmetric keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A7A70] hover:text-[#2D2D2A] hover:bg-[#E8E8E1] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1.5">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#8A8A80] font-bold">#</div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="strategy-sync"
                required
                className="w-full bg-white border border-[#D9D9D0] rounded-2xl pl-8 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#5A5A40] text-[#2D2D2A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1.5">
              Objective / Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topic or project details..."
              rows={2}
              className="w-full bg-white border border-[#D9D9D0] rounded-2xl p-3 text-sm font-medium focus:outline-none focus:border-[#5A5A40] text-[#2D2D2A]"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-[#E8E8E1]">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#5A5A40]" />
                <div>
                  <p className="text-xs font-bold text-[#2D2D2A]">Private Group Chat</p>
                  <p className="text-[10px] text-[#7A7A70]">Select members to add</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-[#5A5A40] rounded cursor-pointer"
              />
            </div>

            {isPrivate && (
              <div className="max-h-40 overflow-y-auto bg-[#FAF9F6] border border-[#E8E8E1] rounded-2xl p-2 space-y-1">
                {activeWorkers.filter(w => w.uid !== currentUser?.uid).map(worker => (
                  <label key={worker.uid} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedMembers.includes(worker.uid)}
                      onChange={() => toggleMember(worker.uid)}
                      className="w-4 h-4 accent-[#5A5A40] rounded cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs overflow-hidden"
                        style={!worker.photoURL ? { backgroundColor: worker.avatarColor || '#5A5A40' } : undefined}
                      >
                        {worker.photoURL ? <img src={worker.photoURL} alt="" className="w-full h-full object-cover" /> : worker.displayName?.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-[#2D2D2A]">{worker.displayName}</span>
                      <span className="text-[10px] font-mono text-[#7A7A70]">@{worker.username}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#7A7A70] hover:bg-[#E8E8E1] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#5A5A40]/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
