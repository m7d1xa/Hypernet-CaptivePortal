const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const newAdmin = fs.readFileSync('/tmp/new_admin_section.txt', 'utf8');

const startStr = "{showAdminDashboard && (";
const endStr = "      {/* Admin Dashboard Modal */}"; // We replaced this part
// Let's just find the start of the <AnimatePresence> block for admin.
const adminStart = app.indexOf("      {/* Admin Dashboard Modal */}");
const beforeAdmin = app.substring(0, adminStart);

// find the end of the admin section
const adminEndBlock = `            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>`;
const adminEnd = app.indexOf(adminEndBlock, adminStart) + adminEndBlock.length;

const afterAdmin = app.substring(adminEnd);

fs.writeFileSync('src/App.tsx', beforeAdmin + newAdmin + afterAdmin);
