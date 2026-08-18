const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  "const cuser = c.cardUsername || c.username || c.code;",
  "const cuser = c.cardUsername || c.username || c.card_number || c.code;"
);
code = code.replace(
  "return st !== 'AVAILABLE';\n        });\n        setCards(userOnlyCards);",
  "return st !== 'AVAILABLE';\n        }).map((c) => ({\n          ...c,\n          cardUsername: c.cardUsername || c.username || c.card_number || c.code,\n          username: c.username || c.cardUsername || c.card_number || c.code,\n          cardPassword: c.cardPassword || c.password || c.card_password,\n          password: c.password || c.cardPassword || c.card_password,\n          packageName: c.package_name || c.packageName || c.name || 'باقة إنترنت',\n          name: c.package_name || c.name || c.packageName || 'باقة إنترنت',\n          status: c.status === 'مباع' ? 'SOLD' : (c.status || 'SOLD'),\n          duration: c.duration || (c.duration_hours ? `${c.duration_hours} ساعة` : '24 ساعة'),\n          purchaseDate: c.created_at || c.purchaseDate || new Date().toLocaleDateString('ar-EG'),\n        }));\n        setCards(userOnlyCards);"
);
fs.writeFileSync('src/App.tsx', code);
