const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBuyCode = `      if (localAvailable) {
        cardId = localAvailable.id;
        await executeD1Query(
          db,
          req.env,
          \`UPDATE cards 
           SET status = 'SOLD', 
               assigned_user_id = ?, 
               user_id = ?, 
               purchased_at = CURRENT_TIMESTAMP 
           WHERE id = ? AND status = 'AVAILABLE'\`,
          [targetUserId, targetUserId, cardId]
        );
          
        issuedCard = {
          username: localAvailable.username || localAvailable.card_number,
          password: localAvailable.password || localAvailable.card_password
        };
        cardPrice = localAvailable.price || cardPrice;
      }`;

const newBuyCode = `      if (localAvailable) {
        cardId = localAvailable.id;
        const updateRes = await executeD1Query(
          db,
          req.env,
          \`UPDATE cards 
           SET status = 'SOLD', 
               assigned_user_id = ?, 
               user_id = ?, 
               purchased_at = CURRENT_TIMESTAMP 
           WHERE id = ? AND status = 'AVAILABLE'\`,
          [targetUserId, targetUserId, cardId]
        );
        
        if (updateRes.meta && updateRes.meta.changes === 0) {
          return res.status(409).json({
            success: false,
            error: "عذراً، هذا الكرت غير متوفر وتم بيعه."
          });
        }
          
        issuedCard = {
          username: localAvailable.username || localAvailable.card_number,
          password: localAvailable.password || localAvailable.card_password
        };
        cardPrice = localAvailable.price || cardPrice;
      }`;

code = code.replace(oldBuyCode, newBuyCode);
fs.writeFileSync('server.ts', code);
