const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const activateEndpoint = `
// Fast path dedicated activation endpoint
app.post("/api/cards/:id/activate", requireAuth, async (req: any, res) => {
  const db = req.db;
  const cardId = req.params.id;
  const authUser = req.user;

  try {
    const cardRes = await executeD1Query(db, req.env, "SELECT id, card_number, card_password, username, password, status, assigned_user_id FROM cards WHERE id = ?", [cardId]);
    const card = cardRes.results?.[0];

    if (!card) {
      return res.status(404).json({ success: false, error: "البطاقة غير موجودة." });
    }

    if (card.assigned_user_id !== authUser.id) {
      return res.status(403).json({ success: false, error: "لا تملك صلاحية تفعيل هذه البطاقة." });
    }

    if (card.status === 'ACTIVE') {
      return res.status(200).json({
        success: true,
        message: "البطاقة مفعلة مسبقاً",
        card: {
          username: card.username || card.card_number,
          password: card.password || card.card_password
        }
      });
    }

    if (card.status !== 'SOLD' && card.status !== 'sold') {
      return res.status(400).json({ success: false, error: "حالة البطاقة لا تسمح بالتفعيل." });
    }

    const updateRes = await executeD1Query(
      db, 
      req.env, 
      "UPDATE cards SET status='ACTIVE', activated_at=CURRENT_TIMESTAMP, expires_at=datetime(CURRENT_TIMESTAMP, '+' || COALESCE(duration_hours, 24) || ' hours') WHERE id=? AND assigned_user_id=? AND (status='SOLD' OR status='sold')", 
      [cardId, authUser.id]
    );

    if (updateRes.meta && updateRes.meta.changes > 0) {
      return res.status(200).json({
        success: true,
        message: "تم التفعيل بنجاح",
        card: {
          username: card.username || card.card_number,
          password: card.password || card.card_password
        }
      });
    } else {
      return res.status(400).json({ success: false, error: "فشل تفعيل البطاقة، قد تكون مفعلة مسبقاً أو غير موجودة." });
    }
  } catch (err: any) {
    console.error("Activation Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
`;

code = code.replace("app.post(\"/api/cards/activate\", requireAuth, async (req: any, res) => {", activateEndpoint + "\napp.post(\"/api/cards/activate\", requireAuth, async (req: any, res) => {");

fs.writeFileSync('server.ts', code);
