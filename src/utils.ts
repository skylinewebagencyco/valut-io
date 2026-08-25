import { WorkerUser } from './types';

/**
 * Checks if a user is the designated workspace Owner (@therealjoshuaz)
 * Strictly grants the exclusive "Owner" badge and status only to @therealjoshuaz.
 */
export const isOwner = (user: Partial<WorkerUser> | { username?: string | null; email?: string | null; displayName?: string | null } | null | undefined): boolean => {
  if (!user) return false;
  const username = user.username?.toLowerCase().trim().replace(/^@/, '');
  const displayName = user.displayName?.toLowerCase().trim().replace(/^@/, '');
  const email = user.email?.toLowerCase().trim();
  
  return (
    username === 'therealjoshuaz' ||
    displayName === 'therealjoshuaz' ||
    email === 'josh.zelalem67@gmail.com'
  );
};

/**
 * Checks if a user has a Verified status.
 * Note: The workspace Owner is automatically verified by default.
 */
export const isUserVerified = (user: Partial<WorkerUser> | { isVerified?: boolean; username?: string | null; email?: string | null; displayName?: string | null } | null | undefined): boolean => {
  if (!user) return false;
  if (isOwner(user)) return true;
  return Boolean(user.isVerified);
};

/**
 * Compress an image file to a lightweight data URL (max 256x256 WebP or JPEG, ~20KB)
 * so it can be stored directly and cleanly in the user's Firestore profile without external storage requirements.
 */
export const compressImageFile = (file: File, maxSize = 256, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Optimizes an image for chat dispatching over AES-256 E2EE.
 * Resizes large camera photos (often 5MB - 12MB from phones) down to max 1400px width/height
 * and compresses to crisp JPEG/WebP under 450KB so it easily passes Firestore's 1MB document limit.
 */
export const optimizeImageForUpload = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If already tiny (e.g. small icon < 200KB), return as-is
  if (file.size <= 200 * 1024 && !file.type.includes('heic') && !file.type.includes('heif')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1280;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Fill background with white for transparency safety
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compress at 0.78 quality for ideal balance of sharpness and tiny payload (~150KB-350KB)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const optimizedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/jpeg',
          0.78
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

/**
 * Ringtone Synthesizer for Audio & Video Calling
 */
let ringtoneInterval: any = null;
let ringtoneAudioCtx: AudioContext | null = null;

export const startCallingRingtone = () => {
  stopCallingRingtone();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    ringtoneAudioCtx = new AudioContextClass();

    const playRingBurst = () => {
      if (!ringtoneAudioCtx || ringtoneAudioCtx.state === 'closed') return;
      
      const now = ringtoneAudioCtx.currentTime;
      const osc1 = ringtoneAudioCtx.createOscillator();
      const osc2 = ringtoneAudioCtx.createOscillator();
      const gain = ringtoneAudioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc1.frequency.setValueAtTime(480, now + 0.08); // B4

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(480, now);
      osc2.frequency.setValueAtTime(523.25, now + 0.08); // C5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.setValueAtTime(0.2, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ringtoneAudioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    };

    playRingBurst();
    ringtoneInterval = setInterval(playRingBurst, 2500);
  } catch (err) {
    console.warn('Ringtone playback error:', err);
  }
};

export const stopCallingRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneAudioCtx) {
    try {
      ringtoneAudioCtx.close();
    } catch {}
    ringtoneAudioCtx = null;
  }
};

export const playCallConnectTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {}
};

export const playCallEndTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(330, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
};

/**
 * Play high-fidelity synthesized notification chime
 */
export const playNotificationTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Smooth dual tone chime
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
};

/**
 * Text-to-speech announcement for incoming messages
 */
export const announceSpeech = (text: string) => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
};


