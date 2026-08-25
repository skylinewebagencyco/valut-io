import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  RotateCw, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Lock, 
  History, 
  Cpu, 
  Calendar, 
  Check, 
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserKeyEpochs, 
  rotateUserKeyPair, 
  formatFingerprint, 
  calculateSha256,
  StoredEpochData 
} from '../lib/crypto';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface KeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyManagementModal: React.FC<KeyManagementModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, keyPair, logSecurityAudit } = useAuth();
  const [epochs, setEpochs] = useState<StoredEpochData['epochs']>([]);
  const [isRotating, setIsRotating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [rotationSuccess, setRotationSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const data = getUserKeyEpochs(currentUser.uid);
    if (data?.epochs && data.epochs.length > 0) {
      setEpochs(data.epochs);
    } else if (keyPair) {
      // Default initial epoch
      setEpochs([
        {
          epoch: 1,
          publicJwk: JSON.parse(keyPair.publicKeyJwk || '{}'),
          privateJwk: {} as any,
          fingerprint: keyPair.fingerprint,
          algorithm: 'RSA-OAEP-2048 / SHA-256 (P-256 ECDH Forward Ratchet)',
          createdAt: currentUser.createdAt || Date.now(),
          status: 'active',
        },
      ]);
    }
  }, [currentUser, keyPair]);

  const handleRotateKeys = async () => {
    if (!currentUser) return;
    setIsRotating(true);
    try {
      const newKey = await rotateUserKeyPair(currentUser.uid);
      
      // Update public key in Firestore users doc
      await updateDoc(doc(db, 'users', currentUser.uid), {
        publicKey: newKey.publicKeyJwk,
        keyFingerprint: newKey.fingerprint,
        lastSeen: Date.now(),
      });

      await logSecurityAudit(
        'CHANNEL_KEY_ROTATED',
        `Rotated cryptographic ECDH keypair to Epoch #${newKey.epochNumber} (${newKey.fingerprint})`
      );

      const refreshed = getUserKeyEpochs(currentUser.uid);
      if (refreshed?.epochs) {
        setEpochs(refreshed.epochs);
      }

      setRotationSuccess(true);
      setTimeout(() => setRotationSuccess(false), 3000);
    } catch (err) {
      console.error('Key rotation failed:', err);
    } finally {
      setIsRotating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/70 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Forward Secrecy & Key Rotation UI
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  Manage cryptographic key pair epochs, ratchet states, and public key fingerprints
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
            {/* Active Key Card */}
            <div className="p-5 rounded-xl bg-[#F0EFEB] dark:bg-[#282823] border border-[#D9D9D0] dark:border-[#3A3A34] relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#8DAA82]/20 text-[#5A5A40] dark:text-[#8DAA82] border border-[#8DAA82]/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Active Epoch #{epochs[0]?.epoch || 1}
                    </span>
                    <span className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                      Generated {new Date(epochs[0]?.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-mono text-sm font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mt-3">
                    Public Key Fingerprint (SHA-256):
                  </h3>
                  <div className="font-mono text-xs font-bold text-[#5A5A40] dark:text-[#8DAA82] tracking-wider mt-1 bg-white dark:bg-[#1A1A17] p-2.5 rounded-lg border border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between select-all">
                    <span>{epochs[0]?.fingerprint || keyPair?.fingerprint || 'GENERATING...'}</span>
                    <button
                      onClick={() => copyToClipboard(epochs[0]?.fingerprint || keyPair?.fingerprint || '', 'fp')}
                      className="ml-2 p-1 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-white cursor-pointer"
                      title="Copy Fingerprint"
                    >
                      {copiedKey === 'fp' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRotateKeys}
                  disabled={isRotating}
                  className="px-4 py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A32] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>{isRotating ? 'Rotating Ratchet...' : 'Rotate Key Now'}</span>
                </button>
              </div>

              {rotationSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-2 rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key pair rotated successfully. Public key updated in workspace registry.</span>
                </motion.div>
              )}
            </div>

            {/* Epoch History Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7A70] dark:text-[#A1A19A] mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Cryptographic Key Epoch Timeline
              </h3>

              <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D9D9D0] dark:before:bg-[#353530]">
                {epochs.map((ep, idx) => (
                  <div key={ep.epoch} className="flex items-start gap-4 relative pl-8">
                    <div
                      className={`absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-[#1E1E1B] ${
                        ep.status === 'active'
                          ? 'border-[#8DAA82] ring-2 ring-[#8DAA82]/30'
                          : 'border-[#7A7A70]'
                      }`}
                    />

                    <div className="flex-1 p-3.5 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-[#2D2D2A] dark:text-[#E8E8E1]">
                            Epoch #{ep.epoch}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              ep.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {ep.status === 'active' ? 'ACTIVE ENCRYPTION' : 'RETIRED / HISTORICAL'}
                          </span>
                        </div>
                        <span className="text-[#7A7A70] dark:text-[#8A8A80]">
                          {new Date(ep.createdAt).toLocaleDateString()} at{' '}
                          {new Date(ep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="mt-2 font-mono text-[11px] text-[#5A5A40] dark:text-[#A1A19A] flex items-center justify-between">
                        <span>Fingerprint: {ep.fingerprint}</span>
                        <button
                          onClick={() => copyToClipboard(ep.fingerprint, `fp_${ep.epoch}`)}
                          className="hover:text-[#2D2D2A] dark:hover:text-white cursor-pointer"
                        >
                          {copiedKey === `fp_${ep.epoch}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Standards Box */}
            <div className="p-4 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#7A7A70] dark:text-[#A1A19A] space-y-2">
              <div className="font-bold text-[#2D2D2A] dark:text-[#E8E8E1] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#8DAA82]" />
                Zero-Trust Forward Secrecy Guarantee
              </div>
              <p>
                Each key rotation generates a fresh ephemeral keypair. Past communications remain undecryptable even in the event of a future key compromise. All symmetric keys are derived using PBKDF2 with 100,000 iterations and authenticated AES-GCM-256.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
