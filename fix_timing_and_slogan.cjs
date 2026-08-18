const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Splash Logo Transition
code = code.replace(
`                 transition={{ \n                   duration: 0.6, \n                   ease: [0.16, 1, 0.3, 1],\n                   layout: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } \n                 }}`,
`                 transition={{ \n                   duration: 1.5, \n                   ease: [0.16, 1, 0.3, 1],\n                   layout: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } \n                 }}`
);

// Login Logo Transition
code = code.replace(
`transition={{ layout: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}`,
`transition={{ layout: { duration: 1.5, ease: [0.16, 1, 0.3, 1] }, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}`
);

// Dashboard Logo Transition
code = code.replace(
`transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}`,
`transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}`
);

// Container login transition
code = code.replace(
`transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}\n            className="w-full max-w-[420px] mx-auto relative z-10 py-10 space-y-6"`,
`transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}\n            className="w-full max-w-[420px] mx-auto relative z-10 py-10 space-y-6"`
);

// Slogan
code = code.replace(
`                    <h1 className="text-[28px] font-bold text-white/95 leading-tight mb-1 tracking-normal">\n                      هايبر نت\n                    </h1>\n                  </motion.div>`,
`                    <h1 className="text-[28px] font-bold text-white/95 leading-tight mb-1 tracking-normal">\n                      هايبر نت\n                    </h1>\n                    <motion.p \n                      initial={{ opacity: 0, y: 10 }}\n                      animate={{ opacity: 1, y: 0 }}\n                      transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}\n                      className="text-white/60 text-[15px] font-medium tracking-wide mt-2"\n                    >\n                      نسعد لخدمتكم دائماً\n                    </motion.p>\n                  </motion.div>`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed timing and added slogan!');
