const fs = require('fs');
const content = fs.readFileSync('/tmp/admin_section.txt', 'utf8');

const usersStartLineStr = "              {/* TAB 1: USER MANAGEMENT & CARD COMPENSATION */}";
const usersStart = content.indexOf(usersStartLineStr);
const inventoryStartLineStr = "              {/* TAB 2: INVENTORY & UPLOAD */}";
// Oh wait, did TAB 2 have that exact comment? Let's check.
