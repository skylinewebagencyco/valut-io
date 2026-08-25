import React, { useState } from 'react';
import { ShieldCheck, Lock, FileLock2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth state: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to sign in with Google. Please check your popup permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (authMode === 'register' && !name) {
      setError('Name is required for registration.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (authMode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name, 'Staff Specialist');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || `Failed to ${authMode === 'login' ? 'sign in' : 'register'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5F0] dark:bg-[#1A1A17] text-[#2D2D2A] dark:text-[#E8E8E1] flex flex-col justify-center items-center p-6 select-none relative overflow-hidden transition-colors">
      {/* Subtle organic background elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E8E8E1] dark:bg-[#2A2A25] blur-3xl opacity-60 pointer-events-none transition-colors" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#D9D9D0] dark:bg-[#20201C] blur-3xl opacity-50 pointer-events-none transition-colors" />

      <div className="max-w-md w-full bg-[#F1F1EB] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] rounded-3xl p-8 sm:p-10 shadow-lg relative z-10 space-y-6 transition-colors">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#5A5A40] dark:bg-[#D1C7B7] rounded-2xl flex items-center justify-center text-white dark:text-[#252521] font-serif text-3xl shadow-sm mb-4 transition-colors">
            V
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#5A5A40] dark:text-[#E8E8E1] transition-colors">
            Valut.io
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#8A8A80] dark:text-[#A1A19A] font-bold mt-1">
            Enterprise Encrypted Workspace
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded-full text-xs text-[#5A5A40] dark:text-[#D1C7B7] transition-colors">
            <span className="w-2 h-2 rounded-full bg-[#8DAA82] animate-pulse"></span>
            <span>Real-Time AES-256-GCM + RSA E2EE</span>
          </div>
        </div>

        {/* Security Highlights */}
        <div className="bg-white dark:bg-[#1A1A17] rounded-2xl p-4 border border-[#E8E8E1] dark:border-[#353530] space-y-3 shadow-xs transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-[#8DAA82]/15 flex items-center justify-center flex-shrink-0 mt-0.5 text-[#5A5A40] dark:text-[#8DAA82]">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">End-to-End Encrypted Messaging</p>
              <p className="text-[11px] text-[#7A7A70] dark:text-[#A1A19A]">Messages are sealed on your device with AES-256 before Firebase sync.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 p-1 bg-[#E8E8E1] dark:bg-[#1A1A17] rounded-xl">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${authMode === 'login' ? 'bg-white dark:bg-[#252521] text-[#2D2D2A] dark:text-[#E8E8E1] shadow-sm' : 'text-[#7A7A70] dark:text-[#8A8A80]'}`}
          >
            Log In
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${authMode === 'register' ? 'bg-white dark:bg-[#252521] text-[#2D2D2A] dark:text-[#E8E8E1] shadow-sm' : 'text-[#7A7A70] dark:text-[#8A8A80]'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {authMode === 'register' && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#D1C7B7] transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Work Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#D1C7B7] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#D1C7B7] transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5A5A40] dark:bg-[#D1C7B7] hover:bg-[#4A4A32] dark:hover:bg-[#C2B7A5] active:scale-[0.99] text-white dark:text-[#252521] font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-sm font-semibold tracking-wide">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </span>
            )}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-[#D9D9D0] dark:border-[#353530]"></div>
          <span className="flex-shrink-0 mx-4 text-xs text-[#8A8A80] dark:text-[#A1A19A]">OR</span>
          <div className="flex-grow border-t border-[#D9D9D0] dark:border-[#353530]"></div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white dark:bg-[#1A1A17] border border-[#D9D9D0] dark:border-[#353530] hover:bg-[#F5F5F0] dark:hover:bg-[#20201C] active:scale-[0.99] text-[#2D2D2A] dark:text-[#E8E8E1] font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide">Continue with Google</span>
        </button>

        {/* Footer info */}
        <p className="text-center text-[10px] text-[#A1A19A] dark:text-[#7A7A70] pt-2 uppercase tracking-widest">
          Firebase Auth • Zero-Knowledge E2EE Database Storage
        </p>
      </div>
    </div>
  );
};
