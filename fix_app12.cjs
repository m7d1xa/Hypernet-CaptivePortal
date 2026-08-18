const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/for \(let i = startIdx; i < json\.length; i\+\+\) \{\n\s*if \(\!row \|\| row\.length === 0\) continue;/g, 'for (let i = startIdx; i < json.length; i++) {\n          const row = json[i] || [];\n          if (!row || row.length === 0) continue;');

fs.writeFileSync('src/App.tsx', code);
