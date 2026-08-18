const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. HyperNetLogo floating container update
code = code.replace(
`const HyperNetLogo = ({ className = "w-12 h-12", ...props }: HTMLMotionProps<"img">) => (\n  <motion.img \n    src={logoImage} \n    alt="HyperNet Logo" \n    className={\`\${className} object-cover\`} \n    {...props}\n  />\n);`,
`const HyperNetLogo = ({ className = "w-12 h-12", ...props }: HTMLMotionProps<"img">) => (\n  <div className="animate-float inline-flex items-center justify-center">\n    <motion.img \n      src={logoImage} \n      alt="HyperNet Logo" \n      className={\`\${className} object-cover\`}\n      {...props}\n    />\n  </div>\n);`
);

// 2. Input micro-interactions (Focus ring, subtle scale lift & glow)
const oldInputClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-[#3B82F6]/50 focus:bg-[#1d2a44]/30 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all text-[15px] font-medium text-white placeholder:text-white/20"`;
const newInputClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-2 focus:ring-[#3B82F6]/40 focus:scale-[1.01] focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300 text-[15px] font-medium text-white placeholder:text-white/20"`;

const oldSmallInputClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-[#3B82F6]/50 focus:bg-[#1d2a44]/30 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all text-[15px] font-medium text-white"`;
const newSmallInputClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-2 focus:ring-[#3B82F6]/40 focus:scale-[1.01] focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300 text-[15px] font-medium text-white"`;

const oldTelInputClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-[#3B82F6]/50 focus:bg-[#1d2a44]/30 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all text-[15px] font-medium text-white text-right"`;
const newTelInputClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-2 focus:ring-[#3B82F6]/40 focus:scale-[1.01] focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300 text-[15px] font-medium text-white text-right"`;

const oldSelectClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-[#3B82F6]/50 focus:bg-[#1d2a44]/30 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all text-[13px] cursor-pointer"`;
const newSelectClass = `className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-2 focus:ring-[#3B82F6]/40 focus:scale-[1.01] focus:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300 text-[13px] cursor-pointer"`;

code = code.replaceAll(oldInputClass, newInputClass);
code = code.replaceAll(oldSmallInputClass, newSmallInputClass);
code = code.replaceAll(oldTelInputClass, newTelInputClass);
code = code.replaceAll(oldSelectClass, newSelectClass);

// 3. Primary Button micro-interactions
const oldBtnClass = `className="w-full bg-white text-black font-bold tracking-wide py-4 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100"`;
const newBtnClass = `className="w-full bg-white text-black font-bold tracking-wide py-4 rounded-2xl hover:bg-white/95 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100"`;

const oldRegSubmitBtn = `className="w-full bg-white text-black font-bold tracking-wide py-4 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-8 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100"`;
const newRegSubmitBtn = `className="w-full bg-white text-black font-bold tracking-wide py-4 rounded-2xl hover:bg-white/95 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-8 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:active:scale-100"`;

code = code.replace(oldBtnClass, newBtnClass);
code = code.replace(oldRegSubmitBtn, newRegSubmitBtn);

// 4. Secondary Buttons
const oldSecBtn = `className="w-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-white font-medium py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-[14px] active:scale-[0.98]"`;
const newSecBtn = `className="w-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.08)] active:scale-[0.98] text-white font-medium py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-[14px]"`;

const oldGoogleBtn = `className="w-full bg-[#13161c] border border-white/10 hover:bg-[#1c202a] text-white font-medium py-3.5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 text-[14px]"`;
const newGoogleBtn = `className="w-full bg-[#13161c] border border-white/10 hover:bg-[#1c202a] hover:border-white/20 hover:shadow-[0_0_15px_rgba(66,133,244,0.15)] active:scale-[0.98] text-white font-medium py-3.5 rounded-2xl transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-3 text-[14px]"`;

code = code.replace(oldSecBtn, newSecBtn);
code = code.replace(oldGoogleBtn, newGoogleBtn);

// 5. Checkbox & Remember me link
const oldCheckboxBtn = `className={\`w-[22px] h-[22px] rounded-md border flex items-center justify-center transition-colors \${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white/[0.05] border-white/20'}\`}`;
const newCheckboxBtn = `className={\`w-[22px] h-[22px] rounded-md border flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 \${rememberMe ? 'bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-white/[0.05] border-white/20 hover:border-white/40'}\`}`;

const oldRememberText = `<span className="text-[14px] font-medium text-white/70 cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>تذكرني؟</span>`;
const newRememberText = `<span className="text-[14px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>تذكرني؟</span>`;

code = code.replace(oldCheckboxBtn, newCheckboxBtn);
code = code.replace(oldRememberText, newRememberText);

fs.writeFileSync('src/App.tsx', code);
console.log('Interactions updated!');
