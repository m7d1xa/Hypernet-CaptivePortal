import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace handleClearAllCards
clear_all_cards_pattern = r'const handleClearAllCards = async \(\) => \{.*?(?=const handleAdminClearAllStock = handleClearAllCards;)'
clear_all_cards_replacement = """const handleClearAllCards = async () => {
    if (!window.confirm("هل أنت أسطى متأكد من حذف جميع الكروت نهائياً من قاعدة البيانات؟")) {
      return;
    }
    
    setIsClearingAllStock(true);
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/cards?all=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': 'HNetAdminKey_2026'
        }
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        showToast("تم الحذف بنجاح من قاعدة البيانات", "success");
        fetchAdminD1Cards();
      } else {
        alert(data?.error || 'فشل الحذف');
      }
    } catch (err: any) {
      console.error("API card delete error:", err);
      alert('حدث خطأ أثناء الاتصال بالخادم لحذف الكروت');
    } finally {
      setIsClearingAllStock(false);
    }
  };

  """
content = re.sub(clear_all_cards_pattern, clear_all_cards_replacement, content, flags=re.DOTALL)


# Replace handleAdminDeleteExpiredCards
expired_cards_pattern = r'const handleAdminDeleteExpiredCards = async \(\) => \{.*?(?=const getPackageName =)'
expired_cards_replacement = """const handleAdminDeleteExpiredCards = async () => {
    if (!window.confirm("هل أنت متأكد من حذف الكروت المنتهية فقط؟")) {
      return;
    }

    setIsClearingExpiredCards(true);
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      
      const res = await fetch(`${API_BASE_URL}/api/admin/cards?status=EXPIRED`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': 'HNetAdminKey_2026'
        }
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        showToast("تم الحذف بنجاح من قاعدة البيانات", "success");
        fetchAdminD1Cards();
      } else {
        alert(data?.error || 'فشل الحذف');
      }
    } catch (err: any) {
      console.error("Delete expired cards error:", err);
      alert('حدث خطأ أثناء الاتصال بالخادم لحذف الكروت المنتهية');
    } finally {
      setIsClearingExpiredCards(false);
    }
  };

  """
content = re.sub(expired_cards_pattern, expired_cards_replacement, content, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(content)

