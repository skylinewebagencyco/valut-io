const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We need to respect notificationSettings.allowNotifications and playSound.
code = code.replace(/if \('Notification' in window && Notification\.permission === 'granted'\) \{/g, `if (notificationSettings.allowNotifications && 'Notification' in window && Notification.permission === 'granted') {`);

code = code.replace(/playNotificationSound\(\);/g, `if (notificationSettings.playSound) playNotificationSound();`);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx for allowNotifications respect');
