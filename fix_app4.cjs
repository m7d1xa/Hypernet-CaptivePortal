const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const qty = overrideQty !== undefined \? overrideQty : \(purchaseQuantity \|\| 1\);\n\s*const currentUsername = username \|\| "guest";/g, 'const qty = overrideQty !== undefined ? overrideQty : (purchaseQuantity || 1);\n    const currentUsername = username || "guest";\n    const cardsToClaim: any[] = [];');

// fix lines around 686-834: updated
code = code.replace(/const isGen = incomingNotif\?.isGeneral \|\| targetCamp === 'all' \|\| targetCamp === 'عام' \|\| targetCamp === 'الجميع' \|\| !targetCamp;\n\s*if \(\!isGen && targetCamp !== userCampClean\) \{\n\s*return;\n\s*\}\n\s*setNotifications\(prev => \{/g,
  'const isGen = incomingNotif?.isGeneral || targetCamp === \'all\' || targetCamp === \'عام\' || targetCamp === \'الجميع\' || !targetCamp;\n      if (!isGen && targetCamp !== userCampClean) {\n        return;\n      }\n      const updated = [incomingNotif, ...notifications]; // or prev but wait\n      setNotifications(prev => {'
);
code = code.replace(/setNotifications\(prev => \{\n\s*if \(prev\.some\(n => n\.id === incomingNotif\.id\)\) return prev;\n\s*try \{/g,
  'setNotifications(prev => {\n        if (prev.some(n => n.id === incomingNotif.id)) return prev;\n        const updated = [incomingNotif, ...prev];\n        try {'
);

code = code.replace(/let workerDispensedCard: any = null;\n\s*try \{/g, 'let workerDispensedCard: any = null;\n        const dispensedCards: any[] = [];\n        const currentInv = [...inventory];\n        try {');

code = code.replace(/const row = json\[i\] \|\| \[\];\n\s*if \(\!json\[i\] \|\| json\[i\]\.length === 0\) continue;/g, 'if (!json[i] || json[i].length === 0) continue;\n          const row = json[i] || [];');
code = code.replace(/const headerRow = json\[0\] \|\| \[\];/g, 'const headerRow = json[0] || [];');

// newItems
code = code.replace(/const handleManualCardAdd = \(\) => \{/g, 'const handleManualCardAdd = () => {\n    const newItems: any[] = [];');

// assigned, apiCards
code = code.replace(/const currentSaved: any\[\] = \[\];/g, 'const currentSaved: any[] = [...savedCards];');

code = code.replace(/const chosenCamp = editRegion \|\| region \|\| 'مخيم الجزيرة';/g, 'const chosenCamp = editRegion || region || \'مخيم الجزيرة\';\n      const updatedList: any[] = [];');

fs.writeFileSync('src/App.tsx', code);
