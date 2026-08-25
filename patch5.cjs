const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/  \}, \[conversations, selectedConversationId, currentUser, activeWorkers\]\);/, `  }, [conversations, selectedConversationId, currentUser, activeWorkers, notificationSettings]);`);

code = code.replace(/  \}, \[channels, selectedChannelId, currentView, currentUser\]\);/, `  }, [channels, selectedChannelId, currentView, currentUser, notificationSettings]);`);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx useEffect deps');
