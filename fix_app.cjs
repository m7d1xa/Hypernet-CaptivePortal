const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix syntax errors around removed camp lines
code = code.replace(/registered_at: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\n\s*\}\n/, "registered_at: new Date().toISOString().split('T')[0]\n  }\n];\n");

code = code.replace(/isGeneral: true\n\s*\}/, "isGeneral: true\n  }\n];\n");

fs.writeFileSync('src/App.tsx', code);
