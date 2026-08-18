const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/setNotifications\(prev => \{\n\s*try \{/g, 'setNotifications(prev => {\n        const updated = [newNotif, ...prev];\n        try {');

fs.writeFileSync('src/App.tsx', code);
