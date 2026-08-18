const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');
code = code.split('.bg-\\[\\#050507\\]\\/60, .bg-\\[\\#0B0E17\\]\\/80, .bg-\\[\\#0A0E1A\\]\\/80, .bg-\\[\\#0B0E17\\]\\/90').join('.bg-\\[\\#050507\\]\\/60, .bg-\\[\\#0B0E17\\]\\/80, .bg-\\[\\#0A0E1A\\]\\/80, .bg-\\[\\#0B0E17\\]\\/90');
// wait, the problem is it was literally `.bg-\\[\\#` in the file.
code = code.replace('.bg-\\\\[\\\\#050507\\\\]\\\\/60, .bg-\\\\[\\\\#0B0E17\\\\]\\\\/80, .bg-\\\\[\\\\#0A0E1A\\\\]\\\\/80, .bg-\\\\[\\\\#0B0E17\\\\]\\\\/90', 
                    '.bg-\\[\\#050507\\]\\/60, .bg-\\[\\#0B0E17\\]\\/80, .bg-\\[\\#0A0E1A\\]\\/80, .bg-\\[\\#0B0E17\\]\\/90');
fs.writeFileSync('src/index.css', code);
