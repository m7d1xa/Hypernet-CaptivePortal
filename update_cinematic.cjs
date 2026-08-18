const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Splash timer in useEffect
code = code.replace(
`  useEffect(() => {\n    setMounted(true);\n    const timer = setTimeout(() => {\n      setIsSplash(false);\n    }, 400);`,
`  useEffect(() => {\n    setMounted(true);\n    const timer = setTimeout(() => {\n      setIsSplash(false);\n    }, 2400);`
);

// 2. Splash Screen Block
const splashOld = code.substring(code.indexOf('<AnimatePresence>\n        {isSplash && ('), code.indexOf('</AnimatePresence>\n\n      <AnimatePresence mode="wait">'));
const splashNew = `<AnimatePresence>
        {isSplash && (
          <motion.div 
            id="splash-screen"
            key="splash-screen"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none"
          >
             <div className="relative flex items-center justify-center">
               <motion.div 
                 animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.2, 1] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute w-56 h-56 bg-blue-900/50 rounded-full blur-3xl pointer-events-none"
               />
               <HyperNetLogo 
                 layoutId="logo"
                 className="w-40 h-40 mix-blend-screen drop-shadow-[0_0_60px_rgba(30,58,138,0.7)] z-10"
                 initial={{ scale: 0.75, opacity: 0, filter: 'blur(16px)' }}
                 animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                 transition={{ 
                   duration: 1.8, 
                   ease: [0.25, 1, 0.5, 1],
                   layout: { duration: 1.8, ease: [0.25, 1, 0.5, 1] } 
                 }}
               />
             </div>
             <motion.div
                id="splash-text"
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
                className="absolute top-[60%] text-center"
             >
                <h1 className="text-4xl font-bold text-white tracking-normal mb-2 drop-shadow-lg">هايبر نت</h1>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
                  className="text-blue-400/80 text-sm tracking-[0.25em] font-medium uppercase drop-shadow-md"
                >
                  نسعد لخدمتكم دائماً
                </motion.p>
             </motion.div>
          </motion.div>
        )}
      `;

code = code.replace(splashOld, splashNew);

// 3. Login Header block
code = code.replace(
`<div className="flex flex-col items-center mb-8">\n                  <HyperNetLogo \n                    layoutId="logo"\n                    className="w-24 h-24 mb-4 mix-blend-screen drop-shadow-[0_0_40px_rgba(30,58,138,0.6)] z-10"\n                    transition={{ layout: { duration: 1.5, ease: [0.16, 1, 0.3, 1] }, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}\n                  />\n                  <motion.div\n                    initial={{ opacity: 0 }}\n                    animate={{ opacity: 1 }}\n                    transition={{ delay: 0.2, duration: 0.4 }}\n                    className="text-center"\n                  >\n                    <h1 className="text-[28px] font-bold text-white/95 leading-tight mb-1 tracking-normal">\n                      هايبر نت\n                    </h1>\n                    <motion.p \n                      initial={{ opacity: 0, y: 10 }}\n                      animate={{ opacity: 1, y: 0 }}\n                      transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}\n                      className="text-white/60 text-[15px] font-medium tracking-wide mt-2"\n                    >\n                      نسعد لخدمتكم دائماً\n                    </motion.p>\n                  </motion.div>\n                </div>`,
`<div className="flex flex-col items-center mb-8 relative">\n                  <motion.div \n                    animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.15, 1] }}\n                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}\n                    className="absolute top-0 w-32 h-32 bg-blue-900/40 rounded-full blur-2xl pointer-events-none"\n                  />\n                  <HyperNetLogo \n                    layoutId="logo"\n                    className="w-24 h-24 mb-4 mix-blend-screen drop-shadow-[0_0_40px_rgba(30,58,138,0.7)] z-10"\n                    transition={{ layout: { duration: 1.8, ease: [0.25, 1, 0.5, 1] }, duration: 1.8, ease: [0.25, 1, 0.5, 1] }}\n                  />\n                  <div className="text-center relative z-10">\n                    <motion.h1 \n                      initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}\n                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}\n                      transition={{ delay: 0.6, duration: 1.2, ease: [0.25, 1, 0.5, 1] }}\n                      className="text-[28px] font-bold text-white/95 leading-tight mb-1 tracking-normal"\n                    >\n                      هايبر نت\n                    </motion.h1>\n                    <motion.p \n                      initial={{ opacity: 0, y: 10 }}\n                      animate={{ opacity: 1, y: 0 }}\n                      transition={{ delay: 1.4, duration: 1.0, ease: [0.25, 1, 0.5, 1] }}\n                      className="text-white/60 text-[15px] font-medium tracking-wide mt-1.5"\n                    >\n                      نسعد لخدمتكم دائماً\n                    </motion.p>\n                  </div>\n                </div>`
);

// 4. Update login container transition curve to [0.25, 1, 0.5, 1] & duration 1.8s
code = code.replace(
`transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}\n            className="w-full max-w-[420px] mx-auto relative z-10 py-10 space-y-6"`,
`transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1] }}\n            className="w-full max-w-[420px] mx-auto relative z-10 py-10 space-y-6"`
);

// 5. Dashboard header logo transition
code = code.replace(
`className="w-12 h-12 mix-blend-screen drop-shadow-[0_0_20px_rgba(30,58,138,0.5)] z-10"\n                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}`,
`className="w-12 h-12 mix-blend-screen drop-shadow-[0_0_20px_rgba(30,58,138,0.5)] z-10"\n                    transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1] }}`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Cinematic motion updates applied successfully!');
