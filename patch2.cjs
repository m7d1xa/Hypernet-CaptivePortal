const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  /const cuser = c\.cardUsername \|\| c\.username \|\| c\.code;/g,
  "const cuser = c.cardUsername || c.username || c.card_number || c.code;"
);
fs.writeFileSync('src/App.tsx', code);
