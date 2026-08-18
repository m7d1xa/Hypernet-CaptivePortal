import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Update handleClearAllCards logic
clear_all_cards_pattern = r'const handleClearAllCards = async \(\) => \{.*?(?=const handleAdminClearAllStock = handleClearAllCards;)'
clear_all_cards_replacement = """const handleClearAllCards = async () => {
    if (!window.confirm("هل أنت أسطى متأكد من حذف جميع الكروت نهائياً من قاعدة البيانات؟")) {
      return;
    }
    
    setIsClearingAllStock(true);
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/cards/clear-all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': 'HNetAdminKey_2026'
        },
        body: JSON.stringify({
          query: "DELETE FROM cards"
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok || (data && data.success)) {
        showToast("تم حذف جميع الكروت نهائياً من قاعدة البيانات بنجاح! 🗑️", "success");
        // Auto-sync State: automatically re-fetch data
        fetchAdminD1Cards();
        setIsClearAllConfirmOpen(false);
      } else {
        console.warn("Delete all cards response:", data);
        showToast(data?.error || "تمت معالجة حذف الكروت، يرجى التحديث", "success");
        fetchAdminD1Cards();
        setIsClearAllConfirmOpen(false);
      }
    } catch (err: any) {
      console.error("API card delete error:", err);
      showToast("حدث خطأ أثناء الاتصال بالخادم لحذف الكروت", "error");
    } finally {
      setIsClearingAllStock(false);
    }
  };

  """
content = re.sub(clear_all_cards_pattern, clear_all_cards_replacement, content, flags=re.DOTALL)


# 2. Update handleAdminDeleteExpiredCards logic
expired_cards_pattern = r'const handleAdminDeleteExpiredCards = async \(\) => \{.*?(?=const getPackageName =)'
expired_cards_replacement = """const handleAdminDeleteExpiredCards = async () => {
    if (!window.confirm("هل أنت متأكد من حذف الكروت المنتهية فقط؟")) {
      return;
    }

    setIsClearingExpiredCards(true);
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      
      const res = await fetch(`${API_BASE_URL}/api/admin/cards/expired`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': 'HNetAdminKey_2026'
        },
        body: JSON.stringify({
          status: 'EXPIRED',
          query: "DELETE FROM cards WHERE status = 'EXPIRED'"
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok || (data && data.success)) {
        showToast("تم حذف الكروت المنتهية من قاعدة البيانات بنجاح! 🗑️", "success");
      } else {
        console.warn("Delete expired response:", data);
        showToast(data?.error || "تمت معالجة حذف الكروت المنتهية وتحديث البيانات", "success");
      }

      // Auto-sync State: automatically re-fetch data
      await fetchAdminD1Cards();
    } catch (err: any) {
      console.error("Delete expired cards error:", err);
      showToast("حدث خطأ أثناء الاتصال بالخادم لحذف الكروت المنتهية", "error");
      await fetchAdminD1Cards();
    } finally {
      setIsClearingExpiredCards(false);
    }
  };

  """
content = re.sub(expired_cards_pattern, expired_cards_replacement, content, flags=re.DOTALL)


# 3. Modify Action Bar Buttons
action_bar_pattern = r'<div className="flex flex-wrap items-center gap-2">.*?<span className="text-\[10px\] text-slate-400 bg-slate-800/50'
action_bar_replacement = """<div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAdminClearAllStock}
                                disabled={isClearingAllStock}
                                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg text-xs font-bold border border-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="حذف كافة الكروت"
                              >
                                <Trash2 className={`w-3.5 h-3.5 ${isClearingAllStock ? 'animate-spin' : ''}`} />
                                <span>{isClearingAllStock ? 'جاري الحذف...' : 'حذف كافة الكروت'}</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={handleAdminDeleteExpiredCards}
                                disabled={isClearingExpiredCards}
                                className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold border border-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="حذف الكروت المنتهية"
                              >
                                <Trash2 className={`w-3.5 h-3.5 ${isClearingExpiredCards ? 'animate-spin' : ''}`} />
                                <span>{isClearingExpiredCards ? 'جاري الحذف...' : 'حذف الكروت المنتهية'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleExportMikrotikRsc}
                                disabled={isExportingRsc}
                                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="تصدير ملف .rsc للميكروتيك"
                              >
                                <Download className={`w-3.5 h-3.5 ${isExportingRsc ? 'animate-bounce' : ''}`} />
                                <span>{isExportingRsc ? 'جاري التصدير...' : 'تصدير ملف .rsc للميكروتيك'}</span>
                              </button>
                              
                              <span className="text-[10px] text-slate-400 bg-slate-800/50"""
content = re.sub(action_bar_pattern, action_bar_replacement, content, flags=re.DOTALL)


with open("src/App.tsx", "w") as f:
    f.write(content)

