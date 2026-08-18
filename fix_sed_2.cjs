const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const buyOld = `           SET status = 'SOLD', 
               assigned_user_id = ?, 
               user_id = ?, 
               purchased_at = CURRENT_TIMESTAMP 
           WHERE id = ?\`,`;
const buyNew = `           SET status = 'SOLD', 
               assigned_user_id = ?, 
               user_id = ?, 
               purchased_at = CURRENT_TIMESTAMP 
           WHERE id = ? AND status = 'AVAILABLE'\`,`;
code = code.replace(buyOld, buyNew);

const actOld = `         SET status = 'ACTIVE', assigned_user_id = ?, activated_at = ?
         WHERE id = ?\``;
const actNew = `         SET status = 'ACTIVE', assigned_user_id = ?, activated_at = ?
         WHERE id = ? AND status = 'AVAILABLE'\``;
code = code.replace(actOld, actNew);

fs.writeFileSync('server.ts', code);
