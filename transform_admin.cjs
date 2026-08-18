const fs = require('fs');
const content = fs.readFileSync('/tmp/admin_section.txt', 'utf8');

let newContent = `
      <AnimatePresence>
        {showAdminDashboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] flex bg-[#0e131f] text-slate-100 overflow-hidden font-['Tajawal']"
            dir="rtl"
          >
            {/* Sidebar (Desktop & Tablet) */}
            <div className="w-20 md:w-64 bg-[#0a0d14] border-l border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 relative z-20">
              <div className="h-16 border-b border-slate-800 flex items-center justify-center md:justify-start md:px-6 gap-3">
                <div className="w-9 h-9 bg-lime-500/10 border border-lime-500/20 rounded-xl flex items-center justify-center text-lime-500 flex-shrink-0 shadow-[0_0_15px_rgba(132,204,22,0.15)]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="hidden md:block">
                  <h3 className="text-base font-bold text-slate-100">لوحة الأدمن</h3>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-2 md:px-4 space-y-2 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setAdminActiveTab('users')}
                  className={\`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer \${
                    adminActiveTab === 'users' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }\`}
                  title="المشتركين"
                >
                  <Users className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">المشتركين ({adminUsers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminActiveTab('inventory')}
                  className={\`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer \${
                    adminActiveTab === 'inventory' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }\`}
                  title="الكروت والمخزون"
                >
                  <Database className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">الكروت والمخزون</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminActiveTab('support' as any)}
                  className={\`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer \${
                    adminActiveTab === 'support' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }\`}
                  title="رسائل الدعم"
                >
                  <MessageCircle className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">رسائل الدعم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminActiveTab('logs' as any)}
                  className={\`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer \${
                    adminActiveTab === 'logs' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }\`}
                  title="سجل المبيعات والتعويضات"
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">سجل المبيعات والتعويضات</span>
                </button>
              </div>
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={() => setShowAdminDashboard(false)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer font-medium text-sm border border-rose-500/20"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block">الخروج</span>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
              {/* Topbar */}
              <div className="h-16 border-b border-slate-800 bg-[#0a0d14]/95 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
                 <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-100 hidden sm:block">
                      {adminActiveTab === 'users' ? 'إدارة المشتركين' : 
                       adminActiveTab === 'inventory' ? 'مخزون الكروت' : 
                       adminActiveTab === 'support' ? 'رسائل الدعم' : 'سجل المبيعات والتعويضات'}
                    </h2>
                 </div>
                 <div className="flex items-center gap-3 sm:gap-4">
                    {adminActiveTab === 'inventory' && (
                      <button
                        type="button"
                        onClick={fetchCloudStockStatus}
                        disabled={isFetchingStock}
                        className="px-3 py-1.5 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 rounded-lg text-lime-400 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={\`w-4 h-4 \${isFetchingStock ? 'animate-spin' : ''}\`} />
                        <span className="hidden sm:inline">تحديث التزامن</span>
                      </button>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></div>
                      <span className="text-xs font-medium text-slate-300 font-mono tracking-wider" dir="ltr">ADMIN_ACTIVE</span>
                    </div>
                 </div>
              </div>

              {/* Scrollable Content Workspace */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-[#0e131f]">
                {/* KPI Grid */}
                {(() => {
                  const totalCardsCount = cards.length;
                  const activeCardsCount = cards.filter(c => !isCardExpired(c) && c.status !== 'expired' && c.status !== 'منتهي').length;
                  const expiredCardsCount = cards.filter(c => isCardExpired(c) || c.status === 'expired' || c.status === 'منتهي').length;
                  const totalRevenue = cards.reduce((sum, c) => {
                    const priceMatch = (c.price || '').match(/\\d+/);
                    const num = priceMatch ? parseInt(priceMatch[0]) : (c.packageName?.includes('10') || c.name?.includes('10') ? 2 : 3);
                    return sum + num;
                  }, 0);
                  
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" dir="rtl">
                      <div className="bg-[#161c2e] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300">
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">إجمالي البطاقات</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-slate-100 font-mono">{totalCardsCount}</span>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#161c2e] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-lime-500/50"></div>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">البطاقات النشطة</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-lime-400 font-mono">{activeCardsCount}</span>
                          <span className="bg-lime-500/10 text-lime-400 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-lime-500/20 font-medium">نشط</span>
                        </div>
                      </div>
                      <div className="bg-[#161c2e] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-slate-500/50"></div>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">البطاقات المنتهية</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-slate-300 font-mono">{expiredCardsCount}</span>
                          <span className="bg-slate-800/80 text-slate-300 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-slate-700 font-medium">منتهي</span>
                        </div>
                      </div>
                      <div className="bg-[#161c2e] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-amber-500/50"></div>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">إجمالي الإيرادات</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">₪{totalRevenue}</span>
                          <span className="bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-amber-500/20 font-medium">شيكل</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
`;

