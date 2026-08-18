const fs = require('fs');

// Create a types declaration file for PNG
fs.writeFileSync('src/vite-env.d.ts', '/// <reference types="vite/client" />\ndeclare module "*.png" {\n  const value: any;\n  export default value;\n}\n');

console.log('Fixed TS errors!');
