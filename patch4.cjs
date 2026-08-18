const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix 1: Clear old cards on successful login
code = code.replace(
  "const loginType = authResult.type || (authResult.card ? \"card\" : \"account\");\n\n      // 1. Handle \"card\" Type Login",
  "const loginType = authResult.type || (authResult.card ? \"card\" : \"account\");\n\n      // 0. Clear old cards to prevent state bleeding from previous tests\n      localStorage.removeItem(\"my_purchased_cards\");\n      localStorage.removeItem(\"hnet_purchased_cards\");\n      setCards([]);\n\n      // 1. Handle \"card\" Type Login"
);

// Fix 2: Remove manual array manipulation and rely on fetch
const targetSetCards = `      // 4. Update user's purchased cards state
      setCards(prev => {
        const newIds = new Set(purchasedCards.map(c => c.id));
        const updated = [...purchasedCards, ...prev.filter(c => !newIds.has(c.id))];
        
        localStorage.setItem("my_purchased_cards", JSON.stringify(updated));
        localStorage.setItem("hnet_purchased_cards", JSON.stringify(updated));
        
        return updated;
      });`;

code = code.replace(
  targetSetCards,
  "      // 4. Update user's purchased cards state\n      // Relies strictly on authoritative fetch from D1 below to prevent state conflicts"
);

// Ensure the fetch at step 6 is awaited if possible (handleBuyPackage is async)
code = code.replace(
  "      if (username) {\n        fetchUserCardsFromDatabase(username);\n      }",
  "      if (username) {\n        await fetchUserCardsFromDatabase(username);\n      }"
);

fs.writeFileSync('src/App.tsx', code);
