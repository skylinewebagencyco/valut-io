import React, { useState, useEffect, useRef } from 'react';
import { 
  FileLock2, 
  Download, 
  Search, 
  UploadCloud, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  FileCode, 
  Image as ImageIcon, 
  Clock, 
  User, 
  AtSign, 
  Plus,
  Menu
} from 'lucide-react';
import { 
  collection, 
  collectionGroup, 
  query, 
  onSnapshot, 
  where, 
  addDoc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Channel, EncryptedFileMetadata, EncryptedMessage } from '../types';
import { encryptFile, decryptFile } from '../lib/crypto';

interface FileVaultViewProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onMenuClick?: () => void;
}

export const FileVaultView: React.FC<FileVaultViewProps> = ({ channels, selectedChannelId, onMenuClick }) => {
  const { currentUser, logSecurityAudit } = useAuth();
  const [files, setFiles] = useState<Array<{ file: EncryptedFileMetadata; channelId: string; channelName: string }>>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [targetChannelId, setTargetChannelId] = useState<string>(selectedChannelId || (channels[0]?.id ?? 'strategy-sync'));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all messages with file attachments across channels
  useEffect(() => {
    if (channels.length === 0) return;

    const unsubs: Array<() => void> = [];

    channels.forEach((ch) => {
      const q = query(collection(db, 'channels', ch.id, 'messages'));
      const unsub = onSnapshot(q, (snap) => {
        setFiles((prev) => {
          // Remove previous files from this channel
          const other = prev.filter((f) => f.channelId !== ch.id);
          const newFiles: Array<{ file: EncryptedFileMetadata; channelId: string; channelName: string }> = [];

          snap.forEach((docSnap) => {
            const data = docSnap.data() as EncryptedMessage;
            if (data.file) {
              newFiles.push({
                file: data.file,
                channelId: ch.id,
                channelName: ch.name,
              });
            }
          });

          return [...other, ...newFiles].sort((a, b) => b.file.timestamp - a.file.timestamp);
        });
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [channels]);

  // Handle direct file upload & AES-256 encryption
  const handleFileUpload = async (file: File) => {
    if (!currentUser || !targetChannelId) return;

    setUploading(true);
    setUploadProgress(10);
    try {
      const encFile = await encryptFile(file, targetChannelId, (p) => setUploadProgress(p));

      const fileMeta: EncryptedFileMetadata = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: encFile.name,
        size: encFile.size,
        mimeType: encFile.mimeType,
        sha256Hash: encFile.sha256Hash,
        encryptedData: encFile.encryptedData,
        iv: encFile.iv,
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.displayName,
        uploadedByUsername: currentUser.username || currentUser.displayName,
        timestamp: Date.now(),
      };

      const messagesCol = collection(db, 'channels', targetChannelId, 'messages');
      await addDoc(messagesCol, {
        channelId: targetChannelId,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderUsername: currentUser.username || currentUser.displayName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarColor,
        ciphertext: '',
        iv: '',
        isEncrypted: true,
        file: fileMeta,
        reactions: {},
        createdAt: Date.now(),
      });

      await logSecurityAudit(
        'FILE_ENCRYPTED_AES256',
        `Uploaded & encrypted file ${file.name} to #${channels.find((c) => c.id === targetChannelId)?.name || 'channel'}`
      );
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Decrypt and Download File
  const handleDecryptDownload = async (item: { file: EncryptedFileMetadata; channelId: string }) => {
    try {
      setDownloadingId(item.file.id);
      const { blob, objectUrl, isHashValid } = await decryptFile(
        item.file.encryptedData,
        item.file.iv,
        item.channelId,
        item.file.sha256Hash,
        item.file.mimeType
      );

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = item.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      await logSecurityAudit(
        'FILE_DECRYPTED_VERIFIED',
        `Downloaded and decrypted file ${item.file.name}. Hash: ${isHashValid ? 'VERIFIED' : 'MISMATCH'}`
      );
    } catch (err) {
      console.error(err);
      alert('Failed to decrypt file payload.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = files.filter(
    (f) =>
      f.file.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.file.uploadedByName?.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.file.uploadedByUsername?.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.channelName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div id="file-vault-view" className="flex-1 flex flex-col h-full bg-[#F5F5F0] dark:bg-[#1A1A17] overflow-hidden transition-colors">
      {/* Header */}
      <header className="h-16 sm:h-20 bg-white/70 dark:bg-[#20201C]/80 backdrop-blur-md flex items-center justify-between px-3.5 sm:px-8 border-b border-[#D9D9D0] dark:border-[#353530] flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Open Navigation Menu"
              className="md:hidden w-9 h-9 flex items-center justify-center text-[#5A5A40] dark:text-[#E8E8E1] bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] hover:bg-[#E8E8E1] dark:hover:bg-[#2A2A25] rounded-xl transition-colors flex-shrink-0 shadow-2xs cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2D2D2A] dark:text-[#E8E8E1] truncate max-w-[170px] sm:max-w-none">
              Zero-Knowledge File Vault
            </h2>
            <p className="text-[10px] sm:text-xs text-[#8DAA82] flex items-center gap-1.5 font-medium mt-0.5 truncate">
              <span className="inline-block w-2 h-2 bg-[#8DAA82] rounded-full flex-shrink-0"></span>
              <span className="truncate">Client-encrypted AES-256-GCM & SHA-256</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload Encrypted File"
          className="w-9 h-9 sm:w-auto sm:px-4 sm:py-2 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-full text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
        >
          <UploadCloud className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Upload Encrypted File</span>
        </button>
      </header>

      {/* Hidden file picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Main Content Area */}
      <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6">
        {/* Upload Drop Zone Card */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`p-4 sm:p-6 border-2 border-dashed rounded-2xl sm:rounded-3xl text-center transition-all ${
            isDragOver
              ? 'border-[#5A5A40] bg-[#E8E8E1] dark:bg-[#2A2A25]'
              : 'border-[#D9D9D0] dark:border-[#353530] bg-[#FAF9F6] dark:bg-[#20201C] hover:border-[#8DAA82]'
          }`}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#8DAA82]/15 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center mx-auto">
              <FileLock2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h4 className="font-serif text-sm sm:text-base font-bold text-[#5A5A40] dark:text-[#E8E8E1]">
                Drag and drop confidential company files to encrypt
              </h4>
              <p className="text-[11px] sm:text-xs text-[#7A7A70] dark:text-[#A1A19A] mt-1">
                Files are sealed in the browser before hitting Firebase. Only verified company recipients can decrypt.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2">
              <label className="text-xs font-semibold text-[#5A5A40] dark:text-[#D1C7B7]">Select Target Channel:</label>
              <select
                value={targetChannelId}
                onChange={(e) => setTargetChannelId(e.target.value)}
                className="bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded-xl px-3 py-1.5 text-xs font-medium text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none w-full sm:w-auto"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            {uploadProgress !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-[#5A5A40] dark:text-[#D1C7B7] mb-1">
                  <span>Encrypting & Storing payload...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#D9D9D0] dark:bg-[#353530] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5A5A40] dark:bg-[#8DAA82] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A80]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by file name, @username, or channel..."
              className="w-full bg-white dark:bg-[#20201C] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#5A5A40] text-[#2D2D2A] dark:text-[#E8E8E1]"
            />
          </div>
          <span className="text-xs text-[#8A8A80] dark:text-[#A1A19A] font-medium">
            {filtered.length} encrypted {filtered.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {/* Files Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white/50 dark:bg-[#20201C]/50 rounded-3xl border border-[#E8E8E1] dark:border-[#353530] text-[#A1A19A] text-xs">
            No encrypted files found matching search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filtered.map((item) => (
              <div
                key={item.file.id}
                className="p-4 sm:p-5 bg-white dark:bg-[#20201C] border border-[#E8E8E1] dark:border-[#353530] rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-sm transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#8DAA82]/15 flex items-center justify-center text-[#5A5A40] dark:text-[#8DAA82] flex-shrink-0">
                      <FileLock2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono bg-[#E8E8E1] dark:bg-[#2A2A25] text-[#5A5A40] dark:text-[#D1C7B7] px-2 py-0.5 rounded-md font-semibold">
                      #{item.channelName}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-bold text-[#2D2D2A] dark:text-[#E8E8E1] truncate" title={item.file.name}>
                      {item.file.name}
                    </h4>
                    <p className="text-[11px] text-[#A1A19A] uppercase tracking-tighter mt-0.5">
                      {formatFileSize(item.file.size)} • AES-256-GCM
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E8E8E1] dark:border-[#353530] space-y-1.5 text-[11px] text-[#7A7A70] dark:text-[#A1A19A]">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8A8A80]" />
                      <span className="truncate">{item.file.uploadedByName}</span>
                      {item.file.uploadedByUsername && (
                        <span className="font-mono text-[#5A5A40] dark:text-[#D1C7B7] truncate">@{item.file.uploadedByUsername}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#8DAA82]">
                      <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">SHA-256: {item.file.sha256Hash?.substring(0, 16)}...</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDecryptDownload(item)}
                  disabled={downloadingId === item.file.id}
                  className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {downloadingId === item.file.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Verifying & Decrypting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Decrypt & Download</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
