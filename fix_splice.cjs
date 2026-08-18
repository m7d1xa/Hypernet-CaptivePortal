const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const newAdmin = fs.readFileSync('/tmp/new_admin_section_v2.txt', 'utf8');

// Find start of admin block
const startMarker = "      {/* Admin Dashboard Modal */}";
const startIndex = app.indexOf(startMarker);

// Find end of admin block. It ends with:
const endBlock = `            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

const endIndexRaw = app.indexOf(endBlock, startIndex);
if (startIndex !== -1 && endIndexRaw !== -1) {
  const endIndex = endIndexRaw + endBlock.length;
  const beforeAdmin = app.substring(0, startIndex);
  const afterAdmin = app.substring(endIndex);
  
  fs.writeFileSync('src/App.tsx', beforeAdmin + startMarker + '\n' + newAdmin + afterAdmin);
  console.log("Spliced successfully");
} else {
  console.log("Could not find bounds", startIndex, endIndexRaw);
}
