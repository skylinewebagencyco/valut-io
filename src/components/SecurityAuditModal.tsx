import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, Check, Copy, History, X, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { SecurityAuditEntry } from '../types';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, keyPair } = useAuth();
  const [logs, setLogs] = useState<SecurityAuditEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      const list: SecurityAuditEntry[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SecurityAuditEntry);
      });
      setLogs(list);
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyFingerprint = () => {
    if (keyPair?.fingerprint) {
      navigator.clipboard.writeText(keyPair.fingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F5F5F0] border border-[#D9D9D0] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-[#2D2D2A] flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D9D9D0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center font-serif text-lg font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#5A5A40]">
                Cryptographic Identity & Security Audit
              </h3>
              <p className="text-xs text-[#7A7A70]">
                Zero-knowledge Web Crypto API E2EE verification & immutable audit logs
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

        {/* Current User Key Pair Box */}
        <div className="py-4 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-[#E8E8E1] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#5A5A40]" />
                <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                  Your Public Key Fingerprint (SHA-256)
                </span>
              </div>
              <button
                onClick={handleCopyFingerprint}
                className="text-xs font-semibold text-[#5A5A40] hover:text-[#2D2D2A] flex items-center gap-1 bg-[#E8E8E1] px-2.5 py-1 rounded-lg cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#8DAA82]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="font-mono text-xs text-[#2D2D2A] bg-[#FAF9F6] p-3 rounded-xl border border-[#D9D9D0] tracking-wider break-all font-semibold">
              {keyPair?.fingerprint || currentUser?.keyFingerprint || 'Initializing cryptographic key...'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-[#7A7A70]">
              <div>
                <span className="text-[#8A8A80] block text-[10px] uppercase">Algorithm</span>
                <span className="font-semibold text-[#2D2D2A]">RSA-OAEP 2048-bit</span>
              </div>
              <div>
                <span className="text-[#8A8A80] block text-[10px] uppercase">Payload Cipher</span>
                <span className="font-semibold text-[#2D2D2A]">AES-256-GCM (Authenticated)</span>
              </div>
              <div>
                <span className="text-[#8A8A80] block text-[10px] uppercase">Workspace Handle</span>
                <span className="font-semibold text-[#5A5A40] font-mono">@{currentUser?.username || 'user'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Title */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#5A5A40]" />
            <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
              Real-Time Cryptographic Event Logs
            </span>
          </div>
          <span className="text-[10px] text-[#8DAA82] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8DAA82] animate-pulse" />
            Live Firestore Stream
          </span>
        </div>

        {/* Audit Log Items */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#A1A19A] bg-white rounded-2xl border border-[#E8E8E1]">
              No audit logs recorded yet.
            </div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-[#E8E8E1] rounded-2xl text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-[10px] bg-[#E8E8E1] text-[#5A5A40] px-2 py-0.5 rounded">
                      {item.eventType}
                    </span>
                    <span className="font-medium text-[#2D2D2A] font-mono">
                      NODE_{item.actorUid?.substring(0, 8) || 'XXXX'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A1A19A]">{formatTimestamp(item.timestamp)}</span>
                </div>
                <p className="text-[11px] text-[#4D4D4A] leading-normal">
                  {item.details
                    .replace(/file .* \(/, 'file [REDACTED] (')
                    .replace(/@[\w.-]+/g, '[REDACTED]')}
                </p>
                {item.channelOrTarget && (
                  <span className="text-[9px] text-[#8DAA82] font-semibold block">
                    Target: {item.channelOrTarget.startsWith('#') ? item.channelOrTarget : '[REDACTED]'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#D9D9D0] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
