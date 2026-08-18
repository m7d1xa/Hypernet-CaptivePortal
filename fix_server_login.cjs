const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const loginQueryCode = `  if (cardRecord) {
    // BUG #8: Activate card on login if SOLD
    if (cardRecord.status === 'SOLD' || cardRecord.status === 'sold') {
      const updateRes = await db.prepare(
        "UPDATE cards SET status='ACTIVE', activated_at=CURRENT_TIMESTAMP, expires_at=datetime(CURRENT_TIMESTAMP, '+' || COALESCE(duration_hours, 24) || ' hours') WHERE id=? AND assigned_user_id=? AND (status='SOLD' OR status='sold')"
      ).bind(cardRecord.id, cardRecord.assigned_user_id).run();
      
      if (updateRes.meta && updateRes.meta.changes > 0) {
        cardRecord.status = 'ACTIVE';
        cardRecord.activated_at = new Date().toISOString();
      }
    }
`;

code = code.replace("  if (cardRecord) {", loginQueryCode);

fs.writeFileSync('server.ts', code);
