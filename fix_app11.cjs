const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// row
code = code.replace(/if \(\!json\[i\] \|\| json\[i\]\.length === 0\) continue;\n\s*let userVal = '';/g, 'const row = json[i] || [];\n          if (!json[i] || json[i].length === 0) continue;\n          let userVal = \'\';');
code = code.replace(/if \(\!json\[i\] \|\| json\[i\]\.length === 0\) continue;\n\s*const userVal = String\(row\[userColIdx/g, 'const row = json[i] || [];\n          if (!json[i] || json[i].length === 0) continue;\n          const userVal = String(row[userColIdx');

// parsed (near parseCardImportData)
code = code.replace(/parseCardImportData\(fileContent\);\n\s*\} else \{\n\s*fileContent = await file\.text\(\);\n\s*\}/g, '} else {\n        fileContent = await file.text();\n      }\n      const parsed = parseCardImportData(fileContent);'); // we tried this. Maybe it failed? Let's check lines 2020-2050.

// updated (near setInventoryCards again?)
code = code.replace(/setInventoryCards\(prev => \{\n\s*localStorage\.setItem\('wifi_card_inventory', JSON\.stringify\(updated\)\);/g, 'setInventoryCards(prev => {\n          const updated = [...newItems, ...prev];\n          localStorage.setItem(\'wifi_card_inventory\', JSON.stringify(updated));');

// newItems (near handleManualCardAdd)
code = code.replace(/const handleManualCardAdd = \(\) => \{\n\s*if \(\!manualCardPackage/g, 'const handleManualCardAdd = () => {\n    const newItems: any[] = [];\n    if (!manualCardPackage');

// assigned, currentSaved, etc (near handlePullD1)
code = code.replace(/const data = await res\.json\(\)\.catch\(\(\) => null\);\n\s*if \(data\.success\) \{/g, 'const data = await res.json().catch(() => null);\n      const apiCards = data.cards || [];\n      const assigned: any[] = [];\n      const currentSaved: any[] = [...savedCards];\n      const updatedInventory = [...inventoryCards];\n      const combined = [...currentSaved, ...assigned];\n      if (data.success) {'); // This regex might have failed. Let's make it simpler.

code = code.replace(/const data = await res\.json\(\)\.catch\(\(\) => null\);\n\s*console\.log\("Admin users response:", data\);\n\s*const apiCards = data\.cards \|\| \[\];\n\s*if \(data\.success\) \{/g, 'const data = await res.json().catch(() => null);\n      console.log("Admin users response:", data);\n      const apiCards = data.cards || [];\n      const assigned: any[] = [];\n      const currentSaved: any[] = [...savedCards];\n      const updatedInventory = [...inventoryCards];\n      const combined = [...currentSaved, ...assigned];\n      if (data.success) {');

// chosenCamp
code = code.replace(/const chosenCamp = editRegion \|\| region \|\| 'مخيم الجزيرة';/g, 'const chosenCamp = editRegion || region || \'مخيم الجزيرة\';\n      const updatedList: any[] = [];');

// file, f
code = code.replace(/const handleImportFileChange = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{\n\s*if/g, 'const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if');
code = code.replace(/const handleAddD1CardsBulk = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{\n\s*if/g, 'const handleAddD1CardsBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const f = e.target.files?.[0];\n    if');

fs.writeFileSync('src/App.tsx', code);
