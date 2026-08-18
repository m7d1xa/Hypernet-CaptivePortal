const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const workerDispensedCard = data\?\.dispensed_card \|\| data\?\.data\?\.dispensed_card \|\| data\?\.card \|\| data\?\.data\?\.card;\n\s*for \(let i = 0; i < qty; i\+\+\) \{/g, 'const workerDispensedCard = data?.dispensed_card || data?.data?.dispensed_card || data?.card || data?.data?.card;\n        const dispensedCards: any[] = [];\n        const currentInv = [...inventoryCards];\n        for (let i = 0; i < qty; i++) {');

// and for cardsToClaim duplicate:
code = code.replace(/const cardsToClaim: any\[\] = \[\];\n\s*const cardsToClaim: any\[\] = \[\];/g, 'const cardsToClaim: any[] = [];');

// And row missing in excel processing:
code = code.replace(/const row = json\[i\] \|\| \[\];\n\s*if \(\!json\[i\] \|\| json\[i\]\.length === 0\) continue;/g, 'if (!json[i] || json[i].length === 0) continue;\n          const row = json[i] || [];');

fs.writeFileSync('src/App.tsx', code);
