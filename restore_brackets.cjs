const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const toRestore = [
  { search: /const cardsToClaim = /g, replace: "const cardsToClaim: any[] = [];" },
  { search: /const currentInv = /g, replace: "const currentInv = [...inventory];" }, // Wait, what was it?
];

// Let's just grep the original file from the server if possible? No backup.
