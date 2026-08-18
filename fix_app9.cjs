const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/setCards\(prev => \{\n\s*localStorage\.setItem\('hnet_purchased_cards', JSON\.stringify\(updated\)\);/g, 'setCards(prev => {\n          const updated = [...dispensedCards, ...prev];\n          localStorage.setItem(\'hnet_purchased_cards\', JSON.stringify(updated));');

fs.writeFileSync('src/App.tsx', code);
