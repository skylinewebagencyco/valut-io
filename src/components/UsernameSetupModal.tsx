import React, { useState, useEffect, useRef } from 'react';
import { AtSign, Check, X, Shield, Sparkles, User, Briefcase, Building, AlertCircle, Crown, Upload, Trash2, Camera, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isOwner, isUserVerified, compressImageFile } from '../utils';
import { VerifiedBadge } from './VerifiedBadge';

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
}

const AVATAR_PALETTES = [
  { color: '#5A5A40', label: 'Deep Olive' },
  { color: '#8DAA82', label: 'Sage' },
  { color: '#D1C7B7', label: 'Warm Sand' },
  { color: '#7A7A70', label: 'Stone' },
  { color: '#4D4D4A', label: 'Charcoal' },
  { color: '#A39580', label: 'Clay' },
];

const DEPARTMENTS = [
  'Security & Infrastructure',
  'Core Engineering',
  'Product & UX Design',
  'Cloud Operations & DevOps',
  'Executive Leadership',
  'Legal & Compliance',
];

export const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const { currentUser, keyPair, saveUsernameAndProfile, checkUsernameAvailable } = useAuth();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Staff Engineer');
  const [department, setDepartment] = useState('Security & Infrastructure');
  const [avatarColor, setAvatarColor] = useState('#5A5A40');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.username) {
        setUsername(currentUser.username);
      } else if (currentUser.displayName) {
        // suggest default username from display name
        const suggested = currentUser.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '.')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '');
        setUsername(suggested || 'worker');
      }
      if (currentUser.role) setRole(currentUser.role);
      if (currentUser.department) setDepartment(currentUser.department);
      if (currentUser.avatarColor) setAvatarColor(currentUser.avatarColor);
      if (currentUser.photoURL) setPhotoURL(currentUser.photoURL);
      if (currentUser.bio) setBio(currentUser.bio);
    }
  }, [currentUser]);

  // Debounced username check
  useEffect(() => {
    const clean = username.trim().replace(/^@/, '');
    if (!clean || clean.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const available = await checkUsernameAvailable(clean);
        setIsAvailable(available);
      } catch (e) {
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);
      const compressedDataUrl = await compressImageFile(file, 256, 0.85);
      setPhotoURL(compressedDataUrl);
    } catch (err: any) {
      console.error('Photo upload compression error:', err);
      setError('Failed to process image. Please try another file.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().replace(/^@/, '');
    if (!clean || clean.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let finalRole = role.trim();
      const userIsOwner = isOwner({ ...currentUser, username: clean });

      if (!userIsOwner && (finalRole.toLowerCase().includes('owner') || clean.toLowerCase() === 'therealjoshuaz')) {
        if (clean.toLowerCase() === 'therealjoshuaz' && !userIsOwner) {
          setError('The username @therealjoshuaz is exclusively reserved for the workspace Owner.');
          setSubmitting(false);
          return;
        }
        finalRole = finalRole.replace(/owner/gi, 'Staff').trim() || 'Team Member';
      }

      await saveUsernameAndProfile(clean, finalRole, department, avatarColor, photoURL, bio.trim());
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save username profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const isVerifiedUser = isUserVerified({ ...currentUser, username });
  const isOwnerUser = isOwner({ ...currentUser, username });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F5F5F0] border border-[#D9D9D0] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl text-[#2D2D2A] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center font-serif text-lg font-bold">
              @
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#5A5A40]">
                {currentUser?.username ? 'Edit Worker Profile' : 'Choose Company Username'}
              </h2>
              <p className="text-xs text-[#7A7A70]">
                Customize your profile picture, verified badge, and @handle for encrypted comms.
              </p>
            </div>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#7A7A70] hover:text-[#2D2D2A] hover:bg-[#E8E8E1] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PROFILE PICTURE UPLOAD & PREVIEW */}
          <div className="bg-white p-4 rounded-2xl border border-[#D9D9D0] space-y-3">
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
              Profile Picture & Avatar
            </label>

            <div className="flex items-center gap-4">
              {/* Avatar Live Preview with Verified Checkmark and Owner Badge */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden border-2 border-white"
                  style={!photoURL ? { backgroundColor: avatarColor } : undefined}
                >
                  {photoURL ? (
                    <img src={photoURL} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>{username ? username.charAt(0).toUpperCase() : (currentUser?.displayName?.charAt(0) || 'W')}</span>
                  )}
                </div>

                {/* Verified Checkmark Badge next to Profile Pic */}
                {isVerifiedUser && (
                  <div className="absolute -bottom-1 -right-1 ring-2 ring-white rounded-full bg-white">
                    <VerifiedBadge size="sm" tooltip={isOwnerUser ? "Verified Workspace Owner" : "Verified Account"} />
                  </div>
                )}
              </div>

              {/* Upload Buttons */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3.5 py-2 bg-[#5A5A40] hover:bg-[#4A4A32] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{photoURL ? 'Upload New Photo' : 'Upload Profile Picture'}</span>
                  </button>

                  {photoURL && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 bg-[#E8E8E1] hover:bg-red-50 hover:text-red-600 text-[#7A7A70] rounded-xl text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#8A8A80]">
                  Supports PNG, JPG, or GIF from your device. Auto-resized & encrypted.
                </p>
              </div>
            </div>

            {/* Optional Image URL Input */}
            <div className="pt-2 border-t border-[#E8E8E1]/80">
              <div className="relative">
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="Or paste an image web URL (e.g. https://...)"
                  className="w-full bg-[#FAF9F6] border border-[#D9D9D0] rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#5A5A40] text-[#2D2D2A]"
                />
              </div>
            </div>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1.5">
              Unique Workplace Username
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#8A8A80] font-medium select-none">@</div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                placeholder="sarah.jenkins"
                className="w-full bg-white border border-[#D9D9D0] rounded-2xl pl-8 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:border-[#5A5A40] focus:ring-2 focus:ring-[#5A5A40]/10 transition-all text-[#2D2D2A]"
                required
                minLength={3}
                maxLength={30}
              />
              <div className="absolute right-3.5 flex items-center">
                {checking ? (
                  <div className="w-4 h-4 border-2 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" />
                ) : isAvailable === true ? (
                  <Check className="w-4 h-4 text-[#8DAA82]" />
                ) : isAvailable === false ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-[#8A8A80]">Allowed: Letters, numbers, dots, and hyphens</span>
              {isAvailable === true && (
                <span className="text-[#8DAA82] font-semibold">Available!</span>
              )}
              {isAvailable === false && (
                <span className="text-red-500 font-semibold">Username taken</span>
              )}
            </div>
          </div>

          {/* Role / Job Title */}
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1.5">
              Job Title / Role
            </label>
            <div className="relative">
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Senior Cryptography Specialist"
                className="w-full bg-white border border-[#D9D9D0] rounded-2xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#5A5A40] transition-all text-[#2D2D2A]"
                required
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1.5">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-white border border-[#D9D9D0] rounded-2xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#5A5A40] transition-all text-[#2D2D2A]"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Bio / About Status */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                Profile Bio & Status
              </label>
              <span className="text-[10px] font-mono text-[#8A8A80]">
                {bio.length}/200
              </span>
            </div>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="Tell your coworkers about your role, focus areas, or working hours (e.g. Lead cryptographer • E2EE protocols)"
                className="w-full bg-white border border-[#D9D9D0] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#5A5A40] transition-all text-[#2D2D2A] resize-none"
              />
            </div>
          </div>

          {/* Avatar Color Palette (for fallback initial avatar) */}
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-1.5">
              Fallback Initial Accent Color
            </label>
            <div className="flex items-center gap-3">
              {AVATAR_PALETTES.map((palette) => (
                <button
                  type="button"
                  key={palette.color}
                  onClick={() => setAvatarColor(palette.color)}
                  style={{ backgroundColor: palette.color }}
                  title={palette.label}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform cursor-pointer ${
                    avatarColor === palette.color ? 'ring-3 ring-offset-2 ring-[#5A5A40] scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {avatarColor === palette.color && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Cryptographic Key Fingerprint preview */}
          {keyPair && (
            <div className="bg-[#E8E8E1] rounded-2xl p-3 border border-[#D9D9D0]">
              <div className="flex items-center gap-1.5 text-xs text-[#5A5A40] font-semibold mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Verified Cryptographic RSA-2048 Identity</span>
              </div>
              <p className="font-mono text-[10px] text-[#4D4D4A] tracking-wider break-all">
                {keyPair.fingerprint}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || checking || isAvailable === false}
              className="w-full bg-[#5A5A40] hover:bg-[#4A4A32] text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-[#5A5A40]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Profile & Encrypting Keys...</span>
                </>
              ) : (
                <span>Save Profile & Enter Workspace</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

