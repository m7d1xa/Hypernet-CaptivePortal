const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /if \(prev\.some\(n => n\.id === incoming\.id\)\) return prev;\n\s*try \{/g,
  "if (prev.some(n => n.id === incoming.id)) return prev;\n        const updated = [incoming, ...prev];\n        try {"
);

fs.writeFileSync('src/App.tsx', code);
