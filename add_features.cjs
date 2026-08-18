const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add state for real-time ping and network latency monitor
const stateTarget = `  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);`;

const stateReplacement = `  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Real-time Ping & Latency Monitor State
  const [ping, setPing] = useState<number | null>(null);
  const [pingQuality, setPingQuality] = useState<'excellent' | 'good' | 'fair'>('excellent');

  useEffect(() => {
    let isMounted = true;
    const measureLatency = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch(\`/api/ping?t=\${Date.now()}\`, { cache: 'no-store' });
        if (res.ok) {
          const endTime = performance.now();
          const rtt = Math.max(1, Math.round(endTime - startTime));
          if (isMounted) {
            setPing(rtt);
            if (rtt <= 45) setPingQuality('excellent');
            else if (rtt <= 110) setPingQuality('good');
            else setPingQuality('fair');
          }
        }
      } catch (e) {
        const endTime = performance.now();
        const rtt = Math.max(1, Math.round(endTime - startTime));
        if (isMounted) {
          setPing(rtt);
          setPingQuality(rtt < 100 ? 'excellent' : 'good');
        }
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);`;

code = code.replace(stateTarget, stateReplacement);

// 2. Update Top Announcement Bar to include live Ping Indicator
const announcementBarTarget = `      {/* Announcement Bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#050507]/60 backdrop-blur-2xl border-b border-white/5 py-3 px-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-full px-5 py-1.5 shadow-[0_0_15px_rgba(30,58,138,0.2)]">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
          </div>
          <span className="text-[13.5px] font-medium tracking-wide text-white/95">السلام عليكم - أهلاً بكم في شبكة هايبر نت</span>
        </div>
      </div>`;

const announcementBarReplacement = `      {/* Announcement & Real-Time Network Bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#050507]/75 backdrop-blur-2xl border-b border-white/10 py-2.5 px-4 sm:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2 max-w-7xl mx-auto left-0 right-0">
        {/* Ticker / Welcome */}
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(30,58,138,0.2)] overflow-hidden">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
          </div>
          <span className="text-[12.5px] sm:text-[13.5px] font-medium tracking-wide text-white/95 truncate">
            السلام عليكم - أهلاً بكم في شبكة هايبر نت
          </span>
        </div>

        {/* Real-time Network Latency & Ping Monitor */}
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-full px-3.5 py-1 text-[12px] font-medium text-white/90 shadow-sm backdrop-blur-md shrink-0">
          <div className={\`w-2 h-2 rounded-full \${
            pingQuality === 'excellent' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
            pingQuality === 'good' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' :
            'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
          }\`} />
          <span className="text-white/70 hidden sm:inline">البنق:</span>
          <span className="font-mono font-bold text-white tracking-wider" dir="ltr">{ping !== null ? \`\${ping}ms\` : '...'}</span>
          <span className="text-[11px] text-white/50 border-r border-white/15 pr-2 mr-1">
            {pingQuality === 'excellent' ? 'ممتاز' : pingQuality === 'good' ? 'مستقر' : 'عادي'}
          </span>
        </div>
      </div>`;

code = code.replace(announcementBarTarget, announcementBarReplacement);

// 3. Add Floating WhatsApp Support Button
const whatsappButton = `
      {/* Floating WhatsApp Support Button (زر الدعم الفني) */}
      <motion.a
        href="https://wa.me/967770000000?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20-%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D8%AF%D8%B9%D9%85%20%D9%81%D9%86%D9%8A%20%D9%81%D9%8A%20%D8%B4%D8%A2%D9%83%D8%A9%20%D9%87%D8%A7%D9%8A%D8%A8%D8%B1%20%D9%86%D8%AA"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 backdrop-blur-xl px-4 py-3 rounded-full text-white shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-all duration-300 group cursor-pointer"
      >
        <div className="relative flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-50"></span>
          <div className="relative w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-md">
            <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 4.992l-1.418 5.18 5.3-1.39a9.932 9.932 0 004.773 1.218h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.038-5.176-2.925-7.062A9.925 9.925 0 0012.012 2zm5.835 14.167c-.247.692-1.226 1.326-1.99 1.488-.523.111-1.206.2-3.498-.752-2.932-1.217-4.821-4.204-4.968-4.4-.146-.195-1.192-1.587-1.192-3.026 0-1.439.753-2.146 1.021-2.438.267-.292.584-.365.779-.365.195 0 .39 0 .56.01.18.01.424-.068.663.506.247.575.842 2.054.916 2.201.074.146.123.317.025.512-.098.195-.147.317-.293.487-.146.17-.308.38-.44.512-.146.146-.298.305-.128.597.17.292.756 1.248 1.625 2.022 1.118.995 2.062 1.303 2.355 1.449.292.146.463.122.633-.073.17-.195.731-.852.926-1.144.195-.292.39-.244.658-.146.268.098 1.698.802 1.99 0.948.293.146.487.219.56.341.073.122.073.71-.174 1.402z" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[13px] font-bold text-white group-hover:text-emerald-300 transition-colors">الدعم الفني</span>
          <span className="text-[10px] text-white/60">متواجدون لخدمتكم 24/7</span>
        </div>
      </motion.a>
    </div>
  );
}`;

code = code.replace(/    <\/div>\s*\);\s*}\s*$/, whatsappButton + '\n}\n');

fs.writeFileSync('src/App.tsx', code);
console.log('Features added successfully!');
