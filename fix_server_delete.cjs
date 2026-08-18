const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldDelete = `  // Perform the deletion
  await executeD1Query(db, req.env, "DELETE FROM cards WHERE id = ?", [cardId]);

  // Log the action to audit logs`;

const newDelete = `  if (cardRow.status === 'ACTIVE') {
    return res.status(400).json({ success: false, error: "لا يمكن حذف البطاقة بعد تفعيلها." });
  }

  // Perform the deletion
  const delRes = await executeD1Query(db, req.env, "DELETE FROM cards WHERE id = ? AND assigned_user_id = ?", [cardId, authUser.id]);
  
  if (delRes.meta && delRes.meta.changes === 0) {
     return res.status(400).json({ success: false, error: "فشل الحذف. قد تكون البطاقة محذوفة أو غير مملوكة لك." });
  }

  // Log the action to audit logs`;

code = code.replace(oldDelete, newDelete);
fs.writeFileSync('server.ts', code);
