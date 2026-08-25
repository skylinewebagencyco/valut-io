import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Users, Crown, Key, Lock, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkerUser, WorkplaceRoleType } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RolesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: WorkerUser[];
}

const ROLES_INFO: Record<WorkplaceRoleType, { label: string; desc: string; icon: any; color: string }> = {
  owner: {
    label: 'Workspace Owner',
    desc: 'Full administrative authority, security compliance audit control, role assignment, and key management',
    icon: Crown,
    color: 'text-amber-500',
  },
  security_admin: {
    label: 'Security Admin',
    desc: 'Can rotate workspace ratchet keys, audit security logs, and purge expired messages',
    icon: Key,
    color: 'text-[#8DAA82]',
  },
  member: {
    label: 'Full Team Member',
    desc: 'Standard worker access to create channels, exchange encrypted files, voice/video calls, and polls',
    icon: Users,
    color: 'text-[#5A5A40]',
  },
  guest: {
    label: 'Restricted Guest',
    desc: 'Read-only access to assigned public channels, direct encrypted messages only',
    icon: Lock,
    color: 'text-[#7A7A70]',
  },
};

export const RolesManagementModal: React.FC<RolesManagementModalProps> = ({ isOpen, onClose, workers }) => {
  const { currentUser, logSecurityAudit } = useAuth();
  const [selectedWorkerUid, setSelectedWorkerUid] = useState<string>(workers[0]?.uid || '');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const targetWorker = workers.find((w) => w.uid === selectedWorkerUid) || workers[0];
  const currentWorkerRole: WorkplaceRoleType = targetWorker?.workplaceRole || (targetWorker?.username === 'therealjoshuaz' ? 'owner' : 'member');

  const handleAssignRole = async (newRole: WorkplaceRoleType) => {
    if (!targetWorker) return;
    setUpdatingRole(true);
    try {
      await updateDoc(doc(db, 'users', targetWorker.uid), {
        workplaceRole: newRole,
      });

      await logSecurityAudit(
        'ROLE_CHANGED',
        `Assigned role ${ROLES_INFO[newRole].label} to ${targetWorker.displayName} (@${targetWorker.username})`
      );

      setSuccessMsg(`Role updated to ${ROLES_INFO[newRole].label}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Workplace Roles & RBAC Permissions
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  Configure role-based access control and security privileges for team members
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
            {/* Worker Selector */}
            <div>
              <label className="block font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-2">
                Select Team Member:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {workers.map((w) => (
                  <button
                    key={w.uid}
                    onClick={() => setSelectedWorkerUid(w.uid)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      selectedWorkerUid === w.uid
                        ? 'bg-[#5A5A40]/10 border-[#5A5A40] dark:bg-[#8DAA82]/10 dark:border-[#8DAA82]'
                        : 'bg-[#F7F7F4] dark:bg-[#252521] border-[#D9D9D0] dark:border-[#353530]'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full text-white font-semibold text-xs flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: w.avatarColor || '#5A5A40' }}
                    >
                      {w.displayName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] truncate">
                        {w.displayName}
                      </div>
                      <div className="text-[10px] text-[#7A7A70] dark:text-[#8A8A80] truncate">
                        @{w.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Worker Details */}
            {targetWorker && (
              <div className="p-4 rounded-xl bg-[#F0EFEB] dark:bg-[#282823] border border-[#D9D9D0] dark:border-[#3A3A34] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#7A7A70] dark:text-[#A1A19A]">
                    Current Active Role
                  </span>
                  <div className="font-bold text-[#2D2D2A] dark:text-[#E8E8E1] text-sm mt-0.5">
                    {ROLES_INFO[currentWorkerRole]?.label || 'Full Team Member'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#7A7A70] dark:text-[#A1A19A]">
                    Department
                  </span>
                  <div className="text-[#2D2D2A] dark:text-[#E8E8E1] font-medium">
                    {targetWorker.department || 'Security & Operations'}
                  </div>
                </div>
              </div>
            )}

            {/* Roles Matrix */}
            <div className="space-y-3">
              <div className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">
                Assign Workplace Privilege Level:
              </div>

              <div className="space-y-2.5">
                {(['owner', 'security_admin', 'member', 'guest'] as WorkplaceRoleType[]).map((roleKey) => {
                  const info = ROLES_INFO[roleKey];
                  const Icon = info.icon;
                  const isCurrent = currentWorkerRole === roleKey;

                  return (
                    <div
                      key={roleKey}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-[#8DAA82]/10 border-[#8DAA82]'
                          : 'bg-[#F7F7F4] dark:bg-[#252521] border-[#D9D9D0] dark:border-[#353530]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-white dark:bg-[#1A1A17] shadow-sm ${info.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#2D2D2A] dark:text-[#E8E8E1] flex items-center gap-2">
                            <span>{info.label}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#7A7A70] dark:text-[#A1A19A] mt-0.5">
                            {info.desc}
                          </div>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleAssignRole(roleKey)}
                          disabled={updatingRole}
                          className="px-3.5 py-1.5 rounded-lg bg-[#5A5A40] hover:bg-[#4A4A32] text-white font-medium text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0 ml-3"
                        >
                          Assign Role
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
