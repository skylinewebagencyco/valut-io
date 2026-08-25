const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

const pollReplace = `        sha256Checksum: checksum,
        isEncrypted: true,
        poll: {
          ...poll,
          options: poll.options.map((o) => ({ ...o, votesCount: 0 })),
          totalVotes: 0,
        },
        reactions: {},
        createdAt: Date.now(),
      });

      if (channel) {
        await updateDoc(doc(db, 'channels', channel.id), { lastActivity: Date.now() }).catch(console.error);
      }`;

code = code.replace(/        sha256Checksum: checksum,\n        isEncrypted: true,\n        poll: \{\n          \.\.\.poll,\n          options: poll\.options\.map\(\(o\) => \(\{ \.\.\.o, votesCount: 0 \}\)\),\n          totalVotes: 0,\n        \},\n        reactions: \{\},\n        createdAt: Date\.now\(\),\n      \}\);/, pollReplace);

const snipReplace = `        sha256Checksum: checksum,
        isEncrypted: true,
        codeSnippet,
        reactions: {},
        createdAt: Date.now(),
      });

      if (channel) {
        await updateDoc(doc(db, 'channels', channel.id), { lastActivity: Date.now() }).catch(console.error);
      }`;

code = code.replace(/        sha256Checksum: checksum,\n        isEncrypted: true,\n        codeSnippet,\n        reactions: \{\},\n        createdAt: Date\.now\(\),\n      \}\);/, snipReplace);


const schedReplace = `            sha256Checksum: checksum,
            isEncrypted: true,
            reactions: {},
            createdAt: Date.now(),
          });

          if (item.targetType === 'channel') {
            await updateDoc(doc(db, 'channels', item.targetId), { lastActivity: Date.now() }).catch(console.error);
          } else {
            await setDoc(doc(db, 'conversations', item.targetId), { lastMessageTime: Date.now(), updatedAt: Date.now() }, { merge: true }).catch(console.error);
          }`;

code = code.replace(/            sha256Checksum: checksum,\n            isEncrypted: true,\n            reactions: \{\},\n            createdAt: Date\.now\(\),\n          \}\);/, schedReplace);

fs.writeFileSync('src/components/ChatView.tsx', code);
console.log('Patched poll, snippet, sched messages');
