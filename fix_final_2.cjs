const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const t1Marker = "      <AnimatePresence>\n        {showAdminDashboard && (";
const startIndex = app.indexOf(t1Marker);

// Find the AnimatePresence closing tag that belongs to this.
let openCount = 0;
let pos = startIndex;
while (pos < app.length) {
  const nextOpen = app.indexOf("<AnimatePresence", pos);
  const nextClose = app.indexOf("</AnimatePresence>", pos);
  
  if (nextClose === -1) break;
  
  if (nextOpen !== -1 && nextOpen < nextClose) {
    openCount++;
    pos = nextOpen + 10;
  } else {
    openCount--;
    pos = nextClose + 18;
    if (openCount === 0) {
      break;
    }
  }
}

if (startIndex !== -1 && pos !== -1 && openCount === 0) {
  const beforeAdmin = app.substring(0, startIndex);
  const afterAdmin = app.substring(pos);
  const newContent = fs.readFileSync('/tmp/new_admin_section_v2.txt', 'utf8');
  fs.writeFileSync('src/App.tsx', beforeAdmin + newContent + afterAdmin);
  console.log("Success");
} else {
  console.log("Failed to find bounds", startIndex, pos, openCount);
}
