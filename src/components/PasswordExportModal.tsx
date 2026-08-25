import React, { useState } from 'react';
import { Download, Lock, ShieldCheck, KeyRound, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EncryptedMessage, Channel } from '../types';
import { exportEncryptedArchive } from '../lib/crypto';
import { useAuth } from '../context/AuthContext';

interface PasswordExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: EncryptedMessage[];
  contextName: string;
}

export const PasswordExportModal: React.FC<PasswordExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  contextName,
}) => {
  const { currentUser, logSecurityAudit } = useAuth();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [exportFormat, setExportFormat] = useState<'encrypted_json' | 'secure_html'>('encrypted_json');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters for cryptographic security');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const exportPayload = {
        vaultVersion: '1.0.0',
        workspace: 'Valut.io Enterprise E2EE',
        context: contextName,
        exportedBy: currentUser?.displayName || 'Worker',
        exportedAt: Date.now(),
        totalMessages: messages.length,
        messages: messages.map((m) => ({
          id: m.id,
          senderName: m.senderName,
          senderUsername: m.senderUsername,
          createdAt: m.createdAt,
          decryptedText: m.decryptedText || '[Encrypted Content]',
          fileAttachment: m.file ? { name: m.file.name, size: m.file.size, hash: m.file.sha256Hash } : null,
          sha256Checksum: m.sha256Checksum,
        })),
      };

      if (exportFormat === 'encrypted_json') {
        const encryptedBlobStr = await exportEncryptedArchive(exportPayload, passphrase);
        const blob = new Blob([encryptedBlobStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `valut_encrypted_export_${contextName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.valut-archive`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Formatted Secure HTML document
        const encryptedBlobStr = await exportEncryptedArchive(exportPayload, passphrase);
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Valut.io Encrypted Audit Export - ${contextName}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #1A1A17; color: #E8E8E1; padding: 30px; }
    .card { background: #22221E; border: 1px solid #3A3A34; border-radius: 12px; padding: 24px; max-width: 800px; margin: auto; }
    h1 { font-family: serif; color: #E8E8E1; margin-top: 0; }
    .badge { background: #8DAA82; color: #1A1A17; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
    pre { background: #141412; padding: 16px; border-radius: 8px; font-size: 12px; overflow-x: auto; color: #8DAA82; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h1>🛡️ Valut.io Cryptographic Export</h1>
      <span class="badge">AES-256-GCM / PBKDF2 PROTECTED</span>
    </div>
    <p>Target Context: <strong>${contextName}</strong> | Messages: <strong>${messages.length}</strong></p>
    <p>Export Date: <strong>${new Date().toLocaleString()}</strong></p>
    <hr style="border-color:#3A3A34; margin: 20px 0;" />
    <h3>Encrypted Container Payload (PBKDF2-100k + AES-GCM):</h3>
    <pre>${encryptedBlobStr}</pre>
  </div>
</body>
</html>`;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `valut_audit_export_${contextName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      await logSecurityAudit(
        'FILE_ENCRYPTED_AES256',
        `Exported password-protected archive of ${messages.length} messages from ${contextName}`
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export encryption failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Password-Protected Export
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  Encrypt conversation transcript with PBKDF2 & AES-256
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

          <form onSubmit={handleExport} className="p-6 space-y-4 text-xs">
            {/* Format choice */}
            <div>
              <label className="block font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                Export Format:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('encrypted_json')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    exportFormat === 'encrypted_json'
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40] dark:bg-[#8DAA82] dark:text-[#1A1A17]'
                      : 'bg-[#F7F7F4] dark:bg-[#252521] border-[#D9D9D0] dark:border-[#353530] text-[#2D2D2A] dark:text-[#E8E8E1]'
                  }`}
                >
                  .valut-archive (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('secure_html')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    exportFormat === 'secure_html'
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40] dark:bg-[#8DAA82] dark:text-[#1A1A17]'
                      : 'bg-[#F7F7F4] dark:bg-[#252521] border-[#D9D9D0] dark:border-[#353530] text-[#2D2D2A] dark:text-[#E8E8E1]'
                  }`}
                >
                  Audit Bundle (.html)
                </button>
              </div>
            </div>

            {/* Passphrase inputs */}
            <div>
              <label className="block font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                Master Passphrase (min 8 chars):
              </label>
              <input
                type="password"
                placeholder="Enter strong encryption passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                Confirm Passphrase:
              </label>
              <input
                type="password"
                placeholder="Re-enter passphrase"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none"
              />
            </div>

            {error && <p className="text-rose-500">{error}</p>}
            {success && (
              <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Archive generated & downloaded successfully.
              </p>
            )}

            {/* Submit */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExporting}
                className="px-5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A32] text-white font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Encrypting Archive...' : 'Download Encrypted Archive'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
