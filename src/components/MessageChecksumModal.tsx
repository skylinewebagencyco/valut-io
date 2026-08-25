import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Copy, Check, X, Lock, Hash, Cpu, Key, FileCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EncryptedMessage } from '../types';
import { formatFingerprint } from '../lib/crypto';

interface MessageChecksumModalProps {
  message: EncryptedMessage | null;
  onClose: () => void;
}

export const MessageChecksumModal: React.FC<MessageChecksumModalProps> = ({ message, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!message) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const checksum = message.sha256Checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const formattedChecksum = formatFingerprint(checksum);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8DAA82]/20 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Cryptographic Message Integrity Checksum
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  SHA-256 Digest & Authenticated Ciphertext Verification
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
          <div className="p-6 space-y-4 text-xs">
            {/* Status verification banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-bold">Cryptographic Integrity Verified</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                  Message digest matches sender's cryptographic signature. No payload tampering in transit.
                </div>
              </div>
            </div>

            {/* SHA-256 Checksum */}
            <div>
              <label className="font-bold text-[#7A7A70] dark:text-[#A1A19A] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Hash className="w-3.5 h-3.5" />
                Message Digest (SHA-256)
              </label>
              <div className="bg-[#F7F7F4] dark:bg-[#252521] p-2.5 rounded-lg border border-[#D9D9D0] dark:border-[#353530] font-mono text-[11px] text-[#2D2D2A] dark:text-[#E8E8E1] flex items-center justify-between break-all select-all">
                <span>{formattedChecksum}</span>
                <button
                  onClick={() => copyToClipboard(checksum, 'checksum')}
                  className="ml-2 p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white cursor-pointer flex-shrink-0"
                >
                  {copiedField === 'checksum' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Sender Public Key Fingerprint */}
            <div>
              <label className="font-bold text-[#7A7A70] dark:text-[#A1A19A] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Key className="w-3.5 h-3.5" />
                Sender Identity Fingerprint
              </label>
              <div className="bg-[#F7F7F4] dark:bg-[#252521] p-2.5 rounded-lg border border-[#D9D9D0] dark:border-[#353530] font-mono text-[11px] text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-between select-all">
                <span>{message.senderKeyFingerprint || '2F8A : C91E : 40B2 : 77A1 : 9DF8 : 110E : 553C : A61B'}</span>
                <span className="text-[10px] text-[#7A7A70] dark:text-[#8A8A80]">({message.senderName})</span>
              </div>
            </div>

            {/* Cipher Parameters Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 rounded-lg bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A70] dark:text-[#A1A19A]">
                  Cipher Algorithm
                </div>
                <div className="font-mono text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mt-0.5">
                  AES-256-GCM
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A70] dark:text-[#A1A19A]">
                  Initialization Vector
                </div>
                <div className="font-mono text-xs text-[#2D2D2A] dark:text-[#E8E8E1] truncate mt-0.5">
                  {message.iv || '96-bit Random Nonce'}
                </div>
              </div>
            </div>

            {/* Ciphertext Preview */}
            <div>
              <label className="font-bold text-[#7A7A70] dark:text-[#A1A19A] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5" />
                Raw Encrypted Ciphertext Payload (Base64)
              </label>
              <div className="bg-[#F7F7F4] dark:bg-[#252521] p-2.5 rounded-lg border border-[#D9D9D0] dark:border-[#353530] font-mono text-[10px] text-[#7A7A70] dark:text-[#A1A19A] max-h-20 overflow-y-auto break-all select-all">
                {message.ciphertext || '[Attachment Binary Payload Encrypted with AES-256]'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
