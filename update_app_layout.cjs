const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Replace Top Announcement Bar with Continuous Marquee Ticker
const oldTopBar = `      {/* Announcement & Real-Time Network Bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/10 py-2.5 px-3.5 sm:px-6 safe-top-bar shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2 max-w-7xl mx-auto left-0 right-0">
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

const newTopBar = `      {/* Continuous Scrolling Marquee Announcement Bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#050507]/85 backdrop-blur-2xl border-b border-white/10 py-2 safe-top-bar shadow-[0_4px_25px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center relative overflow-hidden ticker-mask">
          {/* Live Indicator Icon */}
          <div className="absolute right-3 sm:right-6 z-20 flex items-center gap-2 bg-[#050507]/90 px-2.5 py-1 rounded-full border border-white/10 shadow-md backdrop-blur-md">
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
            </div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider shrink-0">مباشر</span>
          </div>

          {/* Marquee Infinite Loop Container */}
          <div className="animate-marquee py-0.5 pr-24 sm:pr-28 flex items-center gap-12 text-[12.5px] sm:text-[13.5px] font-medium text-white/90 select-none">
            <div className="flex items-center gap-8 shrink-0">
              <span className="flex items-center gap-2">⚡ السلام عليكم - أهلاً بكم في شبكة هايبر نت</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-2">🚀 تغطية فائقة وسرعات عالية لجميع باقات الكروت</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-2">💬 للتواصل مع الدعم الفني وتعبئة الرصيد استخدموا زر الواتساب</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-2">✨ نسعد لخدمتكم دائماً على مدار الساعة</span>
              <span className="text-white/30">•</span>
            </div>
            <div className="flex items-center gap-8 shrink-0">
              <span className="flex items-center gap-2">⚡ السلام عليكم - أهلاً بكم في شبكة هايبر نت</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-2">🚀 تغطية فائقة وسرعات عالية لجميع باقات الكروت</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-2">💬 للتواصل مع الدعم الفني وتعبئة الرصيد استخدموا زر الواتساب</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-2">✨ نسعد لخدمتكم دائماً على مدار الساعة</span>
              <span className="text-white/30">•</span>
            </div>
          </div>
        </div>
      </div>`;

code = code.replace(oldTopBar, newTopBar);

// 2. Relocate Ping Monitor into Login Card Header
const oldHeader = `                <div className="flex flex-col items-center mb-8 relative">
                  <motion.div 
                    animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.15, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 w-32 h-32 bg-blue-900/40 rounded-full blur-2xl pointer-events-none"
                  />
                  <HyperNetLogo 
                    layoutId="logo"
                    className="w-24 h-24 mb-4 mix-blend-screen drop-shadow-[0_0_40px_rgba(30,58,138,0.7)] z-10"
                    transition={{ layout: { duration: 1.8, ease: [0.25, 1, 0.5, 1] }, duration: 1.8, ease: [0.25, 1, 0.5, 1] }}
                  />
                  <div className="text-center relative z-10">
                    <motion.h1 
                      initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                      className="text-[28px] font-bold text-white/95 leading-tight mb-1 tracking-normal"
                    >
                      هايبر نت
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4, duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
                      className="text-white/60 text-[15px] font-medium tracking-wide mt-1.5"
                    >
                      نسعد لخدمتكم دائماً
                    </motion.p>
                  </div>
                </div>`;

const newHeader = `                <div className="flex flex-col items-center mb-6 sm:mb-8 relative">
                  <motion.div 
                    animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.15, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 w-28 h-28 sm:w-32 sm:h-32 bg-blue-900/40 rounded-full blur-2xl pointer-events-none"
                  />
                  <HyperNetLogo 
                    layoutId="logo"
                    className="w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4 mix-blend-screen drop-shadow-[0_0_40px_rgba(30,58,138,0.7)] z-10"
                    transition={{ layout: { duration: 1.8, ease: [0.25, 1, 0.5, 1] }, duration: 1.8, ease: [0.25, 1, 0.5, 1] }}
                  />
                  <div className="text-center relative z-10 flex flex-col items-center">
                    <motion.h1 
                      initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                      className="text-2xl sm:text-[28px] font-bold text-white/95 leading-tight mb-0.5 tracking-normal"
                    >
                      هايبر نت
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4, duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
                      className="text-white/60 text-[13.5px] sm:text-[15px] font-medium tracking-wide mt-1"
                    >
                      نسعد لخدمتكم دائماً
                    </motion.p>

                    {/* Relocated Real-Time Network Speed & Ping Status Pill */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.6, duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
                      className="mt-3 inline-flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1 text-[11px] sm:text-[12px] font-medium text-white/80 shadow-sm backdrop-blur-md"
                    >
                      <div className={\`w-2 h-2 rounded-full \${
                        pingQuality === 'excellent' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
                        pingQuality === 'good' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' :
                        'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      }\`} />
                      <span className="text-white/60">حالة الاتصال:</span>
                      <span className="font-mono font-bold text-white tracking-wider" dir="ltr">{ping !== null ? \`\${ping}ms\` : '...'}</span>
                      <span className={\`text-[10px] sm:text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md border \${
                        pingQuality === 'excellent' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                        pingQuality === 'good' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                        'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }\`}>
                        {pingQuality === 'excellent' ? 'ممتاز ⚡' : pingQuality === 'good' ? 'مستقر ⚡' : 'عادي'}
                      </span>
                    </motion.div>
                  </div>
                </div>`;

code = code.replace(oldHeader, newHeader);

// 3. Compact mobile padding & input sizing adjustment
code = code.replace(
  'className="min-h-dvh min-h-[100dvh] w-full bg-[#000000] text-white flex flex-col items-center justify-center px-3.5 sm:px-6 safe-container relative overflow-y-auto font-sans touch-manipulation"',
  'className="min-h-dvh min-h-[100dvh] w-full bg-[#000000] text-white flex flex-col items-center justify-center px-3 sm:px-6 safe-container pb-28 sm:pb-32 relative overflow-y-auto font-sans touch-manipulation"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('App layout and marquee ticker updated!');
