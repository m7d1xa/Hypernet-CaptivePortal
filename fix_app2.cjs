const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /\{ id: 'tx_d5'.*?cardNumber: '33201944' \}\n\s*demoTxs\.forEach/,
  "{ id: 'tx_d5', date: '2026-08-10 18:05', username: '0595443322', packageName: 'باقة 10 ساعات', amount: 2, type: 'sold', cardNumber: '33201944' }\n                    ];\n                    demoTxs.forEach"
);

fs.writeFileSync('src/App.tsx', code);
