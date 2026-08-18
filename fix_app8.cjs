const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// lines ~1707: updated
code = code.replace(/setInventoryCards\(prev => \{\n\s*try \{/g, 'setInventoryCards(prev => {\n        const updated = [...currentInv];\n        try {');
code = code.replace(/setInventoryCards\(prev => \{\n\s*if \(prev/g, 'setInventoryCards(prev => {\n        const updated = [...currentInv];\n        if (prev');

// headerRow, row
code = code.replace(/const json: any\[\]\[\] = XLSX\.utils\.sheet_to_json\(worksheet, \{ header: 1 \}\);\n\s*const seen = new Set<string>\(\);\n\s*let userColIdx/g, 'const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });\n        const headerRow = json[0] || [];\n        const seen = new Set<string>();\n        let userColIdx');

code = code.replace(/for \(let i = 1; i < json\.length; i\+\+\) \{\n\s*if \(\!json\[i\] \|\| json\[i\]\.length === 0\) continue;\n\s*const row = json\[i\] \|\| \[\];/g, 'for (let i = 1; i < json.length; i++) {\n          const row = json[i] || [];\n          if (!json[i] || json[i].length === 0) continue;');

// parsed
code = code.replace(/const fileContent = await file\.text\(\);\n\s*\} else \{/g, 'const fileContent = await file.text();\n        const parsed = parseCardImportData(fileContent);\n      } else {');
code = code.replace(/const mappedCards = \[\];/g, 'const mappedCards: any[] = [];');
code = code.replace(/const parsed = parseCardImportData\(fileContent\);\n\s*\} else \{\n\s*fileContent = await file\.text\(\);\n\s*\}/g, '} else {\n        fileContent = await file.text();\n      }\n      const parsed = parseCardImportData(fileContent);');

// assigned, apiCards, currentSaved
code = code.replace(/const data = await res\.json\(\)\.catch\(\(\) => null\);\n\s*if \(data\.success\) \{/g, 'const data = await res.json().catch(() => null);\n      const apiCards = data.cards || [];\n      const assigned: any[] = [];\n      const currentSaved: any[] = [...savedCards];\n      const updatedInventory = [...inventoryCards];\n      const combined = [...currentSaved, ...assigned];\n      if (data.success) {');

// chosenCamp
code = code.replace(/const chosenCamp = editRegion \|\| region \|\| 'مخيم الجزيرة';/g, 'const chosenCamp = editRegion || region || \'مخيم الجزيرة\';\n      const updatedList: any[] = [];');

// file, f
code = code.replace(/const file = e\.target\.files\?\.\[0\];/g, 'const file = e.target.files?.[0];'); // Already tried this?
code = code.replace(/const handleImportFileChange = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{\n\s*if/g, 'const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if');
code = code.replace(/const handleAddD1CardsBulk = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{\n\s*if/g, 'const handleAddD1CardsBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const f = e.target.files?.[0];\n    if');

fs.writeFileSync('src/App.tsx', code);
