const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "UPDATE sessions SET ended_at = ? WHERE id = ? AND status = 'AVAILABLE'",
  "UPDATE sessions SET ended_at = ? WHERE id = ?"
);
code = code.replace(
  "UPDATE sessions SET ended_at = ? WHERE id = ? AND status = 'AVAILABLE'",
  "UPDATE sessions SET ended_at = ? WHERE id = ?"
);
code = code.replace(
  "WHERE id = ? AND status = 'AVAILABLE'`\n      )\n      .bind(fullName || null, phone || null, region || null, user.id)",
  "WHERE id = ?`\n      )\n      .bind(fullName || null, phone || null, region || null, user.id)"
);
code = code.replace(
  "WHERE id = ? AND status = 'AVAILABLE'`\n    )\n    .bind(orderId)",
  "WHERE id = ?`\n    )\n    .bind(orderId)"
);
code = code.replace(
  "UPDATE orders SET status = 'CANCELLED'\n       WHERE id = ? AND status = 'AVAILABLE'`",
  "UPDATE orders SET status = 'CANCELLED'\n       WHERE id = ?`"
);

fs.writeFileSync('server.ts', code);
