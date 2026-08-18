const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldHandleDelete = /const handleDeleteCard = async \(cardId: string, e\?: React\.MouseEvent\) => \{[\s\S]*?console\.error\("Delete error:", err\);\s*\}\s*\};/;

const newHandleDelete = `const handleDeleteCard = async (cardId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!window.confirm("هل أنت متأكد من حذف هذه البطاقة؟")) {
      return;
    }

    setIsLoading(true);
    // 2. Call Cloudflare D1 Backend API
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(\`\${API_BASE_URL}/api/cards/\${cardId}\`, {
        method: 'DELETE',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error || "Failed to delete card from D1", "error");
      } else {
        showToast('تم حذف البطاقة من السجل بنجاح ✅', 'success');
        // Re-fetch state
        if (username) {
          await fetchUserCardsFromDatabase(username);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsLoading(false);
    }
  };`;

code = code.replace(oldHandleDelete, newHandleDelete);
fs.writeFileSync('src/App.tsx', code);
