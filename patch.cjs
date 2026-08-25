const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

const replacement = `      await addDoc(messagesCol, {
        channelId: channel ? channel.id : null,
        conversationId: !channel ? currentTargetId : null,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        senderUsername: currentUser.username || currentUser.displayName,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatarColor,
        senderPhotoURL: currentUser.photoURL || null,
        ciphertext,
        iv,
        sha256Checksum: checksum,
        isEncrypted: true,
        file: fileMeta,
        reactions: {},
        isBurnOnRead,
        expiresAt,
        createdAt: Date.now(),
      });

      if (channel) {
        await updateDoc(doc(db, 'channels', channel.id), { lastActivity: Date.now() }).catch(console.error);
      }`;

code = code.replace(/      await addDoc\(messagesCol, \{\n        channelId: channel \? channel.id : null,\n        conversationId: !channel \? currentTargetId : null,\n        senderUid: currentUser\.uid,\n        senderName: currentUser\.displayName,\n        senderUsername: currentUser\.username \|\| currentUser\.displayName,\n        senderRole: currentUser\.role,\n        senderAvatar: currentUser\.avatarColor,\n        senderPhotoURL: currentUser\.photoURL \|\| null,\n        ciphertext,\n        iv,\n        sha256Checksum: checksum,\n        isEncrypted: true,\n        file: fileMeta,\n        reactions: \{\},\n        isBurnOnRead,\n        expiresAt,\n        createdAt: Date\.now\(\),\n      \}\);/, replacement);

fs.writeFileSync('src/components/ChatView.tsx', code);
console.log('patched handleSendMessage');
