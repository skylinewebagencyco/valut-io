import React, { useState } from 'react';
import { Search, AtSign, MessageSquare, ShieldCheck, User, X, Check, ArrowRight, Ban, CheckCircle2, ShieldAlert, BadgeCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WorkerUser } from '../types';
import { isOwner, isUserVerified } from '../utils';
import { VerifiedBadge } from './VerifiedBadge';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkerForDM: (worker: WorkerUser) => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectWorkerForDM,
}) => {
  const { 
    searchWorkers, 
    activeWorkers, 
    currentUser, 
    banUser, 
    unbanUser, 
    toggleUserVerified, 
    verifyAllUsers,
    blockUser,
    unblockUser,
    isUserBlocked,
  } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [banModalTarget, setBanModalTarget] = useState<WorkerUser | null>(null);
  const [banReason, setBanReason] = useState('Violated workspace safety and conduct policies');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'banned'>('all');

  if (!isOpen) return null;

  const userIsOwner = currentUser ? isOwner(currentUser) : false;

  let results = searchWorkers(searchTerm);
  if (filterType === 'verified') {
    results = results.filter((w) => isUserVerified(w));
  } else if (filterType === 'banned') {
    results = results.filter((w) => Boolean(w.isBanned));
  }

  const handleStartDM = (worker: WorkerUser) => {
    if (worker.isBanned && !userIsOwner) return;
    onSelectWorkerForDM(worker);
    onClose();
  };

  const handleToggleVerify = async (worker: WorkerUser) => {
    try {
      setProcessingAction(worker.uid);
      const nextState = !isUserVerified(worker);
      await toggleUserVerified(worker.uid, nextState);
    } catch (err: any) {
      alert(err.message || 'Failed to update verification');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBatchVerifyAll = async (verify: boolean) => {
    const actionName = verify ? 'verify all workspace members' : 'unverify all members';
    if (!window.confirm(`Are you sure you want to ${actionName}?`)) return;
    try {
      setProcessingAction('batch-verify');
      await verifyAllUsers(verify);
    } catch (err: any) {
      alert(err.message || 'Failed to update members');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleConfirmBan = async () => {
    if (!banModalTarget) return;
    try {
      setProcessingAction(banModalTarget.uid);
      await banUser(banModalTarget.uid, banReason);
      setBanModalTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to ban user');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUnban = async (worker: WorkerUser) => {
    if (!window.confirm(`Revoke ban for @${worker.username || worker.displayName}?`)) return;
    try {
      setProcessingAction(worker.uid);
      await unbanUser(worker.uid);
    } catch (err: any) {
      alert(err.message || 'Failed to unban user');
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F5F5F0] border border-[#D9D9D0] rounded-3xl max-w-xl w-full p-6 shadow-2xl text-[#2D2D2A] flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center font-serif text-lg font-bold">
              @
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#5A5A40]">
                  Workspace Member Directory
                </h3>
                {userIsOwner && (
                  <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold uppercase rounded-md tracking-wider">
                    Owner Moderation
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7A7A70]">
                Search colleagues by @username, manage verifications, and regulate access.
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

        {/* OWNER ACTIONS BAR */}
        {userIsOwner && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold">
              <BadgeCheck className="w-4 h-4 text-amber-700" />
              <span>Owner Authority:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchVerifyAll(true)}
                disabled={processingAction === 'batch-verify'}
                className="px-3 py-1.5 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify All Members</span>
              </button>
              <button
                type="button"
                onClick={() => handleBatchVerifyAll(false)}
                disabled={processingAction === 'batch-verify'}
                className="px-3 py-1.5 bg-white border border-[#D9D9D0] text-[#5A5A40] hover:bg-[#E8E8E1] rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Reset All</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills & Search input bar */}
        <div className="pt-3 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#5A5A40] text-white'
                  : 'bg-white text-[#7A7A70] hover:bg-[#E8E8E1] border border-[#D9D9D0]'
              }`}
            >
              All Members ({activeWorkers.length})
            </button>
            <button
              onClick={() => setFilterType('verified')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                filterType === 'verified'
                  ? 'bg-[#1D9BF0] text-white'
                  : 'bg-white text-[#7A7A70] hover:bg-[#E8E8E1] border border-[#D9D9D0]'
              }`}
            >
              <VerifiedBadge size="xs" />
              <span>Verified Only</span>
            </button>
            <button
              onClick={() => setFilterType('banned')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                filterType === 'banned'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-[#7A7A70] hover:bg-[#E8E8E1] border border-[#D9D9D0]'
              }`}
            >
              <Ban className="w-3 h-3" />
              <span>Banned</span>
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-[#8A8A80]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search @username, name, e.g. @sarah, engineering..."
              autoFocus
              className="w-full bg-white border border-[#D9D9D0] rounded-2xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/10 transition-all text-[#2D2D2A]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 text-xs text-[#8A8A80] hover:text-[#2D2D2A]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Worker Results list */}
        <div className="flex-1 overflow-y-auto py-1.5 space-y-2.5 pr-1 my-1">
          {results.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white/60 rounded-2xl border border-[#E8E8E1]">
              <User className="w-8 h-8 mx-auto text-[#A1A19A] mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[#5A5A40]">No team members found</p>
              <p className="text-xs text-[#8A8A80] mt-1">
                Try searching for another @username or adjust your filter selection.
              </p>
            </div>
          ) : (
            results.map((worker) => {
              const workerIsOwner = isOwner(worker);
              const workerIsVerified = isUserVerified(worker);
              const isBanned = Boolean(worker.isBanned);
              const isTargetSelf = currentUser?.uid === worker.uid;
              const isBlocked = isUserBlocked(worker.uid);

              return (
                <div
                  key={worker.uid}
                  className={`p-3.5 bg-white border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all group shadow-xs ${
                    isBanned ? 'border-red-300 bg-red-50/40' : 'border-[#E8E8E1] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {/* Worker Avatar & Info */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 w-full sm:flex-1">
                    {/* Avatar with Verified Checkmark next to profile pic */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs overflow-hidden border border-[#D9D9D0]"
                        style={!worker.photoURL ? { backgroundColor: worker.avatarColor || '#5A5A40' } : undefined}
                      >
                        {worker.photoURL ? (
                          <img src={worker.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          worker.displayName?.charAt(0) || 'U'
                        )}
                      </div>

                      {/* Verified Checkmark right next to Profile Picture */}
                      {workerIsVerified && (
                        <div className="absolute bottom-0 right-0 ring-2 ring-white rounded-full bg-white flex items-center justify-center shadow-sm">
                          <VerifiedBadge size="xs" tooltip={workerIsOwner ? "Verified Owner" : "Verified Account"} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#2D2D2A] truncate">
                          {worker.displayName}
                        </span>

                        {workerIsOwner && (
                          <span className="px-1.5 py-0.5 bg-[#2D2D2A] text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                            Owner
                          </span>
                        )}

                        {workerIsVerified && !workerIsOwner && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold rounded-md">
                            <VerifiedBadge size="xs" />
                            <span>Verified</span>
                          </span>
                        )}

                        {isBanned && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                            Banned
                          </span>
                        )}

                        <span className="text-xs font-mono text-[#5A5A40] bg-[#E8E8E1]/80 px-2 py-0.5 rounded-md font-semibold">
                          @{worker.username || 'unregistered'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#7A7A70] mt-0.5 truncate">
                        <span>{worker.role || 'Team Member'}</span>
                        <span>•</span>
                        <span>{worker.department || 'Operations'}</span>
                      </div>

                      {/* Worker Bio */}
                      {worker.bio && (
                        <p className="text-xs text-[#5A5A40] bg-[#E8E8E1]/60 px-2 py-1 rounded-lg mt-1 italic line-clamp-2">
                          "{worker.bio}"
                        </p>
                      )}

                      {isBanned && worker.bannedReason && (
                        <div className="text-[10px] text-red-600 font-medium mt-0.5">
                          Ban reason: {worker.bannedReason}
                        </div>
                      )}

                      {worker.keyFingerprint && (
                        <div className="flex items-center gap-1 text-[9px] text-[#8DAA82] font-mono mt-0.5 truncate">
                          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                          <span>RSA Key: {worker.keyFingerprint.substring(0, 19)}...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                    {/* Owner Moderation Controls */}
                    {userIsOwner && !workerIsOwner && !isTargetSelf && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Toggle Verify Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(worker)}
                          disabled={processingAction === worker.uid}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 ${
                            worker.isVerified
                              ? 'bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-300'
                              : 'bg-white border border-[#D9D9D0] text-[#5A5A40] hover:bg-[#E8E8E1]'
                          }`}
                          title={worker.isVerified ? 'Remove verification' : 'Grant verified badge'}
                        >
                          <VerifiedBadge size="xs" />
                          <span>{worker.isVerified ? 'Verified' : 'Verify'}</span>
                        </button>

                        {/* Ban / Unban Button */}
                        {isBanned ? (
                          <button
                            type="button"
                            onClick={() => handleUnban(worker)}
                            disabled={processingAction === worker.uid}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Unban</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBanModalTarget(worker)}
                            disabled={processingAction === worker.uid}
                            className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Ban user from workspace"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Ban</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* User Block/Unblock button */}
                    {!isTargetSelf && !isBanned && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (isBlocked) {
                            await unblockUser(worker.uid);
                          } else {
                            if (window.confirm(`Block @${worker.username || worker.displayName}? You will not receive direct messages from them.`)) {
                              await blockUser(worker.uid);
                            }
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isBlocked
                            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                            : 'bg-white border border-[#D9D9D0] text-[#7A7A70] hover:text-red-700 hover:bg-red-50'
                        }`}
                        title={isBlocked ? "Unblock contact" : "Block contact"}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{isBlocked ? 'Blocked' : 'Block'}</span>
                      </button>
                    )}

                    {/* Direct Message Action */}
                    {!isBanned && (
                      <button
                        onClick={() => handleStartDM(worker)}
                        className="px-3 py-2 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-[#D9D9D0] flex items-center justify-between text-[11px] text-[#8A8A80]">
          <span>{activeWorkers.length} total workers in directory</span>
          <span className="flex items-center gap-1 text-[#8DAA82]">
            <ShieldCheck className="w-3.5 h-3.5" />
            E2EE Cryptographic Identity
          </span>
        </div>
      </div>

      {/* BAN CONFIRMATION MODAL */}
      {banModalTarget && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-red-700">
                  Ban Workspace User
                </h4>
                <p className="text-xs text-red-500">
                  Restricts access for @{banModalTarget.username || banModalTarget.displayName}
                </p>
              </div>
            </div>

            <div className="text-xs text-[#4D4D4A] space-y-2">
              <p>
                As workspace Owner, you are revoking this user&apos;s ability to participate in encrypted channels and access shared files.
              </p>
              <div>
                <label className="block font-bold text-[#5A5A40] mb-1">
                  Reason for Ban:
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#D9D9D0] rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanModalTarget(null)}
                className="px-4 py-2 bg-[#E8E8E1] hover:bg-[#D9D9D0] text-[#2D2D2A] rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={processingAction === banModalTarget.uid}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Confirm Ban</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

