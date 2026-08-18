const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldTh = `<th className="p-3 font-semibold">المشترك</th>
                              <th className="p-3 font-semibold">رقم الجوال</th>
                              <th className="p-3 font-semibold">الباقة المفعلة</th>
                              <th className="p-3 font-semibold">حالة الحساب</th>
                              <th className="p-3 font-semibold">تاريخ التسجيل</th>
                              <th className="p-3 font-semibold text-center">إجراءات</th>`;

const newTh = `<th className="p-3 font-semibold">المشترك</th>
                              <th className="p-3 font-semibold">اسم المستخدم</th>
                              <th className="p-3 font-semibold">رقم الجوال</th>
                              <th className="p-3 font-semibold">المنطقة / المخيم</th>
                              <th className="p-3 font-semibold">الباقة المفعلة</th>
                              <th className="p-3 font-semibold">حالة الحساب</th>
                              <th className="p-3 font-semibold">تاريخ التسجيل</th>
                              <th className="p-3 font-semibold text-center">إجراءات</th>`;

const oldTd = `<td className="p-3 font-bold text-slate-200">
                                      {u.fullName || \`\${u.first_name || ''} \${u.last_name || ''}\`.trim() || u.username}
                                    </td>
                                    <td className="p-3 font-mono text-emerald-400" dir="ltr">{u.phone || '-'}</td>
                                    <td className="p-3 font-medium">`;

const newTd = `<td className="p-3 font-bold text-slate-200">
                                      {u.fullName || \`\${u.first_name || ''} \${u.last_name || ''}\`.trim() || u.username}
                                    </td>
                                    <td className="p-3 font-mono text-blue-400" dir="ltr">{u.username}</td>
                                    <td className="p-3 font-mono text-emerald-400" dir="ltr">{u.phone || '-'}</td>
                                    <td className="p-3 text-slate-400 text-sm">{u.region || '-'}</td>
                                    <td className="p-3 font-medium">`;

code = code.replace(oldTh, newTh);
code = code.replace(oldTd, newTd);

fs.writeFileSync('src/App.tsx', code);
