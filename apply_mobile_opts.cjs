const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Update main viewport container with min-h-dvh and safe-container padding
code = code.replace(
  'className="min-h-screen w-full bg-[#000000] text-white flex flex-col items-center justify-center p-4 relative overflow-y-auto font-sans" dir="rtl"',
  'className="min-h-dvh min-h-[100dvh] w-full bg-[#000000] text-white flex flex-col items-center justify-center px-3.5 sm:px-6 safe-container relative overflow-y-auto font-sans touch-manipulation" dir="rtl"'
);

// 2. Update Top Announcement Bar with safe-top-bar
code = code.replace(
  'className="fixed top-0 left-0 w-full z-50 bg-[#050507]/75 backdrop-blur-2xl border-b border-white/10 py-2.5 px-4 sm:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2 max-w-7xl mx-auto left-0 right-0"',
  'className="fixed top-0 left-0 w-full z-50 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/10 py-2.5 px-3.5 sm:px-6 safe-top-bar shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2 max-w-7xl mx-auto left-0 right-0"'
);

// 3. Login container & card responsive padding
code = code.replace(
  'className="w-full max-w-[420px] mx-auto relative z-10 py-10 space-y-6"',
  'className="w-full max-w-[420px] mx-auto relative z-10 py-4 sm:py-8 space-y-4 sm:space-y-6"'
);

code = code.replace(
  'className="relative p-8 z-10"',
  'className="relative p-5 sm:p-8 z-10"'
);

code = code.replace(
  'className="bg-[#050507]/60 backdrop-blur-3xl border border-white/10 border-t-white/25 p-7 rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"',
  'className="bg-[#050507]/60 backdrop-blur-3xl border border-white/10 border-t-white/25 p-5 sm:p-7 rounded-[28px] sm:rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"'
);

// 4. Register card responsive padding & touch target
code = code.replace(
  'className="w-full max-w-[440px] mx-auto relative z-10 py-10"',
  'className="w-full max-w-[440px] mx-auto relative z-10 py-4 sm:py-8"'
);

code = code.replace(
  'className="bg-[#050507]/60 backdrop-blur-3xl border border-white/10 border-t-white/25 p-8 rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"',
  'className="bg-[#050507]/60 backdrop-blur-3xl border border-white/10 border-t-white/25 p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"'
);

code = code.replace(
  'className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] transition-colors"',
  'className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all"'
);

// 5. Inputs 48px min height (min-h-[48px] or min-h-[50px])
const inputSearch = `focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300 text-[15px] font-medium text-white`;
const inputReplace = `focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300 text-[15px] font-medium text-white min-h-[48px]`;

code = code.replaceAll(inputSearch, inputReplace);

// 6. Select box min-h-[48px]
code = code.replace(
  'text-[13px] cursor-pointer"',
  'text-[13px] cursor-pointer min-h-[48px]"'
);

// 7. Checkbox row touch target optimization (min-h-[48px])
code = code.replace(
  'className="flex items-center gap-3 px-1 pt-2 pb-2"',
  'className="flex items-center gap-3 px-1 py-2.5 min-h-[48px] cursor-pointer touch-manipulation"'
);

// 8. Primary buttons min-h-[50px]
const oldPrimaryBtn = `className="w-full bg-white text-black font-bold tracking-wide py-4 rounded-2xl hover:bg-white/95 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100"`;
const newPrimaryBtn = `className="w-full bg-white text-black font-bold tracking-wide py-3.5 sm:py-4 min-h-[50px] rounded-2xl hover:bg-white/95 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100 touch-manipulation"`;

const oldRegSubmitBtn = `className="w-full bg-white text-black font-bold tracking-wide py-4 rounded-2xl hover:bg-white/95 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-8 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100"`;
const newRegSubmitBtn = `className="w-full bg-white text-black font-bold tracking-wide py-3.5 sm:py-4 min-h-[50px] rounded-2xl hover:bg-white/95 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2 mt-8 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100 touch-manipulation"`;

code = code.replace(oldPrimaryBtn, newPrimaryBtn);
code = code.replace(oldRegSubmitBtn, newRegSubmitBtn);

// 9. Secondary & Google buttons min-h-[48px]
code = code.replace(
  'py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-[14px]',
  'py-3.5 min-h-[48px] rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-[14px] touch-manipulation'
);

code = code.replace(
  'py-3.5 rounded-2xl transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-3 text-[14px]',
  'py-3.5 min-h-[48px] rounded-2xl transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-3 text-[14px] touch-manipulation'
);

// 10. Floating WhatsApp positioning with safe area
code = code.replace(
  'className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 backdrop-blur-xl px-4 py-3 rounded-full text-white shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-all duration-300 group cursor-pointer"',
  'className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 safe-whatsapp-pos z-50 flex items-center gap-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 backdrop-blur-xl px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full text-white shadow-[0_0_30px_rgba(37,211,102,0.3)] transition-all duration-300 group cursor-pointer touch-manipulation min-h-[48px]"'
);

// 11. Dashboard container mobile optimizations
code = code.replace(
  'className="w-full max-w-[460px] mx-auto relative z-10 py-10"',
  'className="w-full max-w-[460px] mx-auto relative z-10 py-4 sm:py-8"'
);

code = code.replace(
  'className="relative p-8 z-10 flex flex-col items-center overflow-hidden"',
  'className="relative p-5 sm:p-8 z-10 flex flex-col items-center overflow-hidden"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Mobile optimizations applied successfully!');