// Now extract the specific content for the two tabs from the original content
// We need everything inside {adminActiveTab === 'users' && (...)} and {adminActiveTab === 'inventory' && (...)}

const usersStart = content.indexOf("{adminActiveTab === 'users' && (");
// The end of users is right before {adminActiveTab === 'inventory' && (
const inventoryStart = content.indexOf("{adminActiveTab === 'inventory' && (");
const usersContent = content.substring(usersStart, inventoryStart).trim();

// The end of inventory is right before </motion.div>
const inventoryEnd = content.lastIndexOf("</motion.div>\n          </motion.div>");
let inventoryContent = content.substring(inventoryStart, inventoryEnd).trim();

// Add placeholders for support and logs
let supportContent = `
              {adminActiveTab === 'support' && (
                <div className="bg-[#161c2e] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-4">
                    <MessageCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">لا توجد رسائل دعم جديدة</h3>
                  <p className="text-sm text-slate-400 max-w-md">جميع رسائل واستفسارات المشتركين الواردة ستظهر هنا.</p>
                </div>
              )}
`;

let logsContent = `
              {adminActiveTab === 'logs' && (
                <div className="bg-[#161c2e] border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-4">
                    <Activity className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">سجل الحركات</h3>
                  <p className="text-sm text-slate-400 max-w-md">سجلات المبيعات والتعويضات للبطاقات ستظهر هنا.</p>
                </div>
              )}
`;

// Also clean up the styling of the Users and Inventory content!
// E.g. bg-slate-900/90 -> bg-[#161c2e], bg-indigo-600 -> bg-lime-500, etc.
let styledUsersContent = usersContent
  .replace(/bg-slate-900\/90/g, 'bg-[#161c2e]')
  .replace(/bg-slate-900\/80/g, 'bg-[#161c2e]')
  .replace(/bg-slate-950\/60/g, 'bg-[#0a0d14]')
  .replace(/bg-slate-950/g, 'bg-[#0a0d14]')
  .replace(/border-indigo-500/g, 'border-lime-500')
  .replace(/bg-indigo-600/g, 'bg-lime-600')
  .replace(/bg-indigo-500/g, 'bg-lime-500')
  .replace(/text-indigo-400/g, 'text-lime-400')
  .replace(/text-indigo-300/g, 'text-lime-300')
  .replace(/shadow-indigo/g, 'shadow-lime');

let styledInventoryContent = inventoryContent
  .replace(/bg-slate-900\/90/g, 'bg-[#161c2e]')
  .replace(/bg-slate-900\/80/g, 'bg-[#161c2e]')
  .replace(/bg-slate-950\/60/g, 'bg-[#0a0d14]')
  .replace(/bg-slate-950/g, 'bg-[#0a0d14]')
  .replace(/border-indigo-500/g, 'border-lime-500')
  .replace(/bg-indigo-600/g, 'bg-lime-600')
  .replace(/bg-indigo-500/g, 'bg-lime-500')
  .replace(/text-indigo-400/g, 'text-lime-400')
  .replace(/text-indigo-300/g, 'text-lime-300')
  .replace(/shadow-indigo/g, 'shadow-lime');

newContent += `\n${styledUsersContent}\n${styledInventoryContent}\n${supportContent}\n${logsContent}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

fs.writeFileSync('/tmp/new_admin_section.txt', newContent);
