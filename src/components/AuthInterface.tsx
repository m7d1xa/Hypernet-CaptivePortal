import React, { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi,
  Lock,
  User,
  Phone,
  MapPin,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export const REGIONS = [
  "مخيم جباليا - الهوجا",
  "مخيم جباليا - الترنس",
  "مخيم جباليا - الفالوجا",
  "مشروع بيت لاهيا",
  "الشيخ رضوان",
  "النصر والرمال",
  "غزة - وسط البلد",
  "دير البلح",
  "خان يونس",
  "رفح"
];

export interface AuthInterfaceProps {
  apiBaseUrl?: string;
  onAuthSuccess?: (userData: any, sessionData?: any) => void;
  onQuickConnectCard?: (cardData: any) => void;
}

export const AuthInterface: React.FC<AuthInterfaceProps> = ({
  apiBaseUrl = "https://purple-violet-3560.m-r-n-3-2005.workers.dev",
  onAuthSuccess,
  onQuickConnectCard
}) => {
  // Tab / View Toggle: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Shared Login / Register State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Status & Validation State
  const [isLoading, setIsLoading] = useState(false);
  const [formAlert, setFormAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [shake, setShake] = useState(false);

  // Lockout Countdown Timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const rem = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(rem);
      if (rem <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Sanitizers
  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleUsernameChange = (val: string) => {
    // Sanitize: 30 chars limit, disallow MikroTik/RADIUS conflicting symbols
    const sanitized = val.replace(/[\s@:\/\\;'"&|#\$<>?%]/g, '').slice(0, 30);
    setUsername(sanitized);
  };

  const handlePasswordChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 5);
    setPassword(digitsOnly);
  };

  const handleConfirmPasswordChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 5);
    setConfirmPassword(digitsOnly);
  };

  // Validation Rules
  const isPhoneValid = /^(059|056)\d{7}$/.test(phone);
  const isUsernameValid = username.trim().length >= 3 && username.trim().length <= 30 && !/[\s@:\/\\;'"&|#\$<>?%]/.test(username.trim());
  const isPasswordValid = password.length === 5;
  const isConfirmPasswordValid = confirmPassword === password && confirmPassword.length === 5;
  const isFirstNameValid = firstName.trim().length > 0;
  const isFatherNameValid = fatherName.trim().length > 0;
  const isLastNameValid = lastName.trim().length > 0;
  const isRegionValid = region.trim().length > 0;

  const isRegisterFormValid = Boolean(
    isFirstNameValid &&
    isFatherNameValid &&
    isLastNameValid &&
    isPhoneValid &&
    isUsernameValid &&
    isRegionValid &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    !isLoading
  );

  // 1. Handle Login Submit
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormAlert(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setFormAlert({ type: 'error', message: 'يرجى إدخال اسم المستخدم أو رقم الكرت' });
      return;
    }

    setIsLoading(true);
    try {
      // Capture router IP & MAC if present in URL search params
      const searchParams = new URLSearchParams(window.location.search);
      const mac = searchParams.get('mac') || searchParams.get('mac-esc') || '';
      const ip = searchParams.get('ip') || '';
      const queryStr = [mac ? `mac=${encodeURIComponent(mac)}` : '', ip ? `ip=${encodeURIComponent(ip)}` : ''].filter(Boolean).join('&');

      const baseUrl = apiBaseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/api/auth/login${queryStr ? '?' + queryStr : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
          remember_me: rememberMe
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.success === false) {
        const errMsg = data?.error || 'اسم المستخدم / رقم الكرت أو كلمة المرور غير صحيحة';
        setFormAlert({ type: 'error', message: errMsg });
        setShake(true);
        setTimeout(() => setShake(false), 500);

        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockoutUntil(Date.now() + 30000);
        }
        return;
      }

      setFormAlert({ type: 'success', message: 'تم تسجيل الدخول بنجاح! 👋' });

      if (data.type === 'card' && data.card) {
        onQuickConnectCard?.(data.card);
      } else {
        onAuthSuccess?.(data.user, data);
      }
    } catch (err: any) {
      setFormAlert({ type: 'error', message: 'فشل الاتصال بالخادم. يرجى التحقق من الشبكة والمحاولة مجدداً.' });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Register Submit
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormAlert(null);

    const cleanUser = username.trim();
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();
    const fullName = `${firstName.trim()} ${fatherName.trim()} ${lastName.trim()}`.trim();

    if (!cleanUser || !cleanPhone || !cleanPass) {
      setFormAlert({ type: 'error', message: 'الرجاء تعبئة جميع الحقول المطلوبة.' });
      return;
    }

    if (!/^(059|056)\d{7}$/.test(cleanPhone)) {
      setFormAlert({ type: 'error', message: 'يجب أن يبدأ رقم الجوال بـ 059 أو 056 ويتكون من 10 أرقام بالضبط.' });
      return;
    }

    if (cleanPass !== confirmPassword) {
      setFormAlert({ type: 'error', message: 'كلمتا المرور غير متطابقتين.' });
      return;
    }

    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const mac = searchParams.get('mac') || searchParams.get('mac-esc') || '';
      const ip = searchParams.get('ip') || '';
      const queryStr = [mac ? `mac=${encodeURIComponent(mac)}` : '', ip ? `ip=${encodeURIComponent(ip)}` : ''].filter(Boolean).join('&');

      const baseUrl = apiBaseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/api/auth/register${queryStr ? '?' + queryStr : ''}`;
      const payload = {
        fullName: fullName || cleanUser,
        firstName: firstName.trim() || 'مشترك',
        fatherName: fatherName.trim() || '',
        lastName: lastName.trim() || 'جديد',
        phone: cleanPhone,
        username: cleanUser,
        password: cleanPass,
        region: region
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.success === false) {
        const errMsg = data?.error || data?.message || 'فشل إنشاء الحساب. يرجى التأكد من البيانات والمحاولة مجدداً.';
        setFormAlert({ type: 'error', message: errMsg });
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      setFormAlert({ type: 'success', message: 'تم إنشاء الحساب بنجاح 🎉' });
      onAuthSuccess?.(data.user || payload, data);
    } catch (err: any) {
      setFormAlert({ type: 'error', message: 'فشل الاتصال بالخادم. يرجى التحقق من الشبكة والمحاولة مجدداً.' });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto relative z-10 py-6 sm:py-10 px-4">
      {/* Background Glow */}
      <div className="absolute -inset-4 pointer-events-none rounded-3xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-emerald-900/10 to-transparent blur-xl -z-10" />

      {/* Main Container Card */}
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-[#161b22]/95 backdrop-blur-md border border-[#30363d] p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-right"
        dir="rtl"
      >
        {/* Top Header & Logo */}
        <div className="flex items-center justify-between pb-6 border-b border-[#30363d]/80 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>شبكة هايبر نت</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Cloud D1
              </span>
            </h1>
            <p className="text-xs text-white/50 mt-1">بوابة الدخول والاشتراك في خدمة الإنترنت</p>
          </div>

          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Wifi className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Tab Switcher: Login vs Create Account */}
        <div className="grid grid-cols-2 p-1 bg-[#0d1117] border border-[#30363d] rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setFormAlert(null);
            }}
            className={`h-11 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setFormAlert(null);
            }}
            className={`h-11 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" />
            <span>إنشاء حساب</span>
          </button>
        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence mode="wait">
          {formAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm font-medium mb-5 border ${
                formAlert.type === 'error'
                  ? 'bg-red-500/10 border-red-500/25 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {formAlert.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              )}
              <p className="leading-relaxed">{formAlert.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View 1: Login Form */}
        {activeTab === 'login' && (
          <motion.form
            key="login-form"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleLoginSubmit}
            className="space-y-4"
          >
            {/* Username / Card Input */}
            <div className="space-y-1.5">
              <label className="block text-xs text-white/70 font-medium px-1">
                اسم المستخدم / رقم الكرت
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="اسم المستخدم أو كود الكرت"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl px-4 h-12 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors text-white font-medium placeholder:text-white/20"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs text-white/70 font-medium px-1">
                كلمة المرور (5 أرقام أو كلمة السر)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="•••••"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl px-4 h-12 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors text-white font-medium placeholder:text-white/20"
                />
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none"
            >
              <button
                type="button"
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  rememberMe ? 'bg-emerald-600 border-emerald-600' : 'bg-white/5 border-[#30363d]'
                }`}
              >
                {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <span className="text-xs text-white/70 hover:text-white">
                تذكر تسجيل دخولي لمدة 90 يوماً
              </span>
            </div>

            {/* Submit Login Button */}
            <button
              type="submit"
              disabled={isLoading || lockoutUntil !== null}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold h-12 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {lockoutUntil !== null ? (
                <span>يرجى الانتظار ({lockoutRemaining}s) ⏳</span>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <span>دخول سريع إلى الشبكة ⚡</span>
              )}
            </button>
          </motion.form>
        )}

        {/* View 2: Register Form */}
        {activeTab === 'register' && (
          <motion.form
            key="register-form"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRegisterSubmit}
            className="space-y-3.5"
          >
            {/* 3-Column Name */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] text-white/60">الاسم الأول</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => markTouched('firstName')}
                  placeholder="محمد"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 h-11 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-white/60">اسم الأب</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  onBlur={() => markTouched('fatherName')}
                  placeholder="علي"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 h-11 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-white/60">العائلة</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => markTouched('lastName')}
                  placeholder="أحمد"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 h-11 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Mobile Phone Number */}
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="block text-[11px] text-white/60">رقم الجوال (059 أو 056)</label>
                <span className="text-[10px] font-mono text-white/40">{phone.length}/10</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => markTouched('phone')}
                placeholder="0591234567"
                dir="ltr"
                className={`w-full bg-[#0d1117] border rounded-xl px-4 h-11 text-sm text-right font-mono text-white focus:outline-none ${
                  (touched.phone || phone.length > 0) && !isPhoneValid
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-[#30363d] focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Region Select */}
            <div className="space-y-1">
              <label className="block text-[11px] text-white/60">المنطقة / المخيم</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                onBlur={() => markTouched('region')}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 h-11 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">اختر المنطقة / المخيم...</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="bg-[#111] text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <label className="block text-[11px] text-white/60">اسم المستخدم (3-30 حرف)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onBlur={() => markTouched('username')}
                placeholder="اسم المستخدم بدون مسافات"
                className={`w-full bg-[#0d1117] border rounded-xl px-4 h-11 text-sm text-white focus:outline-none ${
                  (touched.username || username.length > 0) && !isUsernameValid
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-[#30363d] focus:border-emerald-500'
                }`}
              />
            </div>

            {/* 5-Digit Password & Confirmation */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] text-white/60">كلمة المرور (5 أرقام)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={5}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => markTouched('password')}
                  placeholder="•••••"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 h-11 text-sm text-white text-center tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-white/60">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={5}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  onBlur={() => markTouched('confirmPassword')}
                  placeholder="•••••"
                  className={`w-full bg-[#0d1117] border rounded-xl px-3 h-11 text-sm text-white text-center tracking-widest focus:outline-none ${
                    (touched.confirmPassword || confirmPassword.length > 0) && !isConfirmPasswordValid
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-[#30363d] focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={!isRegisterFormValid || isLoading}
              className={`w-full font-bold h-12 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg ${
                isRegisterFormValid && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.98]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                <span>إنشاء الحساب والاشتراك الآن</span>
              )}
            </button>
          </motion.form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-[#30363d]/60 text-center">
          <p className="text-[11px] text-white/40 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>نظام مصادقة مشفر ومتوافق مع خوادم MikroTik Hotspot و Cloudflare Worker</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthInterface;
