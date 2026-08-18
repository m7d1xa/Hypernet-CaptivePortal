const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldQuery = "(SELECT CASE WHEN COUNT(*) > 0 THEN 'ACTIVE' ELSE 'EXPIRED' END FROM cards c WHERE c.assigned_user_id = u.id AND c.status = 'ACTIVE') as account_status";
const newQuery = `CASE
                WHEN EXISTS (SELECT 1 FROM cards c WHERE c.assigned_user_id=u.id AND c.status='ACTIVE' AND (c.expires_at > CURRENT_TIMESTAMP OR c.expires_at IS NULL)) THEN 'نشط'
                WHEN EXISTS (SELECT 1 FROM cards c WHERE c.assigned_user_id=u.id) THEN 'غير نشط'
                ELSE 'بدون باقة'
              END AS account_status`;

code = code.replace(oldQuery, newQuery);

// also map region
code = code.replace("phone: u.phone || \"\",", "phone: u.phone || \"\",\n    region: u.region || \"\",");

fs.writeFileSync('server.ts', code);
