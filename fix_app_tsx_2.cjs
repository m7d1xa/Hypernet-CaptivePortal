const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// After purchase
code = code.replace(
  'showToast("تم الشراء بنجاح من قاعدة البيانات! 💳", "success");',
  'showToast("تم الشراء بنجاح من قاعدة البيانات! 💳", "success");\n        fetchUserCardsFromDatabase(username);'
);

// Delete card
code = code.replace(
  'showToast("تم حذف الكرت بنجاح! 🗑️", "success");',
  'showToast("تم حذف الكرت بنجاح! 🗑️", "success");\n        fetchUserCardsFromDatabase(username);'
);

// On mount
code = code.replace(
  '// Ensure login state is recovered',
  '// Ensure login state is recovered\n    if (username) fetchUserCardsFromDatabase(username);'
);

fs.writeFileSync('src/App.tsx', code);
