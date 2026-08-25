import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Bell, 
  Volume2, 
  Sparkles, 
  Smartphone,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { NotificationSettings } from '../types';
import { playNotificationTone, announceSpeech } from '../utils';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onSendTestNotification: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSendTestNotification,
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'bannerStyle' | 'announce' | 'showPreviews' | 'grouping'>('none');
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const toggleMaster = () => {
    const updated = { ...settings, allowNotifications: !settings.allowNotifications };
    onUpdateSettings(updated);
    if (!settings.allowNotifications) {
      playNotificationTone();
      requestBrowserPermission();
    }
  };

  const updateField = <K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) => {
    const updated = { ...settings, [field]: value };
    onUpdateSettings(updated);
  };

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
      } catch (e) {
        console.error('Permission request failed', e);
      }
    }
  };

  const handleTestAlert = () => {
    setTestSent(true);
    onSendTestNotification();
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* iOS Settings Dark Theme Outer Container */}
      <div 
        id="ios-notification-settings"
        className="w-full max-w-md bg-[#000000] text-white rounded-[38px] border border-[#2C2C2E] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] select-none"
      >
        {/* iOS Top Navigation Bar */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1C1C1E] bg-[#000000] sticky top-0 z-10">
          <button
            onClick={() => {
              if (activeSubmenu !== 'none') {
                setActiveSubmenu('none');
              } else {
                onClose();
              }
            }}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#0A84FF] active:scale-95 transition-all cursor-pointer"
            title="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          <div className="text-center">
            <h2 className="text-base font-semibold text-white tracking-tight">
              {activeSubmenu === 'none' ? 'Valut.io Notifications' : 
               activeSubmenu === 'bannerStyle' ? 'Banner Style' :
               activeSubmenu === 'announce' ? 'Announce' :
               activeSubmenu === 'showPreviews' ? 'Show Previews' : 'Grouping'}
            </h2>
            <p className="text-[10px] text-[#8E8E93] font-medium tracking-wide">E2EE Alert Center</p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Body */}
        <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {activeSubmenu === 'none' ? (
            <>
              {/* Master Toggle Card: Allow Notifications */}
              <div className="bg-[#1C1C1E] rounded-2xl px-4 py-3.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-white">Allow Notifications</span>
                  <p className="text-[11px] text-[#8E8E93]">Deliver instant E2EE alerts for DMs & channels</p>
                </div>
                <button
                  type="button"
                  onClick={toggleMaster}
                  aria-pressed={settings.allowNotifications}
                  className={`w-13 h-7.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    settings.allowNotifications ? 'bg-[#34C759]' : 'bg-[#3A3A3C]'
                  }`}
                >
                  <div
                    className={`w-6.5 h-6.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      settings.allowNotifications ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Browser Permission Prompt if Default / Denied */}
              {permissionState !== 'granted' && settings.allowNotifications && (
                <div className="bg-[#1C1C1E] border border-[#0A84FF]/40 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-[#0A84FF] animate-pulse flex-shrink-0" />
                    <div className="text-[11px]">
                      <p className="font-semibold text-white">Browser Notifications Required</p>
                      <p className="text-[#8E8E93]">Grant system permission for OS lock screen alerts</p>
                    </div>
                  </div>
                  <button
                    onClick={requestBrowserPermission}
                    className="px-3 py-1.5 bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-semibold rounded-full flex-shrink-0 cursor-pointer shadow-sm active:scale-95"
                  >
                    Enable
                  </button>
                </div>
              )}

              {/* ALERTS SECTION (Pixel-perfect recreation of reference screenshot) */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-3 mb-2">
                  Alerts
                </p>
                
                <div className="bg-[#1C1C1E] rounded-3xl p-4 space-y-5">
                  {/* 3 Phone Mockups */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {/* 1. Lock Screen Mockup */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('lockScreenAlerts', !settings.lockScreenAlerts)}
                        className={`w-20 h-36 rounded-2xl border-2 p-1.5 flex flex-col justify-between transition-all cursor-pointer ${
                          settings.lockScreenAlerts 
                            ? 'border-[#0A84FF] bg-[#001A33]/40 shadow-[0_0_15px_rgba(10,132,255,0.25)]' 
                            : 'border-[#3A3A3C] bg-[#121214] opacity-50'
                        }`}
                      >
                        {/* Top status bar & time */}
                        <div className="w-full flex flex-col items-center">
                          <div className="w-7 h-1 bg-[#2C2C2E] rounded-full mb-1"></div>
                          <span className="text-[10px] font-semibold text-[#0A84FF] tracking-tight">9:41</span>
                        </div>

                        {/* Lock Screen Notification Box */}
                        <div className="w-full bg-[#0A84FF] rounded-lg p-1.5 flex flex-col gap-0.5 shadow-sm">
                          <div className="w-full h-1.5 bg-white/80 rounded-full"></div>
                          <div className="w-3/4 h-1 bg-white/50 rounded-full"></div>
                        </div>
                      </button>

                      <span className="text-[11px] font-medium text-white text-center">Lock Screen</span>

                      {/* Blue Checkmark Circle */}
                      <button
                        type="button"
                        onClick={() => updateField('lockScreenAlerts', !settings.lockScreenAlerts)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          settings.lockScreenAlerts
                            ? 'bg-[#0A84FF] text-white shadow-sm'
                            : 'border-2 border-[#3A3A3C] bg-transparent text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* 2. Notification Center Mockup */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('notificationCenterAlerts', !settings.notificationCenterAlerts)}
                        className={`w-20 h-36 rounded-2xl border-2 p-1.5 flex flex-col justify-between transition-all cursor-pointer ${
                          settings.notificationCenterAlerts 
                            ? 'border-[#0A84FF] bg-[#001A33]/40 shadow-[0_0_15px_rgba(10,132,255,0.25)]' 
                            : 'border-[#3A3A3C] bg-[#121214] opacity-50'
                        }`}
                      >
                        <div className="w-full flex justify-center">
                          <div className="w-7 h-1 bg-[#2C2C2E] rounded-full"></div>
                        </div>

                        {/* Stacked notification stripes */}
                        <div className="w-full space-y-1.5 py-1">
                          <div className="w-full h-3 bg-[#0A84FF] rounded-md flex items-center px-1">
                            <div className="w-full h-1 bg-white/70 rounded-full"></div>
                          </div>
                          <div className="w-full h-3 bg-[#0A84FF] rounded-md flex items-center px-1">
                            <div className="w-full h-1 bg-white/70 rounded-full"></div>
                          </div>
                          <div className="w-full h-3 bg-[#0A84FF] rounded-md flex items-center px-1">
                            <div className="w-full h-1 bg-white/70 rounded-full"></div>
                          </div>
                          <div className="w-full h-3 bg-[#0A84FF]/60 rounded-md flex items-center px-1">
                            <div className="w-3/4 h-1 bg-white/50 rounded-full"></div>
                          </div>
                        </div>

                        <div className="w-full h-1"></div>
                      </button>

                      <span className="text-[11px] font-medium text-white text-center leading-tight">Notification Center</span>

                      {/* Blue Checkmark Circle */}
                      <button
                        type="button"
                        onClick={() => updateField('notificationCenterAlerts', !settings.notificationCenterAlerts)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          settings.notificationCenterAlerts
                            ? 'bg-[#0A84FF] text-white shadow-sm'
                            : 'border-2 border-[#3A3A3C] bg-transparent text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* 3. Banners Mockup */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('bannerAlerts', !settings.bannerAlerts)}
                        className={`w-20 h-36 rounded-2xl border-2 p-1.5 flex flex-col justify-between transition-all cursor-pointer ${
                          settings.bannerAlerts 
                            ? 'border-[#0A84FF] bg-[#001A33]/40 shadow-[0_0_15px_rgba(10,132,255,0.25)]' 
                            : 'border-[#3A3A3C] bg-[#121214] opacity-50'
                        }`}
                      >
                        {/* Top banner pill */}
                        <div className="w-full flex flex-col items-center gap-1.5">
                          <div className="w-7 h-1 bg-[#2C2C2E] rounded-full"></div>
                          <div className="w-full bg-[#0A84FF] rounded-lg p-1 flex items-center justify-between">
                            <div className="w-2 h-2 rounded-full bg-white/90"></div>
                            <div className="w-10 h-1 bg-white/80 rounded-full"></div>
                          </div>
                        </div>

                        <div className="w-full h-1"></div>
                      </button>

                      <span className="text-[11px] font-medium text-white text-center">Banners</span>

                      {/* Blue Checkmark Circle */}
                      <button
                        type="button"
                        onClick={() => updateField('bannerAlerts', !settings.bannerAlerts)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          settings.bannerAlerts
                            ? 'bg-[#0A84FF] text-white shadow-sm'
                            : 'border-2 border-[#3A3A3C] bg-transparent text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#2C2C2E] -mx-4" />

                  {/* Sub Settings within Alerts Card */}
                  <div className="space-y-4 pt-1">
                    {/* Banner Style */}
                    <button
                      type="button"
                      onClick={() => setActiveSubmenu('bannerStyle')}
                      className="w-full flex items-center justify-between text-left cursor-pointer group"
                    >
                      <span className="text-sm font-medium text-white">Banner Style</span>
                      <div className="flex items-center gap-1.5 text-[#8E8E93] group-hover:text-white transition-colors">
                        <span className="text-sm capitalize">{settings.bannerStyle}</span>
                        <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
                      </div>
                    </button>

                    <div className="h-px bg-[#2C2C2E] -mx-4" />

                    {/* Sounds Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Sounds</span>
                        <button
                          type="button"
                          onClick={() => playNotificationTone()}
                          title="Preview sound chime"
                          className="p-1 hover:bg-[#2C2C2E] rounded-full text-[#0A84FF] cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = !settings.sounds;
                          updateField('sounds', val);
                          if (val) playNotificationTone();
                        }}
                        aria-pressed={settings.sounds}
                        className={`w-13 h-7.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          settings.sounds ? 'bg-[#34C759]' : 'bg-[#3A3A3C]'
                        }`}
                      >
                        <div
                          className={`w-6.5 h-6.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                            settings.sounds ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="h-px bg-[#2C2C2E] -mx-4" />

                    {/* Badges Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Badges</span>
                      <button
                        type="button"
                        onClick={() => updateField('badges', !settings.badges)}
                        aria-pressed={settings.badges}
                        className={`w-13 h-7.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          settings.badges ? 'bg-[#34C759]' : 'bg-[#3A3A3C]'
                        }`}
                      >
                        <div
                          className={`w-6.5 h-6.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                            settings.badges ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ANNOUNCE SECTION */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-3 mb-2">
                  Announce
                </p>
                <div className="bg-[#1C1C1E] rounded-3xl p-4">
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu('announce')}
                    className="w-full flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="text-sm font-medium text-white">Announce Notifications</span>
                    <div className="flex items-center gap-1.5 text-[#8E8E93] group-hover:text-white transition-colors">
                      <span className="text-sm capitalize">{settings.announce === 'off' ? 'Off' : 'Spoken Voice'}</span>
                      <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
                    </div>
                  </button>
                </div>
              </div>

              {/* LOCK SCREEN APPEARANCE SECTION */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-3 mb-2">
                  Lock Screen Appearance
                </p>
                <div className="bg-[#1C1C1E] rounded-3xl p-4 space-y-4">
                  {/* Show Previews */}
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu('showPreviews')}
                    className="w-full flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div>
                      <span className="text-sm font-medium text-white block">Show Previews</span>
                      <span className="text-[11px] text-[#8E8E93]">
                        {settings.showPreviews === 'when_unlocked' ? 'When Unlocked (Default)' : 
                         settings.showPreviews === 'always' ? 'Always' : 'Never'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                  </button>

                  <div className="h-px bg-[#2C2C2E] -mx-4" />

                  {/* Notification Grouping */}
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu('grouping')}
                    className="w-full flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="text-sm font-medium text-white">Notification Grouping</span>
                    <div className="flex items-center gap-1.5 text-[#8E8E93] group-hover:text-white transition-colors">
                      <span className="text-sm capitalize">{settings.grouping.replace('_', ' ')}</span>
                      <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
                    </div>
                  </button>
                </div>
              </div>

              {/* ACTION: Send Live Test Notification */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={!settings.allowNotifications}
                  className="w-full py-3.5 bg-[#0A84FF] hover:bg-[#0071E3] disabled:opacity-30 disabled:hover:bg-[#0A84FF] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>{testSent ? 'Alert Dispatched!' : 'Send Test Notification'}</span>
                </button>
                <p className="text-[10px] text-[#8E8E93] text-center mt-2">
                  Plays tone, shows in-app banner, updates badge, and dispatches native alert.
                </p>
              </div>
            </>
          ) : activeSubmenu === 'bannerStyle' ? (
            /* Submenu: Banner Style */
            <div className="bg-[#1C1C1E] rounded-3xl p-2 space-y-1">
              <button
                onClick={() => {
                  updateField('bannerStyle', 'temporary');
                  setActiveSubmenu('none');
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
              >
                <div>
                  <span className="text-sm font-semibold text-white block">Temporary</span>
                  <span className="text-xs text-[#8E8E93]">Banners show briefly and dismiss after 5 seconds</span>
                </div>
                {settings.bannerStyle === 'temporary' && <Check className="w-5 h-5 text-[#0A84FF]" />}
              </button>

              <div className="h-px bg-[#2C2C2E]" />

              <button
                onClick={() => {
                  updateField('bannerStyle', 'persistent');
                  setActiveSubmenu('none');
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
              >
                <div>
                  <span className="text-sm font-semibold text-white block">Persistent</span>
                  <span className="text-xs text-[#8E8E93]">Banners remain on screen until you tap or dismiss them</span>
                </div>
                {settings.bannerStyle === 'persistent' && <Check className="w-5 h-5 text-[#0A84FF]" />}
              </button>
            </div>
          ) : activeSubmenu === 'announce' ? (
            /* Submenu: Announce Notifications */
            <div className="bg-[#1C1C1E] rounded-3xl p-2 space-y-1">
              <button
                onClick={() => {
                  updateField('announce', 'off');
                  setActiveSubmenu('none');
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
              >
                <div>
                  <span className="text-sm font-semibold text-white block">Off</span>
                  <span className="text-xs text-[#8E8E93]">No spoken voice announcements</span>
                </div>
                {settings.announce === 'off' && <Check className="w-5 h-5 text-[#0A84FF]" />}
              </button>

              <div className="h-px bg-[#2C2C2E]" />

              <button
                onClick={() => {
                  updateField('announce', 'spoken');
                  announceSpeech('Speech announcements enabled for encrypted notifications.');
                  setActiveSubmenu('none');
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
              >
                <div>
                  <span className="text-sm font-semibold text-white block">Spoken Voice (TTS)</span>
                  <span className="text-xs text-[#8E8E93]">Speaks sender and announcement aloud when incoming</span>
                </div>
                {settings.announce === 'spoken' && <Check className="w-5 h-5 text-[#0A84FF]" />}
              </button>
            </div>
          ) : activeSubmenu === 'showPreviews' ? (
            /* Submenu: Show Previews */
            <div className="bg-[#1C1C1E] rounded-3xl p-2 space-y-1">
              {[
                { id: 'when_unlocked', title: 'When Unlocked (Default)', desc: 'Shows message sender and preview when viewing workspace' },
                { id: 'always', title: 'Always', desc: 'Always include snippet details in alert' },
                { id: 'never', title: 'Never', desc: 'Only display generic "New Encrypted Message"' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    updateField('showPreviews', opt.id as any);
                    setActiveSubmenu('none');
                  }}
                  className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
                >
                  <div>
                    <span className="text-sm font-semibold text-white block">{opt.title}</span>
                    <span className="text-xs text-[#8E8E93]">{opt.desc}</span>
                  </div>
                  {settings.showPreviews === opt.id && <Check className="w-5 h-5 text-[#0A84FF]" />}
                </button>
              ))}
            </div>
          ) : (
            /* Submenu: Grouping */
            <div className="bg-[#1C1C1E] rounded-3xl p-2 space-y-1">
              {[
                { id: 'automatic', title: 'Automatic', desc: 'Groups notifications automatically by conversation' },
                { id: 'by_conversation', title: 'By Conversation', desc: 'Separates channel and DM alerts' },
                { id: 'off', title: 'Off', desc: 'List every notification individually' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    updateField('grouping', opt.id as any);
                    setActiveSubmenu('none');
                  }}
                  className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-[#2C2C2E] transition-colors cursor-pointer text-left"
                >
                  <div>
                    <span className="text-sm font-semibold text-white block">{opt.title}</span>
                    <span className="text-xs text-[#8E8E93]">{opt.desc}</span>
                  </div>
                  {settings.grouping === opt.id && <Check className="w-5 h-5 text-[#0A84FF]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
