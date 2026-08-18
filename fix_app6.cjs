const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const payload = \{\n\s*firstName: firstName\.trim\(\) \|\| "مشترك",\n\s*fatherName: fatherName\.trim\(\) \|\| "",\n\s*lastName: lastName\.trim\(\) \|\| "جديد",\n\s*phone: cleanPhone,\n\s*username: cleanUser,\n\s*password: cleanPass\n\s*\};/g, 'const payload: any = {\n        firstName: firstName.trim() || "مشترك",\n        fatherName: fatherName.trim() || "",\n        lastName: lastName.trim() || "جديد",\n        phone: cleanPhone,\n        username: cleanUser,\n        password: cleanPass,\n        region: region\n      };');

fs.writeFileSync('src/App.tsx', code);
