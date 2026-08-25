const fs = require('fs');
let code = fs.readFileSync('src/components/NavigationRail.tsx', 'utf8');

const replacement = `      <button
        id="nav-brand-logo"
        onClick={() => onSelectView('chat')}
        title="Valut.io Workplace E2EE"
        className="w-12 h-12 bg-[#4A3A35] hover:bg-[#3D2F2A] transition-all rounded-2xl flex items-center justify-center shadow-sm cursor-pointer group"
      >
        <svg viewBox="0 0 100 100" className="w-7 h-7 text-[#A7B3BA]" fill="currentColor">
          <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0Zm0 14c19.9 0 36 16.1 36 36S69.9 86 50 86 14 69.9 14 50 30.1 14 50 14Z" />
          <path d="M72.5 31c-3-8-10.5-13-19.5-13-11.6 0-21 9.4-21 21 0 16.5 25 14.5 25 27 0 5-4 9-9 9-6.5 0-12-4-15-10l-12 7c5 11 16 19 30 19 11.6 0 21-9.4 21-21 0-16.5-25-14.5-25-27 0-5 4-9 9-9 6.5 0 12 4 15 10l11.5-7Z" />
        </svg>
      </button>`;

code = code.replace(/<button\n\s*id="nav-brand-logo"[\s\S]*?<\/button>/, replacement);

fs.writeFileSync('src/components/NavigationRail.tsx', code);
console.log('patched NavigationRail with exact logo');
