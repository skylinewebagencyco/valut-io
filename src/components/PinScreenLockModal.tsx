import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, Fingerprint, Delete, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { hashPin } from '../lib/crypto';

interface PinScreenLockModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  onCloseSettings?: () => void;
  isConfiguringPin?: boolean;
}

type Mode = 'unlock' | 'setup' | 'reset_verify' | 'reset_new';

export const PinScreenLockModal: React.FC<PinScreenLockModalProps> = ({
  isLocked,
  onUnlock,
  isConfiguringPin = false,
  onCloseSettings,
}) => {
  const { currentUser, updateUserPin } = useAuth();
  
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [autoLockDuration, setAutoLockDuration] = useState<number>(() => {
    return parseInt(localStorage.getItem('vault_screenlock_minutes') || '15', 10);
  });
  
  const [mode, setMode] = useState<Mode>('unlock');

  useEffect(() => {
    if (isConfiguringPin) {
      if (currentUser?.pinHash) {
        setMode('reset_verify');
      } else {
        setMode('setup');
      }
    } else if (isLocked) {
      if (!currentUser?.pinHash) {
        setMode('setup');
      } else {
        setMode('unlock');
      }
    }
  }, [isLocked, isConfiguringPin, currentUser?.pinHash]);

  const expectedLength = mode === 'unlock' || mode === 'reset_verify' ? 4 : 4; // Setup expects 4-6 but we can just use an enter key or auto-submit on 4

  const handleDigit = async (digit: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + digit;
      setPinInput(next);
      setErrorMsg('');

      if (mode === 'unlock' || mode === 'reset_verify') {
        if (next.length === 4) {
          await verifyPin(next);
        }
      } else if (mode === 'setup' || mode === 'reset_new') {
        if (next.length === 4 && !isConfiguringPin) {
          // If just locking for the first time, auto-submit at 4
          await handleSave(next);
        }
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyPin = async (input: string) => {
    if (!currentUser?.pinHash) return;
    
    const hashed = await hashPin(input);
    if (hashed === currentUser.pinHash) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPinInput('');
        if (mode === 'unlock') {
          onUnlock();
        } else if (mode === 'reset_verify') {
          setMode('reset_new');
        }
      }, 300);
    } else {
      setShake(true);
      setErrorMsg('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setShake(false);
        setPinInput('');
      }, 500);
    }
  };

  const handleSave = async (inputToSave: string = pinInput) => {
    if (inputToSave.length < 4) {
      setErrorMsg('PIN must be at least 4 digits');
      return;
    }
    const hashed = await hashPin(inputToSave);
    await updateUserPin(hashed);
    localStorage.setItem('vault_screenlock_minutes', autoLockDuration.toString());
    
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setPinInput('');
      if (isConfiguringPin && onCloseSettings) {
        onCloseSettings();
      } else {
        onUnlock(); // if they were just locking and forced to setup
      }
    }, 400);
  };

  useEffect(() => {
    if (!isLocked && !isConfiguringPin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && (mode === 'setup' || mode === 'reset_new')) {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, isConfiguringPin, pinInput, mode, autoLockDuration]);

  if (!isLocked && !isConfiguringPin) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#1A1A17]/85 backdrop-blur-xl flex items-center justify-center p-4 select-none"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: shake ? [-10, 10, -10, 10, 0] : 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-sm bg-[#22221E] border border-[#3A3A34] rounded-2xl shadow-2xl p-7 text-center relative flex flex-col items-center"
        >
          {isConfiguringPin && onCloseSettings && (
            <button
              onClick={onCloseSettings}
              className="absolute top-4 right-4 p-2 text-[#8A8A80] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-14 h-14 rounded-2xl bg-[#5A5A40]/40 border border-[#8DAA82]/30 flex items-center justify-center mb-4 text-[#8DAA82]">
            {isSuccess ? <CheckCircle2 className="w-7 h-7 text-emerald-400" /> : <Lock className="w-7 h-7" />}
          </div>

          <h2 className="text-xl font-serif font-bold text-[#E8E8E1] tracking-tight">
            {mode === 'setup' && 'Create App PIN'}
            {mode === 'reset_verify' && 'Reset PIN'}
            {mode === 'reset_new' && 'Enter New PIN'}
            {mode === 'unlock' && 'Valut.io Locked'}
          </h2>
          <p className="text-xs text-[#A1A19A] mt-1 mb-6">
            {mode === 'setup' && 'Set a 4-6 digit PIN to lock this device.'}
            {mode === 'reset_verify' && 'Enter your old 4-digit PIN first.'}
            {mode === 'reset_new' && 'Enter a new 4-6 digit PIN.'}
            {mode === 'unlock' && 'Enter your 4-digit master PIN to resume.'}
          </p>

          <div className="flex gap-3 justify-center mb-6 h-3.5">
            {Array.from({ length: Math.max(4, pinInput.length) }).map((_, idx) => {
              const isFilled = idx < pinInput.length;
              return (
                <motion.div
                  key={idx}
                  animate={{
                    scale: isFilled ? 1.15 : 1,
                    backgroundColor: isSuccess ? '#10B981' : isFilled ? '#8DAA82' : '#3A3A34',
                  }}
                  className={`w-3.5 h-3.5 rounded-full border border-[#4A4A42] transition-colors`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-1.5 rounded-lg mb-4">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="h-12 rounded-xl bg-[#2C2C26] hover:bg-[#383832] active:scale-95 text-[#E8E8E1] font-mono text-lg font-semibold border border-[#3A3A34] transition-all flex items-center justify-center cursor-pointer shadow-sm"
              >
                {digit}
              </button>
            ))}
            
            {(mode === 'setup' || mode === 'reset_new') ? (
              <button
                onClick={() => handleSave()}
                className="h-12 rounded-xl bg-[#8DAA82]/10 hover:bg-[#8DAA82]/20 text-[#8DAA82] border border-[#8DAA82]/30 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
              >
                Save
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-[#2C2C26] hover:bg-[#383832] active:scale-95 text-[#E8E8E1] font-mono text-lg font-semibold border border-[#3A3A34] transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              0
            </button>

            <button
              onClick={handleDelete}
              className="h-12 rounded-xl bg-[#2C2C26] hover:bg-[#383832] active:scale-95 text-[#A1A19A] hover:text-white border border-[#3A3A34] transition-all flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {isConfiguringPin && (
            <div className="w-full mt-2 pt-4 border-t border-[#3A3A34] flex flex-col gap-3 text-left">
              <label className="text-xs font-semibold text-[#D1C7B7]">
                Inactivity Auto-Lock Timer:
              </label>
              <select
                value={autoLockDuration}
                onChange={(e) => setAutoLockDuration(parseInt(e.target.value, 10))}
                className="bg-[#2C2C26] text-[#E8E8E1] text-xs border border-[#4A4A42] rounded-lg p-2 focus:outline-none focus:border-[#8DAA82]"
              >
                <option value={1}>1 Minute Inactivity</option>
                <option value={5}>5 Minutes Inactivity (Recommended)</option>
                <option value={15}>15 Minutes Inactivity</option>
                <option value={30}>30 Minutes Inactivity</option>
                <option value={0}>Immediately on Window Blur</option>
              </select>
            </div>
          )}

          {!isConfiguringPin && (
            <div className="flex items-center gap-2 mt-2 text-[11px] text-[#7A7A70]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8DAA82]" />
              <span>AES-256 Memory Guard & E2EE Ratchet Protected</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
