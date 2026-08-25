import React from 'react';
import { 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  FileLock2, 
  History, 
  KeyRound, 
  UserCheck, 
  Lock,
  Search,
  Key,
  Shield,
  Fingerprint,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationRailProps {
  currentView: 'chat' | 'files' | 'audit' | 'keys';
  onSelectView: (view: 'chat' | 'files' | 'audit' | 'keys') => void;
  onOpenWorkerModal: () => void;
  onOpenKeyModal: () => void;
  onOpenKeyRotation?: () => void;
  onOpenRoles?: () => void;
  onOpenSearch?: () => void;
  onLockScreen?: () => void;
  onOpenPinConfig?: () => void;
  onOpenNotificationSettings?: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentView,
  onSelectView,
  onOpenWorkerModal,
  onOpenKeyModal,
  onOpenKeyRotation,
  onOpenRoles,
  onOpenSearch,
  onLockScreen,
  onOpenPinConfig,
  onOpenNotificationSettings,
}) => {
  const { currentUser } = useAuth();

  return (
    <nav
      id="navigation-rail"
      className="w-20 bg-[#E8E8E1] dark:bg-[#1A1A17] flex flex-col items-center py-6 gap-4 border-r border-[#D9D9D0] dark:border-[#353530] select-none z-20 flex-shrink-0 transition-colors"
    >
      {/* Brand Icon V */}
            <button
        id="nav-brand-logo"
        onClick={() => onSelectView('chat')}
        title="Valut.io Workplace E2EE"
        className="w-12 h-12 bg-[#4A3A35] hover:bg-[#3D2F2A] transition-all rounded-2xl flex items-center justify-center shadow-sm cursor-pointer group"
      >
        <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#A7B3BA]" fill="currentColor">
          <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0Zm0 14c19.9 0 36 16.1 36 36S69.9 86 50 86 14 69.9 14 50 30.1 14 50 14Z" />
          <path d="M72.5 31c-3-8-10.5-13-19.5-13-11.6 0-21 9.4-21 21 0 16.5 25 14.5 25 27 0 5-4 9-9 9-6.5 0-12-4-15-10l-12 7c5 11 16 19 30 19 11.6 0 21-9.4 21-21 0-16.5-25-14.5-25-27 0-5 4-9 9-9 6.5 0 12 4 15 10l11.5-7Z" />
        </svg>
      </button>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2.5 mt-2 w-full items-center">
        {/* Global Search Shortcut */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            title="Global Search Channels & Coworkers (Cmd+K)"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] transition-all cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        <button
          id="nav-view-chat"
          onClick={() => onSelectView('chat')}
          title="Encrypted Channels & DMs"
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            currentView === 'chat'
              ? 'bg-white dark:bg-[#252521] text-[#5A5A40] dark:text-[#E8E8E1] shadow-sm font-semibold'
              : 'text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1]'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          id="nav-view-files"
          onClick={() => onSelectView('files')}
          title="Encrypted Files Vault"
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            currentView === 'files'
              ? 'bg-white dark:bg-[#252521] text-[#5A5A40] dark:text-[#E8E8E1] shadow-sm font-semibold'
              : 'text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1]'
          }`}
        >
          <FileLock2 className="w-5 h-5" />
        </button>

        {/* Forward Secrecy Key Rotation Timeline */}
        {onOpenKeyRotation && (
          <button
            onClick={onOpenKeyRotation}
            title="Forward Secrecy Key Epochs & Ratchet"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] transition-all cursor-pointer"
          >
            <Key className="w-5 h-5" />
          </button>
        )}

        {/* Workplace Roles & Permissions */}
        {onOpenRoles && (
          <button
            onClick={onOpenRoles}
            title="Workplace Roles & Permissions (RBAC)"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] transition-all cursor-pointer"
          >
            <Shield className="w-5 h-5" />
          </button>
        )}

        <button
          id="nav-view-audit"
          onClick={() => onSelectView('audit')}
          title="Security & Decryption Audit Log"
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            currentView === 'audit'
              ? 'bg-white dark:bg-[#252521] text-[#5A5A40] dark:text-[#E8E8E1] shadow-sm font-semibold'
              : 'text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1]'
          }`}
        >
          <History className="w-5 h-5" />
        </button>

        {/* Notification Settings */}
        {onOpenNotificationSettings && (
          <button
            onClick={onOpenNotificationSettings}
            title="Notification & Sound Settings"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#7A7A70] dark:text-[#8A8A80] hover:bg-[#D9D9D0]/70 dark:hover:bg-[#20201C] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] transition-all cursor-pointer"
          >
            <Bell className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Footer User Avatar & Quick Switcher */}
      <div className="mt-auto flex flex-col items-center gap-3">
        {/* Lock Settings */}
        {onOpenPinConfig && (
          <button
            onClick={onOpenPinConfig}
            title="Configure Screen Lock & PIN"
            className="w-9 h-9 rounded-full bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] flex items-center justify-center text-[#7A7A70] dark:text-[#A1A19A] hover:text-[#5A5A40] dark:hover:text-[#E8E8E1] transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {/* Quick Lock Screen */}
        {onLockScreen && (
          <button
            onClick={onLockScreen}
            title="Lock Valut with PIN / WebAuthn"
            className="w-9 h-9 rounded-full bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] flex items-center justify-center text-[#7A7A70] dark:text-[#A1A19A] hover:text-rose-500 transition-colors cursor-pointer"
          >
            <Fingerprint className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          title="Toggle Dark Mode"
          className="w-9 h-9 rounded-full bg-white dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] flex items-center justify-center text-[#5A5A40] dark:text-[#E8E8E1] hover:bg-[#F5F5F0] dark:hover:bg-[#20201C] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 hidden dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <svg className="w-4 h-4 block dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>

        <button
          id="nav-user-profile-button"
          onClick={onOpenWorkerModal}
          title={`Active Worker: ${currentUser?.displayName || 'User'} (${currentUser?.role || 'Team Member'}). Click to switch worker.`}
          className="relative w-11 h-11 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:scale-105 transition-transform"
          style={!currentUser?.photoURL ? { backgroundColor: currentUser?.avatarColor || '#5A5A40' } : undefined}
        >
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}</span>
          )}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              currentUser?.status === 'online'
                ? 'bg-[#8DAA82]'
                : currentUser?.status === 'busy'
                ? 'bg-amber-500'
                : 'bg-[#A1A19A]'
            }`}
          />
        </button>
      </div>
    </nav>
  );
};
