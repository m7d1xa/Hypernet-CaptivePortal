const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// newItems missing...
code = code.replace(/const handleManualCardAdd = \(\) => \{\n\s*if \(\!manualCardPackage/g, 'const handleManualCardAdd = () => {\n    const newItems: any[] = [];\n    if (!manualCardPackage');

// chosenCamp
code = code.replace(/const chosenCamp = editRegion \|\| region \|\| 'مخيم الجزيرة';/g, 'const chosenCamp = editRegion || region || \'مخيم الجزيرة\';\n      const updatedList: any[] = [];');

// newItems missing near 2050
code = code.replace(/const handleImportFileChange = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{\n\s*const file = e\.target\.files\?\.\[0\];\n\s*if \(\!file\)/g, 'const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    const newItems: any[] = [];\n    if (!file)');

// parsed... Wait, I need to check line 2028
