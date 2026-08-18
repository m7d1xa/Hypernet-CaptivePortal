const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/value=\{username\}\s*\n\s*onChange=\{\(e\) \=\> setUsername\(e\.target\.value\)\}/g, 'defaultValue={username}');
code = code.replace(/value=\{password\}\s*\n\s*onChange=\{\(e\) \=\> setPassword\(e\.target\.value\)\}/g, 'defaultValue={password}');
fs.writeFileSync('src/App.tsx', code);
