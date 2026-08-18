const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(/thinkingConfig: \{\n\s*thinkingLevel: "HIGH"\n\s*\}/g, '/* thinking config removed */');
fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts!');
