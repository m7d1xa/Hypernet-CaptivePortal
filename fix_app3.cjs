const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { search: /const qty = overrideQty !== undefined \? overrideQty : \(purchaseQuantity \|\| 1\);\n\s*const currentUsername = username \|\| "guest";/g, replace: 'const qty = overrideQty !== undefined ? overrideQty : (purchaseQuantity || 1);\n    const currentUsername = username || "guest";\n    const cardsToClaim: any[] = [];' },
  { search: /let workerDispensedCard: any = null;/g, replace: 'let workerDispensedCard: any = null;\n        const currentInv = [...inventory];\n        const dispensedCards: any[] = [];' },
  { search: /const buffer = new Uint8Array\(await file\.arrayBuffer\(\)\);\n\s*const workbook = XLSX\.read\(buffer, \{ type: 'array' \}\);/g, replace: 'const buffer = new Uint8Array(await file.arrayBuffer());\n        const workbook = XLSX.read(buffer, { type: \'array\' });\n        const sheet = workbook.Sheets[workbook.SheetNames[0]];' },
  { search: /const handleExcelFileUpload = \(e: ChangeEvent<HTMLInputElement>\) => \{/g, replace: 'const handleExcelFileUpload = (e: ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];' },
  { search: /const workbook = XLSX\.read\(buffer, \{ type: 'array' \}\);\n\s*const json: any\[\]\[\] =/g, replace: 'const workbook = XLSX.read(buffer, { type: \'array\' });\n        const worksheet = workbook.Sheets[workbook.SheetNames[0]];\n        const json: any[][] =' },
  { search: /let userColIdx = -1;\n\s*let passColIdx = -1;\n\s*let pkgColIdx = -1;\n\s*let priceColIdx = -1;/g, replace: 'const headerRow = json[0] || [];\n        let userColIdx = -1;\n        let passColIdx = -1;\n        let pkgColIdx = -1;\n        let priceColIdx = -1;' },
  { search: /for \(let i = 1; i < json\.length; i\+\+\) \{\n\s*if \(\!json\[i\] \|\| json\[i\]\.length === 0\) continue;/g, replace: 'for (let i = 1; i < json.length; i++) {\n          const row = json[i] || [];\n          if (!json[i] || json[i].length === 0) continue;' },
  { search: /console\.log\("Admin users response:", data\);\n\s*if \(data\.success\) \{/g, replace: 'console.log("Admin users response:", data);\n        const apiCards = data.cards || [];\n        if (data.success) {' },
  { search: /const newCards = Array\.isArray\(cards\) \? cards : \[cards\];/g, replace: 'const newItems = Array.isArray(cards) ? cards : [cards];' },
  { search: /const handleManualCardAdd = \(\) => \{/g, replace: 'const handleManualCardAdd = () => {\n    const newItems: any[] = [];' },
  { search: /const mappedCards = \[\];/g, replace: 'const parsed = parseCardImportData(importFileContent, importPrice, importBatchName);\n      const mappedCards = [];' },
  { search: /fetchUserCardsFromDatabase\(currentUsername\);\n\s*\}/g, replace: 'fetchUserCardsFromDatabase(currentUsername);\n      const assigned: any[] = [];\n      const currentSaved: any[] = [];\n      const updatedInventory = [...inventory];\n      const combined = [...currentSaved, ...assigned];\n      }' },
  { search: /if \(!importFileContent\) \{\n\s*showToast\('لا يوجد محتوى للاستيراد', 'error'\);\n\s*return;\n\s*\}/g, replace: 'if (!importFileContent) {\n      showToast(\'لا يوجد محتوى للاستيراد\', \'error\');\n      return;\n    }\n    const parsed = parseCardImportData(importFileContent, importPrice, importBatchName);' },
  { search: /const handleImportFileChange = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{/g, replace: 'const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];' },
  { search: /const handleAddD1CardsBulk = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{/g, replace: 'const handleAddD1CardsBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const f = e.target.files?.[0];' },
];

for (const r of replacements) {
  code = code.replace(r.search, r.replace);
}

// And REGIONS:
code = code.replace(/const REGIONS = \[\n\s*"مخيم الصبر والصمود",/g, 'const REGIONS = [\n  "مخيم الصبر والصمود",'); // if not exists? Let's just insert REGIONS before App
if (!code.includes('const REGIONS =')) {
    code = code.replace(/interface AdminUserItem/g, 'const REGIONS = [\n  "مخيم الجزيرة",\n  "مخيم النخيل الساحلي",\n  "مخيم وطن"\n];\ninterface AdminUserItem');
}

fs.writeFileSync('src/App.tsx', code);
