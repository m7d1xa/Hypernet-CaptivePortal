const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Adjust font weights and tracking
code = code.replace(/text-2xl font-bold text-white\/95/g, 'text-[28px] font-bold text-white/95 leading-tight');
code = code.replace(/text-white\/50 text-sm/g, 'text-white/50 text-[15px] font-medium tracking-wide mt-1');
code = code.replace(/font-medium px-1/g, 'font-medium px-1 tracking-wide');
code = code.replace(/text-sm text-white placeholder:text-white\/20/g, 'text-[15px] font-medium text-white placeholder:text-white/20');
code = code.replace(/text-sm text-white/g, 'text-[15px] font-medium text-white');
code = code.replace(/text-black font-semibold/g, 'text-black font-bold tracking-wide');
code = code.replace(/text-\[13px\] text-white\/60 cursor-pointer/g, 'text-[14px] font-medium text-white/70 cursor-pointer');
code = code.replace(/tracking-\[0.2em\]/g, 'tracking-[0.25em]');
code = code.replace(/tracking-tight/g, 'tracking-normal'); // Arabic doesn't usually need tight tracking, normal or wide is better.

fs.writeFileSync('src/App.tsx', code);
console.log('Typography updated!');
