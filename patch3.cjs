const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { NotificationSettingsModal }')) {
  code = code.replace(/import \{ KeyManagementModal \} from '\.\/components\/KeyManagementModal';/, `import { KeyManagementModal } from './components/KeyManagementModal';\nimport { NotificationSettingsModal } from './components/NotificationSettingsModal';`);
}

if (!code.includes('const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);')) {
  code = code.replace(/const \[isConfiguringPin, setIsConfiguringPin\] = useState\(false\);/, `const [isConfiguringPin, setIsConfiguringPin] = useState(false);\n  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);\n  const [notificationSettings, setNotificationSettings] = useState(() => {\n    const saved = localStorage.getItem('valut_notification_settings');\n    return saved ? JSON.parse(saved) : {\n      allowNotifications: true,\n      playSound: true,\n      showPreviews: 'when_unlocked',\n      bannerStyle: 'temporary',\n      announce: 'off',\n      grouping: 'automatic'\n    };\n  });\n  const updateNotificationSettings = (settings) => {\n    setNotificationSettings(settings);\n    localStorage.setItem('valut_notification_settings', JSON.stringify(settings));\n  };`);
}

if (!code.includes('onOpenNotificationSettings=')) {
  code = code.replace(/onLockScreen=\{.*?onOpenPinConfig=\{.*?\}\n/s, (match) => {
    return match.trim() + `\n          onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}\n`;
  });
}

if (!code.includes('<NotificationSettingsModal')) {
  code = code.replace(/\{renderModals\(\)\}/, `{renderModals()}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
        settings={notificationSettings}
        onUpdateSettings={updateNotificationSettings}
        onSendTestNotification={() => {
          setNotification({ id: Date.now().toString(), title: 'Test Alert', text: 'This is a test notification.', action: () => setNotification(null) });
          playNotificationSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Test Alert', { body: 'This is a test notification.', icon: '/vite.svg' });
          }
        }}
      />`);
}

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx with notifications modal');
