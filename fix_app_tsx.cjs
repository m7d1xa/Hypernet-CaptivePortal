const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 4: Admin Subscriber Table Column Mapping
code = code.replace(
  /<td className="p-3 font-mono text-emerald-400" dir="ltr">\{u.username \|\| u.phone\}<\/td>/,
  '<td className="p-3 font-mono text-emerald-400" dir="ltr">{u.phone || \'-\'}</td>'
);

// Fix 3: Dynamic Subscriber Account Status badge
const oldBadgeLogic = `{isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                          نشط
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                          منتهي
                                        </span>
                                      )}`;

const newBadgeLogic = `{(() => {
  const status = u.account_status || 'بدون باقة';
  if (status === 'نشط') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        نشط
      </span>
    );
  } else if (status === 'غير نشط') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        غير نشط
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 font-bold text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        بدون باقة
      </span>
    );
  }
})()}`;

code = code.replace(oldBadgeLogic, newBadgeLogic);

// Fix filtering logic
code = code.replace(
  "const isActive = u.account_status === 'ACTIVE' || (u as any).status === 'ACTIVE';",
  "const isActive = u.account_status === 'نشط';"
);
code = code.replace(
  "const isActive = u.account_status === 'ACTIVE' || (u as any).status === 'ACTIVE';", // in map
  "// removed old isActive"
);

fs.writeFileSync('src/App.tsx', code);
