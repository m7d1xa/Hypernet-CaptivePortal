const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "if (res.ok && data?.success) {\n          if (data.card) {",
  "if (res.ok && data?.success) {\n          if (data.card) {\n            console.log(\"New Card Purchased:\", data.card);"
);

code = code.replace(
  "const updated = [...purchasedCards, ...prev.filter(c => !claimedNumbers.has(c.cardUsername || c.username))];",
  "const updated = [...purchasedCards, ...prev.filter(c => {\n          const cUser = c.cardUsername || c.username || c.card_number || c.code;\n          return !claimedNumbers.has(cUser);\n        })];"
);

fs.writeFileSync('src/App.tsx', code);
