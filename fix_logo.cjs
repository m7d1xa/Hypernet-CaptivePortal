const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Splash
code = code.replace(
`<div className="relative">\n               <div className="absolute inset-0 bg-[rgba(30,58,138,0.4)] blur-[50px] scale-[1.5] rounded-full mix-blend-screen" />\n               <HyperNetLogo \n                 layoutId="logo"\n                 className="w-40 h-40 mix-blend-screen relative z-10"`,
`<HyperNetLogo \n                 layoutId="logo"\n                 className="w-40 h-40 mix-blend-screen drop-shadow-[0_0_60px_rgba(30,58,138,0.6)] z-10"`);
code = code.replace(
`               />\n             </div>`,
`               />`);

// Login
code = code.replace(
`<div className="flex flex-col items-center mb-8 relative">\n                  <div className="absolute top-[10%] bg-[rgba(30,58,138,0.4)] blur-[40px] w-24 h-24 rounded-full mix-blend-screen scale-[1.2]" />\n                  <HyperNetLogo \n                    layoutId="logo"\n                    className="w-24 h-24 mb-4 mix-blend-screen relative z-10"`,
`<div className="flex flex-col items-center mb-8">\n                  <HyperNetLogo \n                    layoutId="logo"\n                    className="w-24 h-24 mb-4 mix-blend-screen drop-shadow-[0_0_40px_rgba(30,58,138,0.6)] z-10"`);

// Dashboard
code = code.replace(
`<div className="flex items-center gap-4 mb-8 opacity-90 w-full justify-center relative">\n                  <div className="absolute left-[calc(50%-1.5rem)] bg-[rgba(30,58,138,0.4)] blur-[25px] w-12 h-12 rounded-full mix-blend-screen scale-[1.3]" />\n                  <HyperNetLogo \n                    layoutId="logo"\n                    className="w-12 h-12 mix-blend-screen relative z-10"`,
`<div className="flex items-center gap-4 mb-8 opacity-90 w-full justify-center">\n                  <HyperNetLogo \n                    layoutId="logo"\n                    className="w-12 h-12 mix-blend-screen drop-shadow-[0_0_20px_rgba(30,58,138,0.5)] z-10"`);

fs.writeFileSync('src/App.tsx', code);
console.log('Logo wrappers removed!');
