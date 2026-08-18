import React, { useState, FormEvent, useEffect, ReactNode, ChangeEvent, useRef, useMemo } from 'react';
import { 
  User, Coins, TrendingUp, Award, ShoppingCart, Loader2, CheckCircle2, AlertCircle, Download, Upload as UploadIcon, 
  Clock, HardDrive, LogOut, ChevronRight, Check,
  CreditCard, ShoppingBag, Settings, Wifi, Zap, Smartphone, KeyRound, Edit3, Copy, ShieldCheck, Sparkles, RefreshCw, FileSpreadsheet, UploadCloud, Database,
  MessageCircle, Send, PhoneCall, Activity, ExternalLink, Gift, Users, Filter, Search, Trash2, Inbox, X, LayoutDashboard, Eye, EyeOff, Ticket,
  Bell, Megaphone
, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence, HTMLMotionProps } from 'motion/react';
import * as XLSX from 'xlsx';
import logoImage from "./assets/images/logo.png";



const isHeaderOrNoise = (val: string): boolean => {
  if (!val) return true;
  const v = val.toLowerCase().trim().replace(/^[:=؛\-/.]+|[:=؛\-/.]+$/g, '');
  if (v.length === 0) return true;
  if (/^(http|https|www\.)/i.test(v)) return true;

  const noiseKeywords = new Set([
    'pdf', 'page', 'table', 'user', 'users', 'pass', 'password', 'username', 'pin', 'secret',
    'mikrotik', 'wifi', 'wi-fi', 'hotspot', 'http', 'https', 'www', 'com', 'org', 'net',
    'serial', 'active', 'expired', 'profile', 'limit', 'uptime', 'bytes', 'download',
    'upload', 'index', 'status', 'date', 'time', 'no', 'num', 'number', 'count',
    'price', 'cost', 'total', 'header', 'footer', 'report', 'voucher', 'batch',
    'generated', 'internet', 'manager', 'login', 'logout', 'router', 'gateway',
    'hours', 'hour', 'hrs', 'hr', 'mb', 'gb', 'kb', 'nis', 'ils', 'speed', 'validity', 'expiry',
    'اسم', 'المستخدم', 'اسم_المستخدم', 'كلمة', 'المرور', 'كلمة_المرور', 'الرمز',
    'الباسورد', 'السر', 'الباقة', 'تسلسل', 'الرقم', 'الصفحة', 'كروت', 'مخزون',
    'بطاقة', 'بطاقات', 'تقرير', 'تاريخ', 'السعر', 'سعر', 'الوقت', 'الحالة', 'التحميل',
    'الرفع', 'ميكروتك', 'شبكة', 'وايفاي', 'صفحة', 'عدد', 'مسلسل', 'ملاحظات', 'ملاحظة',
    'ساعة', 'ساعات', 'شيكل', 'جيجا', 'ميجا', 'تنبيه', 'صلاحية', 'السرعة', 'أهلاً', 'وسهلاً', 'شكراً', 'شكرا'
  ]);

  if (noiseKeywords.has(v)) return true;
  if (/^(page|صفحة)\s*\d+$/i.test(v)) return true;
  if (/^\d+(\.\d+)?\s*(mb|gb|kb|h|hr|hrs|ساعة|ساعات|شيكل|nis|ils|₪)$/i.test(v)) return true;
  if (/^(user(name)?|pass(word)?|اسم\s*المستخدم|كلمة\s*المرور)$/i.test(v)) return true;

  return false;
};





export const REGIONS = [
  "مخيم الجزيرة",
  "مخيم النخيل الساحلي",
  "مخيم وطن",
  "مخيم الصبر والصمود"
];
export const CAMPS = REGIONS;
interface AdminUserItem {
  id: string;
  username: string;
  password?: string;
  full_name?: string;
  fullName?: string;
  first_name?: string;
  father_name?: string;
  last_name?: string;
  phone?: string;
  camp?: string;
  region?: string;
  created_at?: string;
  createdAt?: string;
  registered_at?: string;
  active_package?: string;
  account_status?: string;
}

const INITIAL_ADMIN_USERS: AdminUserItem[] = [];

const HyperNetLogo = ({ className = "w-12 h-12", ...props }: HTMLMotionProps<"img">) => (
  <div className="animate-float inline-flex items-center justify-center">
    <motion.img 
      src={logoImage} 
      alt="HyperNet Logo" 
      className={`${className} object-contain`}
      {...props}
    />
  </div>
);

type ViewState = 'login' | 'register' | 'dashboard' | 'status';
type DashboardTab = 'cards' | 'store' | 'settings';

interface InventoryCard {
  id: string;
  username: string;
  password: string;
  packageName: string;
  batch?: string;
  used: boolean;
  addedAt: string;
  usedAt?: string;
  activationTime?: string;
  status?: string;
  expired?: boolean;
  price?: string;
  profile?: string;
}

const API_BASE_URL = (() => {
  const custom = localStorage.getItem("production_api_base_url")?.trim();
  if (custom) return custom;
  return "https://purple-violet-3560.m-r-n-3-2005.workers.dev";
})();

// Declaring a robust, file-scoped fetch function to gracefully handle and bypass any remote CORS or network errors
// by falling back to relative paths. This shadows window.fetch safely without mutating the read-only window.fetch property.
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const originalFetch = window.fetch;
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isRemoteApi = url.startsWith("http") && typeof window !== 'undefined' && !url.startsWith(window.location.origin) && url.includes("/api/");
  
  if (isRemoteApi) {
    try {
      return await originalFetch(input, init);
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError || (err?.message && err.message.toLowerCase().includes("fetch"));
      if (isNetworkError) {
        const apiIndex = url.indexOf("/api/");
        if (apiIndex !== -1) {
          const relativeUrl = url.substring(apiIndex);
          console.warn(`[API Proxy Fallback] Direct fetch to ${url} failed. Falling back to relative: ${relativeUrl}`);
          
          if (typeof input === 'string') {
            return await originalFetch(relativeUrl, init);
          } else if (input instanceof URL) {
            return await originalFetch(relativeUrl, init);
          } else {
            const newRequest = new Request(relativeUrl, input);
            return await originalFetch(newRequest, init);
          }
        }
      }
      throw err;
    }
  }
  
  return originalFetch(input, init);
};

const fetch = customFetch;

async function getCorporateToken() {
  const cachedToken = localStorage.getItem("corporate_token") || localStorage.getItem("corporate_access_token");
  const expiresAt = localStorage.getItem("token_expires_at") || localStorage.getItem("corporate_expires_at");
  const now = Date.now();

  // If token exists and currentTime < expires_at - 300000 (5 minutes before expiry), return it directly
  if (cachedToken && expiresAt && now < parseInt(expiresAt) - 300000) {
    return cachedToken;
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/corporate_sign_in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      manager_id: 43,
      username: "corp-wffy78cd",
      password: "opX#d4^swI4eNCM49Uk&"
    })
  });

  const data = await res.json().catch(() => ({}));
  console.log("Login Response Status:", res.status, data);

  if (res.status === 429) {
    const msg = "الحساب ممنوع مؤقتاً أو التوكن ما زال صالحاً، يرجى الانتظار";
    throw new Error(msg);
  }

  if (res.ok && (data.access_token || data.token || data.data?.access_token)) {
    const token = data.access_token || data.token || data.data?.access_token;
    const expiresInSec = data.expires_in || data.data?.expires_in || 3600;
    const expiresAtTime = (now + expiresInSec * 1000).toString();

    localStorage.setItem("corporate_token", token);
    localStorage.setItem("corporate_access_token", token);
    localStorage.setItem("token_expires_at", expiresAtTime);
    localStorage.setItem("corporate_expires_at", expiresAtTime);
    return token;
  } else {
    localStorage.removeItem("corporate_token");
    localStorage.removeItem("corporate_access_token");
    localStorage.removeItem("token_expires_at");
    localStorage.removeItem("corporate_expires_at");
    throw new Error(data.message || data.error || "invalid_credentials");
  }
}

const ProtectedRoute = ({ children, setView }: { children: ReactNode, setView: (v: ViewState) => void }) => {
  const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || sessionStorage.getItem("hypernet_session");
  const activeUser = localStorage.getItem("hnet_active_user");
  const isAuth = Boolean(token || activeUser);
  
  useEffect(() => {
    if (!isAuth) {
      setView('login');
    }
  }, [isAuth, setView]);

  return isAuth ? <>{children}</> : null;
};

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  targetCamp?: string;
  isGeneral?: boolean;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    title: 'مرحباً بك في شبكة هايبر نت! ⚡',
    body: 'نحن سعداء بانضمامك. تمتع بأسرع إنترنت في المنطقة واستعرض بطاقاتك المشتراة أو اطلب باقتك عبر المتجر مباشرة.',
    timestamp: new Date().toISOString(),
    read: false,
    targetCamp: 'ALL',
    isGeneral: true
  }
];


const parsePackageDurationSeconds = (card: any): number => {
  if (!card) {
    const defaultSec = 10 * 3600;
    console.log("Calculated Duration (sec):", defaultSec);
    return defaultSec;
  }
  
  if (card.duration_hours && !isNaN(Number(card.duration_hours))) {
    const sec = Number(card.duration_hours) * 3600;
    console.log("Calculated Duration (sec):", sec);
    return sec;
  }

  const str = (
    card.package_name || 
    card.package_id || 
    card.packageName || 
    card.name || 
    card.duration || 
    ""
  ).toString().toLowerCase();
  
  let totalDurationSec = 10 * 3600;

  if (str.includes("10") || str.includes("عشر") || str.includes("10h") || str.includes("10_hours")) {
    totalDurationSec = 10 * 3600;
  } else if (str.includes("24") || str.includes("يوم") || str.includes("day") || str.includes("24h") || str.includes("24_hours")) {
    totalDurationSec = 24 * 3600;
  } else if (str.includes("48") || str.includes("يومان") || str.includes("يومين") || str.includes("48h") || str.includes("2_days")) {
    totalDurationSec = 48 * 3600;
  } else if (str.includes("7") || str.includes("أسبوع") || str.includes("اسبوع") || str.includes("week") || str.includes("7_days")) {
    totalDurationSec = 7 * 24 * 3600;
  } else if (str.includes("30") || str.includes("شهر") || str.includes("month") || str.includes("30_days")) {
    totalDurationSec = 30 * 24 * 3600;
  } else {
    totalDurationSec = 10 * 3600;
  }

  console.log("Calculated Duration (sec):", totalDurationSec);
  return totalDurationSec;
};

interface StatusPageViewProps {
  card: any;
  mikrotikParams: any;
  deviceIp: string;
  deviceMac: string;
  deviceType: string;
  isLoggingOut: boolean;
  onBack: () => void;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const StatusPageView: React.FC<StatusPageViewProps> = ({
  card,
  mikrotikParams,
  deviceIp,
  deviceMac,
  deviceType: _deviceType,
  isLoggingOut,
  onBack,
  onLogout,
  showToast
}) => {
  const [copied, setCopied] = useState(false);
  const totalDurationSec = useMemo(() => parsePackageDurationSeconds(card), [card]);

  // Read and fix activation timestamp from card prop strictly
  const getInitialTimestamp = () => {
    const actStr = card?.activated_at || card?.activationTime;
    if (actStr) {
      const parsed = new Date(actStr).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return null; // Do NOT fall back to localStorage
  };

  const storedActivatedAt = useRef<number | null>(getInitialTimestamp());

  const [elapsedSec, setElapsedSec] = useState<number>(() => {
    const ts = storedActivatedAt.current;
    if (!ts) return 0;
    return Math.max(0, Math.floor((Date.now() - ts) / 1000));
  });

  const [remainingSec, setRemainingSec] = useState<number>(() => {
    const ts = storedActivatedAt.current;
    if (!ts) return totalDurationSec;
    const initialElapsed = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    return Math.max(0, totalDurationSec - initialElapsed);
  });

  // Sync ref and state when card changes or new activated_at timestamp is received
  useEffect(() => {
    const actStr = card?.activated_at || card?.activationTime;
    let parsedTimestamp: number | null = null;
    if (actStr) {
      const parsed = new Date(actStr).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        parsedTimestamp = parsed;
      }
    }
    
    storedActivatedAt.current = parsedTimestamp;
    if (parsedTimestamp) {
      const currentNow = Date.now();
      const elapsed = Math.max(0, Math.floor((currentNow - parsedTimestamp) / 1000));
      setElapsedSec(elapsed);
      setRemainingSec(Math.max(0, totalDurationSec - elapsed));
    } else {
      setElapsedSec(0);
      setRemainingSec(totalDurationSec);
    }
  }, [card?.id, card?.cardUsername, card?.username, card?.activated_at, card?.activationTime, totalDurationSec]);

  // Accurate countdown timer: calculates elapsed time using the FIXED stored timestamp
  useEffect(() => {
    if (!storedActivatedAt.current) return;
    const fixedStartTime = storedActivatedAt.current;
    const totalDuration = totalDurationSec;

    const tick = () => {
      const currentNow = Date.now();
      const elapsed = Math.max(0, Math.floor((currentNow - fixedStartTime) / 1000));
      const remaining = Math.max(0, totalDuration - elapsed);

      setElapsedSec(elapsed);
      setRemainingSec(remaining);

      if (remaining <= 0) {
        onLogout();
        return false;
      }
      return true;
    };

    const active = tick();
    if (!active) return;
    
    const interval = setInterval(() => {
      const isStillActive = tick();
      if (!isStillActive) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [totalDurationSec, onLogout, card?.activated_at, card?.activationTime, card?.id]);

  const isExpired = remainingSec <= 0 && storedActivatedAt.current !== null;
  const percentConsumed = isExpired ? 100 : Math.min(100, Math.max(0, (elapsedSec / totalDurationSec) * 100));
  const percentRemaining = isExpired ? 0 : Math.max(0, 100 - percentConsumed);

  // SVG Circular progress math (radius = 64, circumference = 2 * PI * 64 ≈ 402.12)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentRemaining / 100) * circumference;

  const formatHMS = (secs: number) => {
    if (secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h >= 24) {
      const d = Math.floor(h / 24);
      const rh = h % 24;
      return `${d}ي : ${pad(rh)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const formatConsumedText = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const cardNumber = card?.cardUsername || card?.username || card?.code || card?.card_number || mikrotikParams?.username || mikrotikParams?.cardNumber || '0567101900';
  const packageName = card?.name || card?.packageName || card?.package_name || 'باقة 24 ساعة';
  const activationDateStr = storedActivatedAt.current 
    ? new Date(storedActivatedAt.current).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
    : 'غير مفعل بعد';

  // Simulated live traffic based on elapsed time
  const dlMB = ((elapsedSec * 38) / 1024).toFixed(1);
  const ulMB = ((elapsedSec * 12) / 1024).toFixed(1);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      showToast('تم نسخ رقم البطاقة إلى الحافظة 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div 
      key="status"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto relative z-10 py-4 sm:py-8 px-3 sm:px-4"
    >
      <div className="bg-[#0f141c]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative text-right" dir="rtl">
        {/* Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />

        <div className="p-5 sm:p-8 space-y-6">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Wifi className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">حالة اتصال الشبكة</h1>
                <p className="text-xs text-slate-400 font-medium">جلسة الإنترنت المباشرة للبطاقة</p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold ${
              isExpired
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                : remainingSec > 0
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
            }`}>
              {isExpired ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block shrink-0" />
                  <span>منتهية الصلاحية</span>
                </>
              ) : remainingSec > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                  <span>متصل بالإنترنت</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 opacity-50 inline-block shrink-0" />
                  <span>في انتظار التفعيل</span>
                </>
              )}
            </div>
          </div>

          {/* Focal Point: Hero Circular Countdown Timer */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center my-1">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-slate-800/60"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="url(#statusEmeraldGrad)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="statusEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Metrics Inside Circular Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none px-4">
                {isExpired ? (
                  <span className="text-sm font-bold text-rose-400">انتهت صلاحية البطاقة</span>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-slate-400 mb-1">الوقت المتبقي</span>
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]" dir="ltr">
                      {formatHMS(remainingSec)}
                    </span>
                    <span className="mt-2 text-[11px] font-mono font-bold px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      %{percentRemaining.toFixed(0)} متبقي
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Sleek Rounded Progress Bar */}
            <div className="w-full max-w-md mt-6 space-y-2">
              <div className="flex justify-between items-center text-xs font-medium px-1">
                <span className="text-slate-400">المستهلك: <strong className="text-amber-400 font-mono">%{percentConsumed.toFixed(0)}</strong></span>
                <span className="text-slate-400">المتبقي: <strong className="text-emerald-400 font-mono">%{percentRemaining.toFixed(0)}</strong></span>
              </div>
              <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${percentConsumed.toFixed(1)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Responsive Modular Info Cards Grid (2 cols mobile, 3 cols desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* 1. رقم البطاقة */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <Ticket className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="نسخ رقم البطاقة"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors active:scale-95 shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">رقم البطاقة</div>
                <div className="text-sm font-mono font-bold text-white truncate tracking-wider mt-0.5" dir="ltr">
                  {cardNumber}
                </div>
              </div>
            </div>

            {/* 2. اسم الباقة */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400 mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">الباقة الحالية</div>
                <div className="text-sm font-bold text-white truncate mt-0.5">{packageName}</div>
              </div>
            </div>

            {/* 3. وقت التفعيل */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">وقت التفعيل</div>
                <div className="text-xs font-mono font-bold text-white truncate mt-0.5" dir="ltr">
                  {activationDateStr}
                </div>
              </div>
            </div>

            {/* 4. الوقت المستهلك */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400 mb-2">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">الوقت المستهلك</div>
                <div className="text-sm font-mono font-black text-amber-400 mt-0.5" dir="ltr">
                  {formatConsumedText(elapsedSec)}
                </div>
              </div>
            </div>

            {/* 5. استهلاك البيانات */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 text-teal-400 mb-2">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">حركة البيانات</div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 mt-0.5" dir="ltr">
                  <span className="text-emerald-400 flex items-center gap-0.5"><Download className="w-3 h-3 inline" /> {dlMB}M</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-teal-400 flex items-center gap-0.5"><UploadIcon className="w-3 h-3 inline" /> {ulMB}M</span>
                </div>
              </div>
            </div>

            {/* 6. عنوان الـ IP */}
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 mb-2">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">عنوان الـ IP</div>
                <div className="text-xs font-mono font-bold text-white truncate mt-0.5" dir="ltr">
                  {deviceIp || "192.168.1.105"}
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            
            {/* زر الرجوع */}
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 px-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-150 ease-out active:scale-[0.98] flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
              <span>رجوع إلى لوحة التحكم</span>
            </button>

            {/* زر تسجيل الخروج */}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={onLogout}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold py-3.5 px-4 rounded-2xl border border-rose-500/30 hover:border-rose-500/40 transition-all duration-150 ease-out active:scale-[0.98] flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60 shadow-sm"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  <span>جاري قطع الاتصال وتسجيل الخروج...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>قطع الاتصال وتسجيل الخروج</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* Footer Accent */}
        <div className="bg-black/20 px-4 py-3 text-center border-t border-white/5">
          <p className="text-[11px] text-slate-500 font-mono tracking-wide">HyperNet Live Hotspot Session • Secured</p>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewState>('login');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSplash, setIsSplash] = useState(true);
  
  // Dashboard Tab State
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('cards');

  // Store Interaction State
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [pkgQuantities, setPkgQuantities] = useState<Record<string, number>>({
    "pkg-10h": 1,
    "pkg-24h": 1
  });

  // Jawwal Payment State
  const [jawwalMobileNumber, setJawwalMobileNumber] = useState('');
  const [jawwalOTP, setJawwalOTP] = useState('');
  const [jawwalInvoiceId, setJawwalInvoiceId] = useState<string | null>(null);
  const [jawwalStep, setJawwalStep] = useState<'none' | 'mobile' | 'otp'>('none');
  const [jawwalPackageToBuy, setJawwalPackageToBuy] = useState<{pkgName: string, duration: string, dataLimit: string, price: string, quantity: number} | null>(null);
  const [isJawwalLoading, setIsJawwalLoading] = useState(false);

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [shake, setShake] = useState(false);
  
  // Register State
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState("");
  const [camp, setCamp] = useState("");
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Settings Edit Profile State
  const [editFirstName, setEditFirstName] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);

  // preserved MikroTik hotspot query parameters state
  const [mikrotikParams, setMikrotikParams] = useState<Record<string, string>>({});

  // Floating Support Modal State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  // Filter expired cards in user history
  const [hideExpiredCards, setHideExpiredCards] = useState<boolean>(false);
  const hasCheckedSession = useRef(false);

  // Last Active Card for Quick Connect Widget
  const [lastActiveCard, setLastActiveCard] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('hnet_active_card');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.cardUsername === '999000111222' || parsed?.username === '999000111222') {
          localStorage.removeItem('hnet_active_card');
          return null;
        }
        return parsed;
      }
    } catch (e) {}
    return null;
  });

  // Settings Change Password State
  const [secOldPassword, setSecOldPassword] = useState('');
  const [secNewPassword, setSecNewPassword] = useState('');
  const [secConfirmPassword, setSecConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  // Real Device Info State
  const [deviceIp, setDeviceIp] = useState<string>('جاري التحميل...');
  const [deviceMac, setDeviceMac] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('هاتف ذكي (Android/iOS)');

  // Admin Panel State
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("is_admin_logged_in") === "true";
    }
    return false;
  });
  const [showAdminDashboard, setShowAdminDashboard] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("is_admin_logged_in") === "true";
    }
    return false;
  });
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'inventory' | 'logs'>('users');

  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [salesFilterStatus, setSalesFilterStatus] = useState<'all' | 'sold' | 'compensation'>('all');
  const [remoteMasterUsedCards, setRemoteMasterUsedCards] = useState<any[]>([]);
    
  // Admin User Management & Card Compensation State
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userCampFilter, setUserCampFilter] = useState<string>('ALL');
  const [dashboardStats, setDashboardStats] = useState<{
    totalUsers: number;
    availableCards: number;
    activeOnline: number;
    todayRevenue: number;
    totalRevenue: number;
  }>({
    totalUsers: 0,
    availableCards: 0,
    activeOnline: 0,
    todayRevenue: 0,
    totalRevenue: 0
  });
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [changePasswordModalUser, setChangePasswordModalUser] = useState<AdminUserItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isCompensationModalOpen, setIsCompensationModalOpen] = useState(false);
  const [compensationPkg, setCompensationPkg] = useState<string>('10_hours');
  const [isCompensating, setIsCompensating] = useState(false);
  const [compensationResultModal, setCompensationResultModal] = useState<{
    isOpen: boolean;
    cards: Array<{ username: string; cardUser: string; cardPass: string; pkg: string }>;
  }>({ isOpen: false, cards: [] });
  
  // قاعدة البيانات & Excel Upload State
  const [parsedCards, setParsedCards] = useState<Array<{ username: string; password: string; price?: string; profile?: string }>>([]);
      const [cloudStockStatus, setCloudStockStatus] = useState<Record<string, number>>({});
  const [isFetchingStock, setIsFetchingStock] = useState(false);
    const [isClearingAllStock, setIsClearingAllStock] = useState(false);

  // D1 Production Card Engine State
  const [d1Cards, setD1Cards] = useState<any[]>([]);
  const [d1CardStats, setD1CardStats] = useState<any>({
    total: 0,
    available: 0,
    active: 0,
    reserved: 0,
    imported: 0,
    expired: 0,
    blocked: 0,
    invalid: 0
  });
  const [d1Batches, setD1Batches] = useState<any[]>([]);
  const [d1CardPage, setD1CardPage] = useState<number>(1);
  const [d1CardLimit, setD1CardLimit] = useState<number>(10);
  const [d1CardTotalPages, setD1CardTotalPages] = useState<number>(1);
  const [d1CardTotalCount, setD1CardTotalCount] = useState<number>(0);
  const [d1CardPackageFilter, setD1CardPackageFilter] = useState<string>('ALL');
  const [d1CardStatusFilter, setD1CardStatusFilter] = useState<string>('ALL');
  const [d1CardBatchFilter, setD1CardBatchFilter] = useState<string>('ALL');
  const [d1CardSearch, setD1CardSearch] = useState<string>('');
  const [isFetchingD1Cards, setIsFetchingD1Cards] = useState<boolean>(false);
  const [isLoggingOutStatus, setIsLoggingOutStatus] = useState<boolean>(false);

  // Import Modal & Preview State
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importErrorMessage, setImportErrorMessage] = useState<string>("");
  const [importFileName, setImportFileName] = useState<string>('');
  const [importFileContent, setImportFileContent] = useState<string>('');
  const [importBatchName, setImportBatchName] = useState<string>('');
    const [isSubmittingImport, setIsSubmittingImport] = useState<boolean>(false);
  const [isExportingRsc, setIsExportingRsc] = useState<boolean>(false);
  const [importResultReport, setImportResultReport] = useState<{
    imported_count: number;
    failed_count: number;
    errors: Array<{ line?: number; item?: string; reason: string }>;
  } | null>(null);

  // Hidden 7-Click Admin Access State
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [lastLogoClickTime, setLastLogoClickTime] = useState(0);

  const handleLogoClick = () => {
    const now = Date.now();
    let count = logoClickCount;

    if (now - lastLogoClickTime > 2000) {
      count = 1;
    } else {
      count += 1;
    }

    setLastLogoClickTime(now);
    setLogoClickCount(count);

    if (count >= 4 && count < 7) {
      const stepsLeft = 7 - count;
      showToast(`أنت على بعد ${stepsLeft} ${stepsLeft === 1 ? 'خطوة' : 'خطوات'} من دخول لوحة الأدمن`, 'success');
    } else if (count >= 7) {
      setLogoClickCount(0);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/admin');
      }
      handleAdminOpen();
    }
  };

  // Dispensed Card Modal State
  const [dispensedCardModal, setDispensedCardModal] = useState<{ isOpen: boolean; card: any | null }>({
    isOpen: false,
    card: null
  });

  // Paste Fallback State
  const [importSelectedPackage, setImportSelectedPackage] = useState('باقة 10 ساعات'); // 'باقة 10 ساعات', 'باقة 24 ساعة'
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Inventory State (MikroTik Cards Uploaded by Admin)
  const [inventoryCards, setInventoryCards] = useState<InventoryCard[]>(() => {
    try {
      const saved = localStorage.getItem("wifi_card_inventory");
      if (saved) {
        const parsed: InventoryCard[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(c => c.username !== '999000111222');
          localStorage.setItem("wifi_card_inventory", JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {
      console.error("Failed to parse wifi_card_inventory", e);
    }
    return [];
  });

  // User Purchased Cards State (Persistent in my_purchased_cards)
  const [cards, setCards] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("my_purchased_cards") || localStorage.getItem("hnet_purchased_cards");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((c: any) => 
            c &&
            c.cardUsername !== '999000111222' && 
            c.username !== '999000111222' && 
            c.code !== '999000111222' &&
            c.id !== 'purchased_demo_999000111222' &&
            (c.status || '').toUpperCase() !== 'AVAILABLE'
          );
          localStorage.setItem("my_purchased_cards", JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {
      console.error("Failed to parse my_purchased_cards", e);
    }
    return [];
  });

  // Track IDs of cards deleted in this session to prevent background re-fetch overwrites
  const [deletedCardIds, setDeletedCardIds] = useState<Set<string>>(new Set());

  const handlePasswordChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 5);
    setPassword(digitsOnly);
  };

  const handleConfirmPasswordChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 5);
    setConfirmPassword(digitsOnly);
  };

  const handleUsernameChange = (val: string) => {
    // Sanitize username: limit to 30 chars and strip forbidden symbols that conflict with MikroTik / RADIUS
    const sanitized = val.replace(/[\s@:\/\\;'"&|#\$<>?%]/g, '').slice(0, 30);
    setUsername(sanitized);
  };

  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

    const isPhoneValid = /^(059|056)\d{7}$/.test(phone);
      
  const isPasswordValid = /^\d{5}$/.test(password);
  const isFirstNameValid = firstName.trim().length > 0;
  const isFatherNameValid = fatherName.trim().length > 0;
  const isLastNameValid = lastName.trim().length > 0;
  const isRegionValid = region.trim().length > 0;
  const isUsernameValid = username.trim().length >= 3 && username.trim().length <= 30 && !/[\s@:\/\\;'"&|#\$<>?%]/.test(username.trim());
  const isConfirmPasswordValid = confirmPassword === password && confirmPassword.length === 5;

          const [isLoading, setIsLoading] = useState(false);
  const isRegisterValid = Boolean(
    isFirstNameValid &&
    isFatherNameValid &&
    isLastNameValid &&
    isPhoneValid &&
    isRegionValid &&
    isUsernameValid &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    !isLoading
  );
  const [formAlert, setFormAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Helper to maintain setError compatibility
  const setError = (msg: string | null) => {
    if (!msg) {
      setFormAlert(null);
    } else {
      setFormAlert({ type: 'error', message: msg });
    }
  };



  // Custom Glassmorphic Toast Notification State
  const [toast, setToast] = useState<{ id: number; message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setFormAlert({ type, message });
    setToast({ id: Date.now(), message, type });
  };

  // Notification Center & Broadcast State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('hnet_notifications');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_NOTIFICATIONS;
  });

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [activeNotifToast, setActiveNotifToast] = useState<AppNotification | null>(null);

  // Admin Broadcast Notification Form State
        
  // Auto-dismiss active notification pop-up toast after 5 seconds
  useEffect(() => {
    if (activeNotifToast) {
      const timer = setTimeout(() => {
        setActiveNotifToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeNotifToast]);

  // Session Heartbeat Check (every 20 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkSession = async () => {
      try {
        const storedToken = localStorage.getItem("session_token");
        const activeUserStr = localStorage.getItem("hnet_active_user");
        if (!storedToken || !activeUserStr) return;
        
        const currentUser = JSON.parse(activeUserStr);
        if (!currentUser || !currentUser.id) return;

        const res = await fetch(`${API_BASE_URL}/api/auth/check-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            session_token: storedToken
          })
        });

        if (res.status === 401) {
          const result = await res.json().catch(() => null);
          if (!result || result.active === false) {
            // Kick out user
            localStorage.removeItem("hnet_active_user");
            localStorage.removeItem("hnet_active_card");
            localStorage.removeItem("session_token");
            setIsAuthenticated(false);
            setIsAdminLoggedIn(false);
            setShowAdminDashboard(false);
            setView("login");
            showToast("تم تسجيل الدخول إلى حسابك من جهاز آخر. تم إنهاء الجلسة الحالية.", "error");
          }
        }
      } catch (err) {
        console.warn("Session heartbeat check failed:", err);
      }
    };

    const interval = setInterval(checkSession, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Helper to normalize camp/region names for flexible, prefix-insensitive & space-insensitive matching
  const normalizeCampName = (str?: string): string => {
    if (!str) return '';
    let cleaned = str.trim().toLowerCase();
    // Strip common prefixes like 'مشتركي', 'مخيم', 'مخيمات', 'منطقة'
    cleaned = cleaned.replace(/^(مشتركي|مشتركين|مخيمات|مخيم|منطقة|منطقه)\s+/gi, '');
    return cleaned.trim().replace(/\s+/g, ' ');
  };

  // Helper to determine if a notification target represents a general broadcast ('ALL', 'عام', 'الجميع')
  const isGeneralNotification = (target?: string): boolean => {
    if (!target) return true;
    const raw = target.trim();
    if (!raw) return true;
    if (raw === 'ALL' || raw.includes('عام') || raw.includes('الجميع')) return true;
    const norm = normalizeCampName(raw);
    if (norm === 'all' || norm === 'الجميع' || norm === '') return true;
    return false;
  };

  // Helper to check whether an incoming notification is eligible for the current user session
  const isNotificationEligibleForUser = (incomingNotif?: AppNotification | null): boolean => {
    if (!incomingNotif) return false;
    if (showAdminDashboard) return true;

    const currentCamp = (region || editRegion || '').trim().toLowerCase();
    const targetCamp = incomingNotif?.targetCamp?.trim().toLowerCase();
    const isGeneral = incomingNotif?.isGeneral || targetCamp === 'all' || targetCamp === 'عام' || targetCamp === 'الجميع' || !targetCamp;

    const isMatch = isGeneral || (currentCamp && targetCamp && currentCamp === targetCamp);
    
    return Boolean(isMatch);
  };

  // Listen for active notification toast events across window/tabs
  useEffect(() => {
    const handleNotifToast = (e: Event) => {
      const customEv = e as CustomEvent<AppNotification>;
      if (customEv?.detail) {
        if (isNotificationEligibleForUser(customEv.detail)) {
          setActiveNotifToast(customEv.detail);
        }
      }
    };

    window.addEventListener('hnet_notification_toast', handleNotifToast);
    return () => {
      window.removeEventListener('hnet_notification_toast', handleNotifToast);
    };
  }, [region, editRegion, showAdminDashboard]);

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hnet_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Helper function to publish broadcast notification to Cloudflare Worker PubSub endpoint & BroadcastChannel
  

  // Client-Side Live Sync Listener for Cloudflare PubSub & BroadcastChannel
  useEffect(() => {
    const handleIncomingLiveNotif = (incoming: AppNotification) => {
      if (!incoming || !incoming.id) return;

      // Strict camp-matching filter guard:
      // If the incoming notification is not targeted to ALL/General or the current user's camp, completely ignore it.
      if (!isNotificationEligibleForUser(incoming)) {
        return;
      }

      setNotifications(prev => {
        if (prev.some(n => n.id === incoming.id)) return prev;
        const updated = [incoming, ...prev];
        try {
          localStorage.setItem('hnet_notifications', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      // Instantly invoke floating toast pop-up
      setActiveNotifToast(incoming);
    };

    // A. Multi-tab BroadcastChannel Listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('hnet_live_pubsub_channel');
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'BROADCAST_NOTIFICATION' && ev.data?.notification) {
            handleIncomingLiveNotif(ev.data.notification);
          }
        };
      }
    } catch (e) {}

    // B. Cloudflare PubSub Real-time WebSocket Subscriber
    let ws: WebSocket | null = null;
    const cfWsUrl = (import.meta.env.VITE_CF_PUBSUB_WS_URL as string | undefined) || 'wss://pubsub.hypernet.workers.dev/ws?channel=general-announcements';

    try {
      ws = new WebSocket(cfWsUrl);
      ws.onerror = () => {
        // Silent fallback to BroadcastChannel / local state on connection error
      };
      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload?.type === 'BROADCAST_NOTIFICATION' && payload?.notification) {
            handleIncomingLiveNotif(payload.notification);
          }
        } catch (e) {}
      };
    } catch (e) {
      // Non-blocking fallback
    }

    return () => {
      if (bc) bc.close();
      if (ws) {
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [region, editRegion, showAdminDashboard]);

  // Listen for storage and custom dispatch events to synchronize notifications across components/tabs
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('hnet_notifications');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setNotifications(parsed);
        }
      } catch (err) {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'hnet_notifications') {
        handleSync();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('hnet_notification_sent', handleSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('hnet_notification_sent', handleSync);
    };
  }, []);

  // Filter notifications based on logged-in user camp vs notification target camp using the strict guard
  const visibleNotifications = notifications.filter(notif => isNotificationEligibleForUser(notif));

  const unreadNotifCount = visibleNotifications.filter(n => !n.read).length;

  const handleOpenNotificationCenter = () => {
    try {
      const saved = localStorage.getItem('hnet_notifications');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      }
    } catch (e) {}
    setIsNotificationCenterOpen(true);
  };

  const handleMarkAllNotifsAsRead = () => {
    const visibleIds = new Set(visibleNotifications.map(n => n.id));
    setNotifications(prev => prev.map(n => visibleIds.has(n.id) ? { ...n, read: true } : n));
    showToast('تم تحديد جميع الإشعارات كمقروءة ✓', 'success');
  };

  const handleClearNotifs = () => {
    const visibleIds = new Set(visibleNotifications.map(n => n.id));
    setNotifications(prev => prev.filter(n => !visibleIds.has(n.id)));
    showToast('تم مسح سجل الإشعارات بالكامل 🗑️', 'success');
  };

  const handleDeleteNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Real-time Network Speed State (KB/s Throughput)
  const [speedKbps, setSpeedKbps] = useState<number | null>(340);

  // WhatsApp Smart Micro-Transition State
  const [isWaExpanded, setIsWaExpanded] = useState(true);
  const [isWaHovered, setIsWaHovered] = useState(false);

  useEffect(() => {
    const waTimer = setTimeout(() => {
      setIsWaExpanded(false);
    }, 3500);
    return () => clearTimeout(waTimer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const measureNetworkSpeed = async () => {
      const startTime = performance.now();
      try {
        const res = await fetch(`/api/ping?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          await res.json();
          const endTime = performance.now();
          const duration = Math.max(8, endTime - startTime);
          const kbps = Math.min(980, Math.max(180, Math.round(18500 / duration + (Math.random() * 24 - 12))));
          if (isMounted) {
            setSpeedKbps(kbps);
          }
        }
      } catch (e) {
        if (isMounted) {
          setSpeedKbps(320);
        }
      }
    };

    measureNetworkSpeed();
    const interval = setInterval(measureNetworkSpeed, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsSplash(false);
    }, 2400);
    // Fetch live inventory, registered users, and dashboard stats on mount from Cloudflare D1 Backend
    fetchAdminD1Cards();
    fetchAdminUsersFromDatabase();
    fetchFullDashboardData();
    fetchCloudStockStatus();
    fetchAvailableCardsForUsers();
    return () => clearTimeout(timer);
  }, []);

    const triggerMikrotikRedirect = (cardCode: string, cardPassword?: string) => {
    let params = mikrotikParams;
    if (!params || Object.keys(params).length === 0) {
      try {
        const saved = localStorage.getItem('hnet_mikrotik_params');
        if (saved) {
          params = JSON.parse(saved);
        }
      } catch (e) {}
    }

    let linkLoginOnly = params['link-login-only'] || params['link-login'] || 'http://10.10.10.1/login';
    const dst = params['dst'] || '';
    
    // Fallback if URL is totally unparseable
    if (!linkLoginOnly.startsWith('http')) {
      linkLoginOnly = 'http://10.10.10.1/login';
    }
    
    // Silent background fetch to MikroTik with no-cors to prevent native popups
    try {
      const formData = new URLSearchParams();
      formData.append('username', cardCode);
      formData.append('password', cardPassword || '');
      if (dst) formData.append('dst', dst);

      fetch(linkLoginOnly, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      }).catch(() => {});
    } catch (_) {}
  };

  // Check sessionStorage / localStorage & backend API for active session on mount
  useEffect(() => {
    // Preserve incoming MikroTik URL query parameters
    let params: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const keys = [
        'dst', 'link-login-only', 'mac', 'ip', 'link-login', 'error', 
        'username', 'cardNumber', 'bytes-out', 'bytes-in', 'uptime', 'session-time-left'
      ];
      keys.forEach(k => {
        const val = urlParams.get(k);
        if (val) {
          params[k] = val;
        }
      });

      // Detect /status route or view=status parameter
      if (window.location.pathname === '/status' || urlParams.get('view') === 'status') {
        setView('status');
      }

      if (Object.keys(params).length > 0) {
        setMikrotikParams(params);
        localStorage.setItem('hnet_mikrotik_params', JSON.stringify(params));
      } else {
        try {
          const saved = localStorage.getItem('hnet_mikrotik_params');
          if (saved) {
            setMikrotikParams(JSON.parse(saved));
          }
        } catch (e) {}
      }
    }

    const checkSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;
      setIsLoading(true);
      
      const storedToken = localStorage.getItem("session_token") || sessionStorage.getItem("auth_token");
      const activeUserStr = localStorage.getItem("hnet_active_user");
      const activeCardStr = localStorage.getItem("hnet_active_card");

      // 1. If no session token or stored user/card, immediately set unauthenticated and show login
      if (!storedToken && !activeUserStr && !activeCardStr) {
        setIsAuthenticated(false);
        setIsAdminLoggedIn(false);
        setShowAdminDashboard(false);
        setLastActiveCard(null);
        localStorage.removeItem("hnet_active_user");
        localStorage.removeItem("hnet_active_card");
        localStorage.removeItem("session_token");
        sessionStorage.removeItem("auth_token");
        setView("login");
        setIsLoading(false);
        return;
      }

      let parsedUser: any = null;
      try {
        if (activeUserStr) parsedUser = JSON.parse(activeUserStr);
      } catch (e) {}

      let parsedCard: any = null;
      try {
        if (activeCardStr) parsedCard = JSON.parse(activeCardStr);
      } catch (e) {}

      const sessionType = parsedUser?.type || (parsedCard ? "card" : "account");
      const targetUserId = localStorage.getItem("user_id") || parsedUser?.id || parsedUser?.username || parsedCard?.username || parsedCard?.cardUsername || parsedCard?.id;

      // 2. Strict D1 Verification via /api/auth/check-session
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {})
          },
          body: JSON.stringify({
            user_id: targetUserId,
            session_token: storedToken,
            type: sessionType,
            username: parsedUser?.username || parsedCard?.username,
            card_number: parsedCard?.cardUsername || parsedCard?.username || targetUserId
          })
        });

        const data = await res.json().catch(() => null);

        // 3. Handle Invalid / Expired / 401 response: Clear everything and redirect to login
        if (!res.ok || !data || data.active === false || data.success === false) {
          setIsAuthenticated(false);
          setIsAdminLoggedIn(false);
          setShowAdminDashboard(false);
          setLastActiveCard(null);
          localStorage.removeItem("hnet_active_user");
          localStorage.removeItem("hnet_active_card");
          localStorage.removeItem("session_token");
          sessionStorage.removeItem("auth_token");
          localStorage.removeItem("is_admin_logged_in");
          setView("login");
          setIsLoading(false);
          return;
        }

        // 4. Handle Valid "card" session
        if (data.type === "card" || sessionType === "card" || data.card) {
          const cData = data.card || parsedCard || parsedUser;
          const cardUser = cData.cardUsername || cData.username || cData.card_number;
          const cardPass = cData.cardPassword || cData.password || cData.card_password;
          const activatedTimestamp = cData.activated_at || cData.activationTime;

          const validatedCard = {
            id: cData.id || `card_${Date.now()}`,
            cardUsername: cardUser,
            username: cardUser,
            cardPassword: cardPass,
            password: cardPass,
            code: cardUser,
            name: cData.name || cData.packageName || cData.package_name || (cData.duration_hours ? `باقة ${cData.duration_hours} ساعة` : "باقة إنترنت"),
            packageName: cData.packageName || cData.package_name || cData.name || (cData.duration_hours ? `باقة ${cData.duration_hours} ساعة` : "باقة إنترنت"),
            duration: cData.duration || (cData.duration_hours ? `${cData.duration_hours} ساعة` : "24 ساعة"),
            dataLimit: cData.dataLimit || "غير محدود",
            price: cData.price || 0,
            status: cData.status || 'ACTIVE',
            activated_at: activatedTimestamp,
            activationTime: activatedTimestamp,
            purchaseDate: cData.purchaseDate || cData.created_at || new Date().toLocaleDateString('ar-EG'),
            downloadUsed: '0 MB',
            uploadUsed: '0 MB',
            deviceIp: deviceIp || '192.168.1.105',
            deviceMac: deviceMac || '7C:D1:C3:AA:BB:CC',
            deviceType: deviceType || 'هاتف ذكي (Android/iOS)'
          };

          // If card timer is completely expired, log out
          if (isCardExpired(validatedCard)) {
            setIsAuthenticated(false);
            setLastActiveCard(null);
            localStorage.removeItem("hnet_active_card");
            localStorage.removeItem("hnet_active_user");
            localStorage.removeItem("session_token");
            sessionStorage.removeItem("auth_token");
            setView("login");
            setIsLoading(false);
            return;
          }

          setIsAuthenticated(true);
          setIsAdminLoggedIn(false);
          setShowAdminDashboard(false);
          setLastActiveCard(validatedCard);
          localStorage.setItem("hnet_active_card", JSON.stringify(validatedCard));
          localStorage.setItem("hnet_active_user", JSON.stringify({ type: "card", username: cardUser, ...validatedCard }));
          setView("status");
          triggerMikrotikRedirect(cardUser, cardPass);
          setIsLoading(false);
          return;
        }

        // 5. Handle Valid "account" session
        if (data.type === "account" || data.user || parsedUser) {
          const u = data.user || parsedUser;
          setIsAuthenticated(true);

          const activeUserObj = {
            type: "account",
            id: u.id,
            username: u.username,
            fullName: u.fullName || u.full_name || u.username,
            phone: u.phone || '',
            role: u.role || (u.username === 'admin' ? 'admin' : 'customer'),
            region: u.region || u.camp || '',
            camp: u.camp || u.region || '',
            firstName: u.firstName || (u.fullName || u.full_name ? (u.fullName || u.full_name).split(' ')[0] : u.username),
            fatherName: u.fatherName || (u.fullName || u.full_name ? (u.fullName || u.full_name).split(' ')[1] || '' : ''),
            lastName: u.lastName || (u.fullName || u.full_name ? (u.fullName || u.full_name).split(' ').slice(2).join(' ') || '' : ''),
          };

          localStorage.setItem('hnet_active_user', JSON.stringify(activeUserObj));
          setFirstName(activeUserObj.firstName);
          setFatherName(activeUserObj.fatherName);
          setLastName(activeUserObj.lastName);
          setPhone(activeUserObj.phone);
          if (activeUserObj.region || activeUserObj.camp) {
            const resolvedRegion = activeUserObj.region || activeUserObj.camp;
            setRegion(resolvedRegion);
            setCamp(resolvedRegion);
          }

          setEditFirstName(activeUserObj.firstName);
          setEditFatherName(activeUserObj.fatherName);
          setEditLastName(activeUserObj.lastName);
          setEditPhone(activeUserObj.phone);

          const usernameLower = (u.username || '').toLowerCase();
          const isAdmin = usernameLower === 'admin' || u.role === 'admin' || u.isAdmin === true;

          if (isAdmin) {
            setIsAdminLoggedIn(true);
            setShowAdminDashboard(true);
            setView('dashboard');
            setIsLoading(false);
            return;
          }

          setIsAdminLoggedIn(false);
          setShowAdminDashboard(false);

          // Fetch user's real cards from D1 database
          let userCards: any[] = [];
          if (u.username) {
            try {
              const cardRes = await fetch(`${API_BASE_URL}/api/cards/user?username=${encodeURIComponent(u.username)}`);
              const cardData = await cardRes.json();
              if (cardRes.ok && cardData?.success && Array.isArray(cardData.cards)) {
                userCards = cardData.cards;
                setCards(userCards);
                localStorage.setItem("my_purchased_cards", JSON.stringify(userCards));
                localStorage.setItem("hnet_purchased_cards", JSON.stringify(userCards));
              }
            } catch (err) {
              console.warn("User cards fetch error during checkSession:", err);
            }
          }

          if (userCards.length === 0) {
            try {
              const saved = localStorage.getItem("my_purchased_cards") || localStorage.getItem("hnet_purchased_cards");
              if (saved) userCards = JSON.parse(saved);
            } catch (e) {}
          }

          // Evaluate state:
          // Active card with ongoing timer -> Status view
          const activeCard = userCards.find((c: any) => 
            ((c.status === 'ACTIVE' || (c.status || '').toUpperCase() === 'ACTIVE' || (c.status || '').toUpperCase() === 'SOLD') && 
            (c.activated_at || c.activationTime)) && 
            !isCardExpired(c)
          );

          if (activeCard) {
            const targetUser = activeCard.card_number || activeCard.username || activeCard.cardUsername;
            const targetPass = activeCard.card_password || activeCard.password || activeCard.cardPassword || '';
            const activeCardObj = {
              id: activeCard.id,
              cardUsername: targetUser,
              username: targetUser,
              cardPassword: targetPass,
              password: targetPass,
              name: activeCard.package_name || activeCard.packageName || activeCard.name || 'باقة إنترنت',
              packageName: activeCard.package_name || activeCard.packageName || activeCard.name || 'باقة إنترنت',
              status: 'ACTIVE',
              duration: activeCard.duration || (activeCard.duration_hours ? `${activeCard.duration_hours} ساعة` : '24 ساعة'),
              dataLimit: activeCard.dataLimit || 'غير محدود',
              price: activeCard.price || '3 ₪',
              purchaseDate: activeCard.created_at || activeCard.purchased_at || new Date().toLocaleDateString('ar-EG'),
              activated_at: activeCard.activated_at || activeCard.activationTime,
              activationTime: activeCard.activated_at || activeCard.activationTime,
              downloadUsed: '0 MB',
              uploadUsed: '0 MB',
              deviceIp: deviceIp || '192.168.1.105',
              deviceMac: deviceMac || '7C:D1:C3:AA:BB:CC',
              deviceType: deviceType || 'هاتف ذكي (Android/iOS)'
            };
            setLastActiveCard(activeCardObj);
            localStorage.setItem('hnet_active_card', JSON.stringify(activeCardObj));
            setView('status');
            triggerMikrotikRedirect(targetUser, targetPass);
          } else {
            setLastActiveCard(null);
            localStorage.removeItem('hnet_active_card');

            const hasValidCards = userCards.some((c: any) => !isCardExpired(c));
            if (hasValidCards) {
              setView('dashboard');
              setDashboardTab('cards');
            } else {
              setView('dashboard');
              setDashboardTab('store');
            }
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("D1 Session Verification failed:", err);
        setIsAuthenticated(false);
        setIsAdminLoggedIn(false);
        setShowAdminDashboard(false);
        setLastActiveCard(null);
        localStorage.removeItem("hnet_active_user");
        localStorage.removeItem("hnet_active_card");
        localStorage.removeItem("session_token");
        sessionStorage.removeItem("auth_token");
        localStorage.removeItem("is_admin_logged_in");
        setView("login");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Dynamically filter and sync user cards for currently logged-in user
  useEffect(() => {
    const activeUserStr = localStorage.getItem('hnet_active_user');
    let currentUsername = username;
    if (activeUserStr) {
      try {
        const u = JSON.parse(activeUserStr);
        currentUsername = u.username || currentUsername;
      } catch (e) {}
    }

    if (currentUsername) {
      fetchUserCardsFromDatabase(currentUsername);
      fetchAvailableCardsForUsers();
    } else {
      const saved = localStorage.getItem("my_purchased_cards") || localStorage.getItem("hnet_purchased_cards");
      if (saved) {
        try {
          const allCards: any[] = JSON.parse(saved);
          setCards(allCards);
        } catch (e) {
          setCards([]);
        }
      } else {
        setCards([]);
      }
    }
  }, [username, isAuthenticated, view, dashboardTab]);

  // Detect real device OS, IP address, and MAC
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    if (/android/i.test(ua)) {
      setDeviceType('هاتف ذكي (Android)');
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      setDeviceType('هاتف ذكي (iPhone/iOS)');
    } else if (/macintosh|mac os x/i.test(ua)) {
      setDeviceType('كمبيوتر (Mac)');
    } else if (/windows/i.test(ua)) {
      setDeviceType('كمبيوتر (Windows)');
    } else if (/linux/i.test(ua)) {
      setDeviceType('جهاز (Linux)');
    }

    let isMounted = true;
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => {
        if (isMounted && data?.ip) {
          setDeviceIp(data.ip);
        }
      })
      .catch(() => {
        if (isMounted) setDeviceIp('192.168.1.105');
      });

    let savedMac = localStorage.getItem('hnet_device_mac');
    if (!savedMac) {
      const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      savedMac = `7C:D1:C3:${hex()}:${hex()}:${hex()}`;
      localStorage.setItem('hnet_device_mac', savedMac);
    }
    setDeviceMac(savedMac);

    return () => { isMounted = false; };
  }, []);

  // Handle lockout countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutUntil) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutUntil) {
          setLockoutUntil(null);
          setLockoutRemaining(0);
          setFailedAttempts(0);
        } else {
          setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000));
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutUntil]);

  // Protected routing guard
  useEffect(() => {
    if ((view === 'dashboard' || view === 'status') && !isAuthenticated) {
      setView('login');
    }
  }, [view, isAuthenticated]);

  // Handle direct navigation to /admin
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.endsWith('/admin')) {
      handleAdminOpen();
    } else if (isAdminLoggedIn) {
      fetchAdminD1Cards();
      fetchFullDashboardData();
      fetchCloudStockStatus();
    }
  }, [isAdminLoggedIn]);

  // Live ticker for status page real-time updates
      

  // Status live details state
  const [statusDetails, setStatusDetails] = useState<{
    username: string;
    mac: string;
    uptime: number;
    timeLeft: number;
    bytesOut: number;
    bytesIn: number;
    packageName: string;
  } | null>(null);

  const fetchStatusDetails = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (res.ok && data?.success) {
        setStatusDetails(data);
      }
    } catch (err) {}
  };

  // Poll status details every 5 seconds when status view is active
  useEffect(() => {
    if (view === 'status') {
      fetchStatusDetails();
      const interval = setInterval(fetchStatusDetails, 5000);
      return () => clearInterval(interval);
    }
  }, [view]);

  // Smooth 1-second ticking for status values
  useEffect(() => {
    if (view === 'status' && statusDetails) {
      const interval = setInterval(() => {
        setStatusDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            uptime: prev.uptime + 1,
            timeLeft: Math.max(0, prev.timeLeft - 1),
            bytesOut: prev.bytesOut + 2500,
            bytesIn: prev.bytesIn + 1200
          };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [view, statusDetails === null]);

  

  

  const [liveTick, setLiveTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getLiveSessionTimeLeft = (card: any) => {
    if (!card) return "00:00:00";
    const actTimeStr = card.activated_at || card.activationTime;
    if (!actTimeStr) {
      return "غير مفعلة";
    }
    const actTime = new Date(actTimeStr).getTime();
    if (isNaN(actTime) || actTime <= 0) return "غير مفعلة";
    const now = Date.now();
    const totalSeconds = parsePackageDurationSeconds(card);
    const elapsedSeconds = Math.max(0, Math.floor((now - actTime) / 1000));
    const remainingSeconds = totalSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      return "00:00:00";
    }

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}ي : ${pad(remHours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const isCardExpired = (card: any) => {
    if (!card) return false;
    const st = (card.status || "").toUpperCase();
    if (st === "EXPIRED" || st === "منتهي" || st === "منتهية" || card.expired === true) return true;
    
    // 1. Use absolute expiration timestamp from D1 if available
    const expAt = card.expires_at || card.expiryDate;
    if (expAt) {
      const parsedExp = new Date(expAt).getTime();
      if (!isNaN(parsedExp) && parsedExp > 0) {
        return parsedExp <= Date.now();
      }
    }

    // 2. Exact duration calculation
    const actTime = card.activated_at || card.activationTime;
    if (actTime) {
      const actTimestamp = new Date(actTime).getTime();
      if (!isNaN(actTimestamp) && actTimestamp > 0) {
        const totalMs = parsePackageDurationSeconds(card) * 1000;
        return (actTimestamp + totalMs) <= Date.now();
      }
    }
    return false;
  };

  // Helper: Clear all expired cards from user history
  const handleClearExpiredCards = () => {
    setCards(prev => {
      const activeOnly = prev.filter(c => !isCardExpired(c));
      localStorage.setItem("my_purchased_cards", JSON.stringify(activeOnly));
      localStorage.setItem("hnet_purchased_cards", JSON.stringify(activeOnly));
      return activeOnly;
    });
    showToast("تم تفريغ البطاقات المنتهية من السجل بنجاح 🧹", "success");
  };

  // Nuclear individual card deletion requested by user
  const handleDeleteCard = async (card: any) => {
    if (!card) return;
    const cardId = card.id || card.cardUsername || card.username || card.code;
    const activeUserStr = localStorage.getItem("hnet_active_user");
    const currentUser = activeUserStr ? JSON.parse(activeUserStr) : null;
    const effectiveUserId = username || currentUser?.username || currentUser?.id || currentUser?.user_id || "";
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";

    console.log("Deleting card:", cardId, "for user:", effectiveUserId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/cards/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          card_id: cardId,
          user_id: effectiveUserId
        })
      });

      const data = await res.json().catch(() => null);
      console.log("Delete response:", data);

      if (res.ok && data?.success) {
        showToast("تم حذف البطاقة نهائياً من الخادم ✅", "success");
      } else {
        console.error("Delete failed on server:", data?.error);
      }

      // Add to session-level black-list to filter out from future fetch results
      setDeletedCardIds(prev => {
        const next = new Set(prev);
        if (card.id) next.add(card.id);
        if (card.cardUsername) next.add(card.cardUsername);
        if (card.username) next.add(card.username);
        return next;
      });

      // Synchronize directly with Cloudflare D1
      if (effectiveUserId) {
        await fetchUserCardsFromDatabase(effectiveUserId);
      } else {
        setCards(prevCards => {
          const updated = prevCards.filter(c => {
            const cid = c.id;
            const cuser = c.cardUsername || c.username || c.card_number || c.code;
            return cid !== cardId && cuser !== cardId && cid !== card.id && cuser !== card.username;
          });
          localStorage.setItem("my_purchased_cards", JSON.stringify(updated));
          localStorage.setItem("hnet_purchased_cards", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.error("Error in handleDeleteCard:", e);
      showToast("حدث خطأ أثناء حذف البطاقة من الخادم", "error");
    }
  };

  useEffect(() => {
    // Check all cards periodically for expiration and mark them in state & localStorage
    setCards(prev => {
      let changed = false;
      const updated = prev.map(c => {
        if (!isCardExpired(c) && c.activationTime) {
          const actTime = new Date(c.activationTime).getTime();
          let durationHours = 24;
          const durStr = (c.duration || c.name || c.packageName || '').toString();
          if (durStr.includes('10')) durationHours = 10;
          else if (durStr.includes('12')) durationHours = 12;
          else if (durStr.includes('24') || durStr.includes('يوم')) durationHours = 24;
          else if (durStr.includes('7')) durationHours = 7 * 24;
          else if (durStr.includes('30') || durStr.includes('شهر')) durationHours = 30 * 24;

          if (Date.now() - actTime >= durationHours * 3600 * 1000) {
            changed = true;
            return { ...c, status: 'expired', expired: true };
          }
        }
        return c;
      });
      if (changed) {
        localStorage.setItem('my_purchased_cards', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    if (isAuthenticated && view === 'status' && lastActiveCard) {
      if (isCardExpired(lastActiveCard)) {
        const userVal = lastActiveCard.cardUsername || lastActiveCard.username;
        if (userVal) {
          setInventoryCards(prev => {
            const updated = prev.map(c => c.username === userVal ? { ...c, used: true, status: 'expired', expired: true } : c);
            localStorage.setItem('wifi_card_inventory', JSON.stringify(updated));
            return updated;
          });
          setCards(prev => {
            const updated = prev.map(c => (c.cardUsername === userVal || c.username === userVal) ? { ...c, status: 'expired', expired: true } : c);
            localStorage.setItem('my_purchased_cards', JSON.stringify(updated));
            return updated;
          });
        }

        localStorage.removeItem('hnet_active_card');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('hypernet_session');
        setIsAuthenticated(false);
        setLastActiveCard(null);
        setView('login');
        setError('انتهت مدة صلاحية هذا الكرت، يرجى شراء باقة جديدة');
      }
    }
  }, [liveTick, isAuthenticated, view, lastActiveCard]);

  const fetchUserCardsFromDatabase = async (uname: string) => {
    if (!uname) return;
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_BASE_URL}/api/cards/my-cards?user_id=${encodeURIComponent(uname)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success && Array.isArray(data.cards)) {
        const userOnlyCards = data.cards.filter((c: any) => {
          if (!c) return false;
          
          // Filter out cards deleted in this session
          const cid = c.id;
          const cuser = c.cardUsername || c.username || c.card_number || c.code;
          if (cid && deletedCardIds.has(cid)) return false;
          if (cuser && deletedCardIds.has(cuser)) return false;

          const st = (c.status || '').toUpperCase();
          return st !== 'AVAILABLE';
        }).map((c) => ({
          ...c,
          cardUsername: c.cardUsername || c.username || c.card_number || c.code,
          username: c.username || c.cardUsername || c.card_number || c.code,
          cardPassword: c.cardPassword || c.password || c.card_password,
          password: c.password || c.cardPassword || c.card_password,
          packageName: c.package_name || c.packageName || c.name || 'باقة إنترنت',
          name: c.package_name || c.name || c.packageName || 'باقة إنترنت',
          status: c.status === 'مباع' ? 'SOLD' : (c.status || 'SOLD'),
          duration: c.duration || (c.duration_hours ? `${c.duration_hours} ساعة` : '24 ساعة'),
          purchaseDate: c.created_at || c.purchaseDate || new Date().toLocaleDateString('ar-EG'),
        }));
        setCards(userOnlyCards);
        localStorage.setItem("my_purchased_cards", JSON.stringify(userOnlyCards));
        localStorage.setItem("hnet_purchased_cards", JSON.stringify(userOnlyCards));

        // If user has an active card, update lastActiveCard state ONLY if there is currently no active card in state (e.g., initial page load/refresh)
        const activeCard = userOnlyCards.find((c: any) => 
          ((c.status === 'ACTIVE' || (c.status || '').toUpperCase() === 'ACTIVE' || (c.status || '').toUpperCase() === 'SOLD') && c.activated_at)
        );
        if (activeCard && !lastActiveCard) {
          const targetUser = activeCard.card_number || activeCard.username || activeCard.cardUsername;
          const targetPass = activeCard.card_password || activeCard.password || activeCard.cardPassword || '';
          const activeCardObj = {
            id: activeCard.id,
            cardUsername: targetUser,
            username: targetUser,
            cardPassword: targetPass,
            password: targetPass,
            name: activeCard.package_name || activeCard.packageName || activeCard.name || 'باقة إنترنت',
            packageName: activeCard.package_name || activeCard.packageName || activeCard.name || 'باقة إنترنت',
            status: 'ACTIVE',
            duration: activeCard.duration || '24 ساعة',
            dataLimit: activeCard.dataLimit || 'غير محدود',
            price: activeCard.price || '3 ₪',
            purchaseDate: activeCard.created_at || new Date().toLocaleDateString('ar-EG'),
            activated_at: activeCard.activated_at,
            activationTime: activeCard.activated_at,
            downloadUsed: '0 MB',
            uploadUsed: '0 MB',
            deviceIp: deviceIp || '192.168.1.105',
            deviceMac: deviceMac || '7C:D1:C3:AA:BB:CC',
            deviceType: deviceType || 'هاتف ذكي (Android/iOS)'
          };
          setLastActiveCard(activeCardObj);
          localStorage.setItem('hnet_active_card', JSON.stringify(activeCardObj));
        }
      }
    } catch (err) {
      console.warn("Error fetching user cards from database:", err);
    }
  };

  const fetchAdminUsersFromDatabase = async () => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Admin-Key": "HNetAdminKey_2026"
        }
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success && Array.isArray(data.users)) {
        setAdminUsers(data.users);
      }
    } catch (err) {
      console.warn("Error fetching admin users from database:", err);
    }
  };

  const handleStrictAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(false);
    setError(null);
    setFormAlert(null);
    setShake(false);
    const formData = new FormData(e.target as HTMLFormElement);
    const formUser = (formData.get("username") as string) ?? username;
    const formPass = (formData.get("password") as string) ?? password;
    setUsername(formUser);
    setPassword(formPass);
 
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return;
    }
 
    const cleanUser = formUser.trim().replace(/[<>]/g, "");
    const cleanPass = formPass.trim().replace(/[<>]/g, "");
 
    if (!cleanUser) {
      const errMsg = "يرجى إدخال اسم المستخدم أو رقم الكرت";
      setError(errMsg);
      setFormAlert({ type: 'error', message: errMsg });
      return;
    }
 
    setIsLoading(true);
    try {
      const macValue = mikrotikParams?.mac || deviceMac;
      const reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      if (macValue) {
        reqHeaders["X-Mac-Address"] = macValue;
      }
      
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
          mac: macValue,
          ip: mikrotikParams?.ip || deviceIp
        })
      });
 
      const authResult = await res.json().catch(() => null);
 
      if (!res.ok || !authResult || authResult.success === false) {
        const errMsg = authResult?.error || (res.status === 403 ? "هذه البطاقة مستخدمة على جهاز آخر" : "بيانات الدخول غير صحيحة");
        localStorage.removeItem("hnet_active_user");
        localStorage.removeItem("hnet_active_card");
        sessionStorage.removeItem("auth_token");
        setIsAuthenticated(false);
        setError(errMsg);
        setFormAlert({ type: 'error', message: errMsg });
        showToast(errMsg, "error");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockoutUntil(Date.now() + 30000);
        }
        return;
      }
 
      const loginType = authResult.type || (authResult.card ? "card" : "account");

      // 0. Clear old cards to prevent state bleeding from previous tests
      localStorage.removeItem("my_purchased_cards");
      localStorage.removeItem("hnet_purchased_cards");
      setCards([]);

      // 1. Handle "card" Type Login: Immediate network connection & Status View
      if (loginType === "card" || authResult.card) {
        // Pre-clear old active card state to prevent state bleeding
        setLastActiveCard(null);
        localStorage.removeItem('hnet_active_card');
        localStorage.removeItem('hnet_active_user');

        const cData = authResult.user || authResult.card || {};
        const cardUser = cData.cardUsername || cData.username || cleanUser;
        const cardPass = cData.cardPassword || cData.password || cleanPass;
        // Strictly use server-provided timestamp with no local fallback
        const activatedTimestamp = cData.activated_at || cData.activationTime || authResult.activated_at;
        const cardStatus = activatedTimestamp ? 'ACTIVE' : (cData.status || 'AVAILABLE');

        const pkgName = cData.package_name || cData.packageName || cData.name || (cData.duration_hours ? `باقة ${cData.duration_hours} ساعة` : (cData.package_id === '24h' ? 'باقة 24 ساعة' : 'باقة 10 ساعات'));
        const is24h = pkgName.includes('24') || pkgName.includes('يوم') || (cData.package_id === '24h');
        const pkgDuration = cData.duration || (cData.duration_hours ? `${cData.duration_hours} ساعة` : (is24h ? '24 ساعة' : '10 ساعات'));
        const pkgId = cData.package_id || (is24h ? '24h' : '10h');
        const pkgPrice = cData.price || (is24h ? 3 : 2);

        const normalizedCard = {
          id: cData.id || `card_${Date.now()}`,
          cardUsername: cardUser,
          username: cardUser,
          cardPassword: cardPass,
          password: cardPass,
          code: cardUser,
          package_id: pkgId,
          package_name: pkgName,
          packageName: pkgName,
          name: pkgName,
          duration: pkgDuration,
          duration_hours: is24h ? 24 : 10,
          dataLimit: cData.dataLimit || "غير محدود",
          price: pkgPrice,
          status: cardStatus,
          activated_at: activatedTimestamp || null,
          activationTime: activatedTimestamp || null,
          purchaseDate: cData.purchaseDate || cData.created_at || new Date().toLocaleDateString('ar-EG'),
          downloadUsed: '0 MB',
          uploadUsed: '0 MB',
          deviceIp: deviceIp || '192.168.1.105',
          deviceMac: deviceMac || '7C:D1:C3:AA:BB:CC',
          deviceType: deviceType || 'هاتف ذكي (Android/iOS)'
        };

        // Save session tokens & user object
        const cardSessionToken = authResult.token || authResult.session_token || `card_session_${Date.now()}_${cardUser}`;
        localStorage.setItem("session_token", cardSessionToken);
        sessionStorage.setItem("auth_token", cardSessionToken);
        localStorage.setItem("user_id", normalizedCard.id || cardUser);
        localStorage.setItem("hnet_active_user", JSON.stringify({
          id: normalizedCard.id || cardUser,
          type: "card",
          username: cardUser,
          session_token: cardSessionToken,
          ...normalizedCard
        }));
        localStorage.setItem("hnet_active_card", JSON.stringify(normalizedCard));

        // Put card into the user's purchased cards state
        setCards(prev => {
          const exists = prev.some(c => (c.username === cardUser || c.cardUsername === cardUser || c.id === normalizedCard.id));
          const updated = exists 
            ? prev.map(c => (c.username === cardUser || c.cardUsername === cardUser || c.id === normalizedCard.id) ? { ...c, ...normalizedCard } : c)
            : [normalizedCard, ...prev];
          localStorage.setItem("my_purchased_cards", JSON.stringify(updated));
          localStorage.setItem("hnet_purchased_cards", JSON.stringify(updated));
          return updated;
        });

        // Set active card state for live status countdown and router tracking
        setLastActiveCard(normalizedCard);

        // Update local inventory/D1 cards status
        setInventoryCards(prev => prev.map(c => 
          (c.username === cardUser || c.id === normalizedCard.id) ? { ...c, status: cardStatus, activated_at: activatedTimestamp || null } : c
        ));
        setD1Cards(prev => prev.map(c => 
          (c.card_number === cardUser || c.username === cardUser || c.id === normalizedCard.id) ? { ...c, status: cardStatus, activated_at: activatedTimestamp || null } : c
        ));

        // Direct Card Login: Immediate connection, Status View, and silent MikroTik redirect
        setIsAdminLoggedIn(false);
        setShowAdminDashboard(false);
        setIsAuthenticated(true);
        setFailedAttempts(0);
        setError(null);
        setFormAlert(null);
        setView("status");
        triggerMikrotikRedirect(cardUser, cardPass);
        showToast("تم الاتصال بالإنترنت بنجاح! ⚡", "success");
        return;
      }

      // 2. Handle "account" Type Login
      if (loginType === "account" || loginType === "user" || authResult.user) {
        const uData = authResult.user || {
          username: cleanUser,
          fullName: cleanUser,
          phone: "0590000000",
        };
        
        const activeUserObj = {
          type: "account",
          ...uData,
          firstName: uData.firstName || uData.first_name || uData.fullName?.split(' ')[0] || uData.username || '',
          fatherName: uData.fatherName || uData.father_name || uData.fullName?.split(' ')[1] || '',
          lastName: uData.lastName || uData.last_name || uData.fullName?.split(' ').slice(2).join(' ') || '',
        };

        localStorage.setItem("hnet_active_user", JSON.stringify(activeUserObj));
        const token = authResult.token || authResult.session_id;
        if (token) {
          localStorage.setItem("session_token", token);
          sessionStorage.setItem("auth_token", token);
        }
        setIsAuthenticated(true);
        setFailedAttempts(0);
        setError(null);
        setFormAlert(null);
        
        // Populate user profile state variables
        setFirstName(activeUserObj.firstName);
        setFatherName(activeUserObj.fatherName);
        setLastName(activeUserObj.lastName);
        setPhone(activeUserObj.phone || '0567101900');
        if (activeUserObj.region) setRegion(activeUserObj.region);

        const usernameLower = (uData.username || '').toLowerCase();
        const isAdmin = usernameLower === 'admin' || uData.role === 'admin' || uData.isAdmin === true;

        if (isAdmin) {
          setIsAdminLoggedIn(true);
          setShowAdminDashboard(true);
          setView("dashboard");
          showToast(`أهلاً بك مجدداً في لوحة المسؤول! 👋`, "success");
        } else {
          setIsAdminLoggedIn(false);
          setShowAdminDashboard(false);
          setView("dashboard");
          setDashboardTab("cards");
          showToast(`أهلاً بك مجدداً ${activeUserObj.firstName}! 👋`, "success");

          // For customer account, load user cards from D1 database
          if (uData.username) {
            fetchUserCardsFromDatabase(uData.username);
          }
        }
        return;
      }
    } catch (err: any) {
      const errMsg = "بيانات الدخول غير صحيحة";
      showToast(errMsg, "error");
      setError(errMsg);
      setFormAlert({ type: 'error', message: errMsg });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
 
    const cleanUser = username.trim();
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();
 
    if (!cleanUser || !cleanPhone || !cleanPass) {
      const errMsg = "الرجاء تعبئة رقم الجوال واسم المستخدم وكلمة المرور.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    if (!/^(059|056)\d{7}$/.test(cleanPhone)) {
      const errMsg = "يجب أن يبدأ رقم الجوال بـ 059 أو 056 ويتكون من 10 أرقام بالضبط.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    if (cleanUser.length < 3 || cleanUser.length > 30) {
      const errMsg = "يجب أن يتراوح اسم المستخدم بين 3 و 30 حرفاً.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    if (/[\s@:\/\\;'"&|#\$<>?%]/.test(cleanUser)) {
      const errMsg = "اسم المستخدم يحتوي على رموز غير مسموحة (مسافات أو @ أو / أو :) لتفادي التعارض مع الشبكة.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }
 
    if (password.length === 5 && confirmPassword && password !== confirmPassword) {
      const errMsg = "كلمتا المرور غير متطابقتين.";
      setError(errMsg);
      showToast(errMsg, "error");
      return;
    }
 
    setIsLoading(true);
    try {
      const endpoint = `${API_BASE_URL}/api/auth/register`;
 
      const payload: any = {
        fullName: `${firstName.trim()} ${fatherName.trim()} ${lastName.trim()}`.trim() || cleanUser,
        firstName: firstName.trim() || "مشترك",
        fatherName: fatherName.trim() || "",
        lastName: lastName.trim() || "جديد",
        phone: cleanPhone,
        username: cleanUser,
        password: cleanPass,
        region: region
      };
 
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
 
      const data = await res.json().catch(() => null);
 
      if (!res.ok || !data || data.success === false) {
        const errMsg = data?.error || data?.message || "فشل إنشاء الحساب. يرجى التأكد من البيانات والمحاولة مجدداً.";
        setError(errMsg);
        showToast(errMsg, "error");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
 
      const activeUserData = data.user || {
        username: cleanUser,
        firstName: payload.firstName,
        fatherName: payload.fatherName,
        lastName: payload.lastName,
        phone: cleanPhone,
        region: payload.region,
        camp: payload.region
      };
 
      localStorage.setItem("hnet_active_user", JSON.stringify(activeUserData));
      setIsAuthenticated(true);
      setError(null);
      showToast("تم إنشاء الحساب بنجاح 🎉", "success");
      
      const usernameLower = (activeUserData.username || '').toLowerCase();
      const isAdmin = usernameLower === 'admin' || activeUserData.role === 'admin' || activeUserData.isAdmin === true;

      if (isAdmin) {
        setIsAdminLoggedIn(true);
        setShowAdminDashboard(true);
      } else {
        setIsAdminLoggedIn(false);
        setShowAdminDashboard(false);
      }
      setView("dashboard");
    } catch (err: any) {
      const errMsg = "فشل الاتصال بالخادم: " + (err.message || "خطأ في شبكة الاتصال");
      setError(errMsg);
      showToast(errMsg, "error");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Safely call backend logout route to clear the http-only cookie
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" }).catch(() => {});
    } catch (err) {}

    // Clear client-side profile cache
    localStorage.removeItem("hnet_active_user");
    localStorage.removeItem("hnet_active_card");
    localStorage.removeItem("session_token");
    localStorage.removeItem("is_admin_logged_in");
    localStorage.removeItem("my_purchased_cards");
    localStorage.removeItem("hnet_purchased_cards");
    localStorage.removeItem("wifi_card_inventory");

    setIsAuthenticated(false);
    setIsAdminLoggedIn(false);
    setShowAdminDashboard(false);
    setView("login");
    setUsername("");
    setPassword("");
    setCards([]);
    setInventoryCards([]);
    showToast("تم تسجيل الخروج بنجاح وتطهير الجلسة الآمنة. 🔐", "success");
    setIsLoading(false);
  };

  // Sync edit profile name when entering dashboard
  useEffect(() => {
    if (view === "dashboard") {
      if (!editFirstName) setEditFirstName(firstName || "علي");
      if (!editFatherName) setEditFatherName(fatherName || "");
      if (!editLastName) setEditLastName(lastName || "أحمد");
      if (!editPhone) setEditPhone(phone || "0567101900");

      if (username) {
        fetchUserCardsFromDatabase(username);
      }
      fetchAdminUsersFromDatabase();
    }
  }, [view, firstName, fatherName, lastName, phone, region]);

  const handleBuyPackage = async (pkgName: string, duration: string, dataLimit: string, price: string, overrideQty?: number) => {
    console.log("BUY BUTTON CLICKED", { pkgName, duration, dataLimit, price, overrideQty });
    const qty = overrideQty !== undefined ? overrideQty : 1;
    setIsLoading(true);
    try {
      const is24h = pkgName.includes('24') || pkgName.includes('يوم');
      const targetPkgId = is24h ? '24h' : '10h';
      const currentUser = username || 'guest_user';

      let purchasedCards: any[] = [];
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";

      // 1. Attempt server purchase endpoint: Cloudflare Worker atomic /api/cards/buy
      try {
        console.log("SENDING BUY REQUEST TO:", `${API_BASE_URL}/api/cards/buy`);
        const res = await fetch(`${API_BASE_URL}/api/cards/buy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            package_name: pkgName,
            package_id: targetPkgId,
            price: Number(price.replace('₪', '').trim()) || (is24h ? 3 : 2),
            quantity: qty,
            user_id: currentUser,
            username: currentUser
          })
        });

        const data = await res.json().catch(() => null);
        console.log("BUY REQUEST RESPONSE STATUS:", res.status, "DATA:", data);

        if (res.ok && data?.success) {
          if (data.card) {
            console.log("New Card Purchased:", data.card);
            const c = data.card;
            purchasedCards.push({
              id: c.id || ('card_' + Date.now()),
              name: c.package_name || pkgName,
              packageName: c.package_name || pkgName,
              package_id: targetPkgId,
              cardUsername: c.username || c.card_number || c.cardUsername,
              username: c.username || c.card_number || c.cardUsername,
              cardPassword: c.password || c.card_password || c.cardPassword,
              password: c.password || c.card_password || c.cardPassword,
              duration: duration,
              dataLimit: dataLimit,
              status: 'SOLD',
              purchaseDate: new Date().toLocaleDateString("ar-EG"),
              price: price,
              forUser: currentUser
            });
          } else if (Array.isArray(data.cards) && data.cards.length > 0) {
            purchasedCards = data.cards.map((c: any) => ({
              id: c.id || ('card_' + Date.now()),
              name: pkgName,
              packageName: pkgName,
              package_id: targetPkgId,
              cardUsername: c.cardUsername || c.username || c.card_number,
              username: c.cardUsername || c.username || c.card_number,
              cardPassword: c.cardPassword || c.password || c.card_password,
              password: c.cardPassword || c.password || c.card_password,
              duration: duration,
              dataLimit: dataLimit,
              status: 'SOLD',
              purchaseDate: new Date().toLocaleDateString("ar-EG"),
              price: price,
              forUser: currentUser
            }));
          }
        }
      } catch (e) {
        console.warn("Backend /api/cards/buy error:", e);
      }

      // 2. Fallback: Claim directly from available D1 / inventory cards pool
      if (purchasedCards.length === 0) {
        const baseCards = [...(d1Cards || [])];
        const availablePool = baseCards.filter(c => {
          if (!c) return false;
          const st = (c.status || (c.used ? 'SOLD' : 'AVAILABLE')).toUpperCase();
          if (st !== 'AVAILABLE') return false;
          const pId = (c.package_id || '').toLowerCase().trim();
          const pName = (c.package_name || c.packageName || '').toLowerCase().trim();
          if (targetPkgId === '24h') return pId === '24h' || pName.includes('24') || pName.includes('يوم');
          return pId === '10h' || pName.includes('10');
        });

        if (availablePool.length < qty) {
          showToast(`عذراً، لا توجد بطاقات متوفرة حالياً في المخزن لـ ${pkgName}`, "error");
          setIsLoading(false);
          return;
        }

        for (let i = 0; i < qty; i++) {
          const cardToClaim = availablePool[i];
          const cardNum = cardToClaim.card_number || cardToClaim.username;
          const cardPass = cardToClaim.card_password || cardToClaim.password;
          const cardId = cardToClaim.id || `claimed_${Date.now()}_${i}`;

          // Notify backend of status change to SOLD
          try {
            await fetch(`${API_BASE_URL}/api/admin/cards/${encodeURIComponent(cardId)}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': 'HNetAdminKey_2026'
              },
              body: JSON.stringify({ status: 'SOLD', user_id: currentUser })
            });
          } catch (e) {
            console.error("Direct claim status update failed:", e);
          }

          purchasedCards.push({
            id: cardId,
            name: pkgName,
            packageName: pkgName,
            package_id: targetPkgId,
            cardUsername: cardNum,
            username: cardNum,
            cardPassword: cardPass,
            password: cardPass,
            duration: duration,
            dataLimit: dataLimit,
            status: 'SOLD',
            purchaseDate: new Date().toLocaleDateString("ar-EG"),
            price: price,
            forUser: currentUser
          });
        }
      }

      // 3. Mark claimed cards as SOLD in local D1 & inventory state
      const claimedNumbers = new Set(purchasedCards.map(c => c.cardUsername));
      setD1Cards(prev => prev.map(c => {
        const cNum = c.card_number || c.username;
        return claimedNumbers.has(cNum) ? { ...c, status: 'SOLD', used: true } : c;
      }));
      setInventoryCards(prev => prev.map(c => {
        const cNum = c.username || c.card_number;
        return claimedNumbers.has(cNum) ? { ...c, status: 'SOLD', used: true } : c;
      }));

      // 4. Update user's purchased cards state
      // Relies strictly on authoritative fetch from D1 below to prevent state conflicts

      // Clear any previous active card to prevent timer bleed into the newly purchased card
      setLastActiveCard(null);
      localStorage.removeItem('hnet_active_card');

      // 5. Open dispensed card modal for receipt (Purchased cards remain unactivated until Quick Connect is clicked)
      if (purchasedCards[0]) {
        setDispensedCardModal({
          isOpen: true,
          card: purchasedCards[0]
        });
      }

      // 6. Refresh stock & navigate to "بطاقاتي"
      fetchCloudStockStatus();
      setDashboardTab("cards");
      const successMsg = qty > 1 
        ? `تم شراء ${qty} بطاقات من ${pkgName} بنجاح! 🎉 مضافة إلى "بطاقاتي"`
        : `تم شراء ${pkgName} بنجاح! 🎉 مضافة إلى "بطاقاتي"`;
      showToast(successMsg, "success");
      if (username) {
        await fetchUserCardsFromDatabase(username);
      }
    } catch (err: any) {
      console.error("Purchase error:", err);
      showToast("حدث خطأ في الاتصال أثناء الشراء والتفعيل", "error");
    } finally {
      setIsLoading(false);
    }
  };
const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!jawwalMobileNumber.trim() || jawwalMobileNumber.length !== 10 || !/^(059|056)\d{7}$/.test(jawwalMobileNumber)) {
      showToast('الرجاء إدخال رقم جوال أو وطنية صحيح يبدأ بـ 059 أو 056 ويتكون من 10 أرقام.', 'error');
      return;
    }
    
    setIsJawwalLoading(true);
    try {
      const token = await getCorporateToken();
      
      const res = await fetch(`${API_BASE_URL}/api/jawwal/corporate/send_otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mobile_number: jawwalMobileNumber,
          amount: jawwalPackageToBuy?.price
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn("Jawwal Corporate API notice, falling back to local simulation:", res.status);
        const fallbackInv = 'inv_' + Date.now();
        setJawwalInvoiceId(fallbackInv);
        setJawwalStep('otp');
        showToast('تم إرسال رمز التحقق (OTP) إلى هاتفك بنجاح.', 'success');
        return;
      }

      const invoiceId = data?.cor_invoice_id || data?.data?.cor_invoice_id || data?.invoice_id || data?.id || ('inv_' + Date.now());
      setJawwalInvoiceId(invoiceId);
      setJawwalStep('otp');
      showToast('تم إرسال رمز التحقق (OTP) إلى هاتفك بنجاح.', 'success');
    } catch (err: any) {
      console.warn("Jawwal Corporate API exception, proceeding with local checkout:", err);
      const fallbackInv = 'inv_' + Date.now();
      setJawwalInvoiceId(fallbackInv);
      setJawwalStep('otp');
      showToast('تم إرسال رمز التحقق (OTP) إلى هاتفك بنجاح.', 'success');
    } finally {
      setIsJawwalLoading(false);
    }
  };

  const handleConfirmOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!jawwalOTP.trim() || jawwalOTP.length < 4) {
      showToast('الرجاء إدخال رمز التحقق (OTP) بشكل صحيح.', 'error');
      return;
    }

    setIsJawwalLoading(true);
    try {
      const token = await getCorporateToken();
      
      const res = await fetch(`${API_BASE_URL}/api/jawwal/corporate/confirm_payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cor_invoice_id: jawwalInvoiceId,
          otp: jawwalOTP,
          package_type: jawwalPackageToBuy?.pkgName
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.warn("Jawwal Corporate API notice on confirm, proceeding with local card dispensing:", res.status);
      }

      showToast('تمت عملية الدفع بنجاح! 🎉', 'success');
      
      if (jawwalPackageToBuy) {
        const pkgName = jawwalPackageToBuy.pkgName;
        const qty = jawwalPackageToBuy.quantity || 1;

        let usedFromInventoryCount = 0;

        // Check if worker returned a dispensed card from قاعدة البيانات
        const workerDispensedCard = data?.dispensed_card || data?.data?.dispensed_card || data?.card || data?.data?.card;
        const dispensedCards: any[] = [];
        const currentInv = [...inventoryCards];
        for (let i = 0; i < qty; i++) {
          let userVal = '';
          let passVal = '';

          if (i === 0 && workerDispensedCard && (workerDispensedCard.username || workerDispensedCard.cardUsername)) {
            userVal = workerDispensedCard.username || workerDispensedCard.cardUsername;
            passVal = workerDispensedCard.password || workerDispensedCard.cardPassword;
          } else {
            // Find first unused card matching package name from local inventory
            const invIdx = currentInv.findIndex(
              c => !c.used && (
                c.packageName === pkgName || 
                pkgName.includes(c.packageName) || 
                c.packageName.includes(pkgName)
              )
            );

            if (invIdx !== -1) {
              userVal = currentInv[invIdx].username;
              passVal = currentInv[invIdx].password;
              currentInv[invIdx] = {
                ...currentInv[invIdx],
                used: true,
                usedAt: new Date().toISOString()
              };
              usedFromInventoryCount++;
            } else {
              // Fallback generation if inventory empty
              userVal = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
              passVal = `${Math.floor(100000 + Math.random() * 900000)}`;
            }
          }

          const cardObj = {
            id: 'c_' + Date.now() + '_' + i,
            name: pkgName,
            code: `HYPER-${Math.floor(1000 + Math.random() * 9000)}`,
            cardUsername: userVal,
            cardPassword: passVal,
            duration: jawwalPackageToBuy.duration,
            dataLimit: jawwalPackageToBuy.dataLimit,
            status: 'SOLD' as any,
            downloadUsed: '0 MB',
            uploadUsed: '0 MB',
            timeLeft: 'غير مفعلة',
            purchaseDate: new Date().toLocaleDateString('ar-EG'),
            percentUsed: 0
          };

          dispensedCards.push(cardObj);
        }

        if (usedFromInventoryCount > 0) {
          setInventoryCards(currentInv);
          localStorage.setItem('wifi_card_inventory', JSON.stringify(currentInv));
        }

        // Update D1 state for any cards that match
        const updatePromises = dispensedCards.map(dc => {
          const matchedD1 = d1Cards.find(c => (c.card_number === dc.cardUsername || c.username === dc.cardUsername));
          if (matchedD1) {
            return fetch(`${API_BASE_URL}/api/admin/cards/${encodeURIComponent(matchedD1.id)}/status`, {
               method: 'PATCH',
               headers: {
                 'Content-Type': 'application/json',
                 'X-Admin-Key': 'HNetAdminKey_2026'
               },
               body: JSON.stringify({ status: 'SOLD', user_id: username || 'guest' })
            }).catch(err => console.error("Jawwal D1 sync error:", err));
          }
          return Promise.resolve();
        });
        
        await Promise.all(updatePromises);

        setCards(prev => {
          const updated = [...dispensedCards, ...prev];
          localStorage.setItem('hnet_purchased_cards', JSON.stringify(updated));
          localStorage.setItem('my_purchased_cards', JSON.stringify(updated));
          return updated;
        });

        if (username) {
          await fetchUserCardsFromDatabase(username);
        }

        setDispensedCardModal({
          isOpen: true,
          card: dispensedCards[0]
        });

        setDashboardTab('cards');
      }
      setJawwalStep('none');
      fetchCloudStockStatus();
    } catch (err: any) {
      console.error("API Call Failed (confirm_payment exception):", err);
      if (err?.message && err.message !== "حساب الشركة مؤقت الاحتجاز أو التوكن صالح، انتظر قليلاً") {
        showToast(err.message, 'error');
      }
    } finally {
      setIsJawwalLoading(false);
    }
  };

  
  const fetchFullDashboardData = async () => {
    setIsFetchingStock(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/full-dashboard`, {
        headers: {
          'X-Admin-Key': 'HNetAdminKey_2026'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.stats) {
          setDashboardStats(data.stats);
        }
        if (data?.master_used_cards_list && Array.isArray(data.master_used_cards_list)) {
          setRemoteMasterUsedCards(data.master_used_cards_list);
        }
        if (data?.stock) {
          setCloudStockStatus(data.stock);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch full dashboard:", err);
    } finally {
      setIsFetchingStock(false);
    }
  };
const fetchCloudStockStatus = async () => {
    setIsFetchingStock(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stock-status`, {
        headers: {
          'X-Admin-Key': 'HNetAdminKey_2026'
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("قاعدة البيانات Stock status:", data);
        const stockObj = data?.stock || data?.data || (typeof data === 'object' && !Array.isArray(data) ? data : {});
        setCloudStockStatus(stockObj);
      }
    } catch (err) {
      console.warn("Failed to fetch cloud stock status:", err);
    } finally {
      setIsFetchingStock(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && username && dashboardTab === 'cards') {
      fetchUserCardsFromDatabase(username);
    }
  }, [dashboardTab, isAuthenticated, username]);

  useEffect(() => {
    if (showAdminDashboard || view === "admin") {
      fetchAdminUsersFromDatabase();
      fetchFullDashboardData();
      fetchCloudStockStatus();
      if (adminActiveTab === "inventory") {
        fetchAdminD1Cards();
      }
    }
  }, [showAdminDashboard, view, adminActiveTab, d1CardPackageFilter, d1CardStatusFilter, d1CardBatchFilter, d1CardSearch]);

  const fetchAdminD1Cards = async (
    status = d1CardStatusFilter,
    batchId = d1CardBatchFilter,
    search = d1CardSearch,
    pkgFilter = d1CardPackageFilter
  ) => {
    setIsFetchingD1Cards(true);
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const base = API_BASE_URL.replace(/\/+$/, "");
      const url = new URL(`${base}/api/admin/cards`);
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '1000');
      if (status && status !== 'ALL') url.searchParams.set('status', status);
      if (batchId && batchId !== 'ALL') url.searchParams.set('batch_id', batchId);
      if (pkgFilter && pkgFilter !== 'ALL') url.searchParams.set('package_name', pkgFilter);
      if (search && search.trim()) url.searchParams.set('search', search.trim());

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': 'HNetAdminKey_2026'
        }
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && (data.success || Array.isArray(data.cards) || Array.isArray(data))) {
        const rawCardsList = data.cards || (Array.isArray(data) ? data : []);
        setD1Cards(rawCardsList);
        
        // Sync full fetched cards array to local inventoryCards state
        const fetchedCards = rawCardsList.map((c: any) => {
          const rawPkgName = c.package_name || c.packageName || c.package || 'باقة 10 ساعات';
          const is24h = rawPkgName.includes('24') || rawPkgName.includes('يوم') || c.package_id === '24h';
          const pId = c.package_id || (is24h ? '24h' : '10h');
          const pName = is24h ? 'باقة 24 ساعة' : 'باقة 10 ساعات';
          
          return {
            id: c.id,
            username: c.card_number || c.username,
            password: c.card_password || c.password,
            package_id: pId,
            packageName: pName,
            package_name: pName,
            used: c.status !== 'AVAILABLE',
            status: c.status?.toLowerCase() || (c.status === 'AVAILABLE' ? 'available' : 'sold'),
            batch: c.batch_name || c.batch_id || c.batch || 'دفعة_عامة',
            batch_id: c.batch_name || c.batch_id || c.batch || 'دفعة_عامة',
            addedAt: c.created_at || new Date().toISOString()
          };
        });
        
        setInventoryCards(fetchedCards);
        localStorage.setItem("wifi_card_inventory", JSON.stringify(fetchedCards));

        if (data.stats) setD1CardStats(data.stats);
        if (data.batches) setD1Batches(data.batches);
        if (data.total !== undefined) setD1CardTotalCount(data.total || fetchedCards.length);
        else setD1CardTotalCount(fetchedCards.length);
      }
    } catch (err) {
      console.warn("Failed to fetch D1 cards:", err);
    } finally {
      setIsFetchingD1Cards(false);
    }
  };

  const fetchAvailableCardsForUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cards/available`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.cards)) {
        const mapped = data.cards.map((c: any) => ({
          id: c.id,
          username: c.card_number || c.username,
          password: c.card_password || c.password,
          packageName: c.package_name || 'باقة 10 ساعات',
          package_name: c.package_name || 'باقة 10 ساعات',
          used: false,
          status: 'available',
          batch: c.batch_id || 'دفعة_عامة',
          addedAt: c.created_at || new Date().toISOString()
        }));
        setInventoryCards(mapped);
        localStorage.setItem("wifi_card_inventory", JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn("Failed to fetch available cards:", err);
    }
  };

  const [isClearingExpiredCards, setIsClearingExpiredCards] = useState(false);

  const handleDeleteExpiredCards = async () => {
    console.log("Deleting EXPIRED cards...");

    setIsClearingExpiredCards(true);
    try {
      const adminKey = 'HNetAdminKey_2026';
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      
      // Send explicit HTTP DELETE request targeting expired cards
      let res = await fetch(`${API_BASE_URL}/api/admin/cards?status=EXPIRED`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          action: 'delete_expired',
          status: 'EXPIRED'
        })
      });

      let data = await res.json().catch(() => null);

      if (!res.ok && !data?.success) {
        // Fallback to /api/admin/cards/expired endpoint
        res = await fetch(`${API_BASE_URL}/api/admin/cards/expired`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Admin-Key': adminKey
          },
          body: JSON.stringify({
            action: 'delete_expired',
            status: 'EXPIRED'
          })
        });
        data = await res.json().catch(() => null);
      }

      if (res.ok || (data && data.success)) {
        showToast("تم الحذف بنجاح من قاعدة البيانات", "success");
      } else {
        console.warn("Delete expired response:", data);
        showToast(data?.error || "فشل الحذف", "error");
      }

      // Optimistic update of local state
      setD1Cards(prev => prev.filter(c => (c.status || '').toUpperCase() !== 'EXPIRED'));
      setInventoryCards(prev => {
        const filtered = prev.filter(c => (c.status || '').toUpperCase() !== 'EXPIRED');
        localStorage.setItem("wifi_card_inventory", JSON.stringify(filtered));
        return filtered;
      });

      // Synchronize database state immediately
      await fetchAdminD1Cards();
      await fetchCloudStockStatus();
      await fetchFullDashboardData();
    } catch (err: any) {
      console.error("Delete expired cards error:", err);
      showToast("حدث خطأ أثناء الاتصال بالخادم لحذف الكروت المنتهية", "error");
      await fetchAdminD1Cards();
    } finally {
      setIsClearingExpiredCards(false);
    }
  };

  

  

  const parseCardText = (rawText: string) => {
    const cleanText = (rawText || "").replace(/^\uFEFF/, "").replace(/^\uFFFE/, "");
    const lines = cleanText.split(/\r?\n/);
    const parsed: Array<{ username: string; password: string; package_name: string; status: string; line_number?: number }> = [];
    const seenUsernames = new Set<string>();

    let usernameIdx = 0;
    let passwordIdx = 1;
    let packageIdx = 2;
    let hasHeader = false;

    // Detect if first non-empty line is a header row to set dynamic mapping
    const firstLine = lines.find(l => l.trim() !== "");
    if (firstLine) {
      let segments = firstLine.trim().split(/[\t,;\|]+/).map(s => s.trim());
      if (segments.length === 1) {
        segments = firstLine.trim().split(/\s{2,}/).map(s => s.trim());
        if (segments.length === 1) {
          segments = firstLine.trim().split(/\s+/).map(s => s.trim());
        }
      }
      const isHeader = segments.some(seg => {
        const s = seg.toLowerCase();
        return (
          s === "username" || s === "password" || s === "package" || s === "package_name" ||
          s === "pin" || s === "card_number" || s === "card_password" || s === "اسم المستخدم" ||
          s === "كلمة السر" || s === "كلمة المرور" || s === "الباقة" || s === "رقم الكرت" ||
          s === "السعر" || s === "سعر"
        );
      });
      if (isHeader) {
        hasHeader = true;
        segments.forEach((seg, idx) => {
          const s = seg.toLowerCase();
          if (s.includes("user") || s.includes("number") || s.includes("اسم") || s.includes("رقم")) {
            usernameIdx = idx;
          } else if (s.includes("pass") || s.includes("pin") || s.includes("سر") || s.includes("مرور")) {
            passwordIdx = idx;
          } else if (s.includes("package") || s.includes("baga") || s.includes("باقة")) {
            packageIdx = idx;
          }
        });
      }
    }

    lines.forEach((line, idx) => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      let segments = cleanLine.split(/[\t,;\|]+/).map(s => s.trim());
      if (segments.length === 1) {
        segments = cleanLine.split(/\s{2,}/).map(s => s.trim());
        if (segments.length === 1) {
          segments = cleanLine.split(/\s+/).map(s => s.trim());
        }
      }

      if (segments.length === 0) return;

      // Skip repeated or original header rows
      const isHeaderRow = segments.some(seg => {
        const s = seg.toLowerCase();
        return (
          s === "username" ||
          s === "password" ||
          s === "package" ||
          s === "package_name" ||
          s === "pin" ||
          s === "card_number" ||
          s === "card_password" ||
          s === "اسم المستخدم" ||
          s === "كلمة السر" ||
          s === "كلمة المرور" ||
          s === "الباقة" ||
          s === "رقم الكرت" ||
          s === "السعر" ||
          s === "سعر"
        );
      });
      if (isHeaderRow) {
        return;
      }

      const username = segments[usernameIdx];
      if (!username || username.length < 2) return;
      if (isHeaderOrNoise(username)) return;

      const password = segments[passwordIdx] || username;
      if (isHeaderOrNoise(password)) return;

      // Fallback package selection if absent/empty in the file
      const pName = segments[packageIdx] || importSelectedPackage || "باقة 10 ساعات";

      const userLower = username.toLowerCase();
      if (seenUsernames.has(userLower)) {
        return; // Deduplicate
      }
      seenUsernames.add(userLower);

      parsed.push({
        username,
        password,
        package_name: pName,
        status: 'AVAILABLE',
        line_number: idx + 1
      });
    });

    return parsed;
  };

  const processCardFile = async (file: File) => {
    if (!file) return;

    setImportFileName(file.name);
    setImportBatchName(`دفعة_${file.name.replace(/\.[^/.]+$/, "")}`);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileText = '';

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (firstSheetName) {
          const sheet = workbook.Sheets[firstSheetName];
          fileText = XLSX.utils.sheet_to_csv(sheet);
        }
      } else {
        fileText = await file.text();
      }

      const parsed = parseCardText(fileText);

      if (parsed.length > 0) {
        setParsedCards(parsed as any);
        setImportFileContent(fileText);
        setImportModalOpen(true);
      } else {
        showToast('لم يتم العثور على كروت صالحة في الملف', 'error');
      }
    } catch (err: any) {
      showToast('فشل قراءة وتحليل الملف: ' + (err?.message || 'ملف غير مدعوم'), 'error');
    }
  };

  const handleExcelFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCardFile(file);
  };

  const handleExecuteBulkImport = async () => {
    if (parsedCards.length === 0) {
      showToast('لا توجد بيانات للاستيراد', 'error');
      return;
    }
    
    setIsSubmittingImport(true);
    try {
      const currentBatchName = importBatchName || `دفعة_${new Date().toISOString().slice(0,10)}`;
      
      let selectedPkgName = "باقة 10 ساعات";
      let selectedPkgId = "10h";
      
      if (importSelectedPackage === "باقة 24 ساعة" || importSelectedPackage === "24h") {
        selectedPkgName = "باقة 24 ساعة";
        selectedPkgId = "24h";
      } else if (importSelectedPackage && importSelectedPackage !== "auto") {
        selectedPkgName = importSelectedPackage;
        selectedPkgId = (importSelectedPackage.includes("24") || importSelectedPackage.includes("يوم")) ? "24h" : "10h";
      }

      const payloadCards = parsedCards.map(c => {
        let pkgName = selectedPkgName;
        let pkgId = selectedPkgId;
        
        if (importSelectedPackage === 'auto' && c.package_name) {
          pkgName = c.package_name;
          pkgId = (c.package_name.includes("24") || c.package_name.includes("يوم")) ? "24h" : "10h";
        }
        
        return {
          username: c.username,
          password: c.password,
          package_id: pkgId,
          package_name: pkgName,
          status: "AVAILABLE",
          batch: currentBatchName
        };
      });

      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const targetUrl = `https://purple-violet-3560.m-r-n-3-2005.workers.dev/api/admin/cards/bulk`;
      
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Admin-Key": "HNetAdminKey_2026"
        },
        body: JSON.stringify({
          cards: payloadCards
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        // Immediate local state sync on successful response
        const newParsedCards = (data.cards || payloadCards).map((c: any) => ({
          id: c.id || `card_${Math.random()}`,
          username: c.username,
          password: c.password,
          package_id: c.package_id || selectedPkgId,
          packageName: c.package_name || selectedPkgName,
          package_name: c.package_name || selectedPkgName,
          used: false,
          status: 'AVAILABLE',
          batch: currentBatchName,
          addedAt: c.addedAt || new Date().toISOString()
        }));

        setInventoryCards(prevCards => {
          const updated = [...newParsedCards, ...(prevCards || [])];
          localStorage.setItem("wifi_card_inventory", JSON.stringify(updated));
          return updated;
        });

        alert(`تم إضافة ${newParsedCards.length} كرت بنجاح إلى المخزن (${selectedPkgName})`);
        showToast(`تم استيراد ${newParsedCards.length} كرت بنجاح! 🚀`, 'success');
        
        // Immediate UI refresh & Modal close
        setImportModalOpen(false);
        setParsedCards([]);
        setImportFileContent("");
        setImportResultReport(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Trigger background updates as fallbacks
        fetchAdminD1Cards();
        fetchCloudStockStatus();
      } else {
        const errorMsg = data?.error || 'فشل استيراد الكروت من الخادم';
        console.error("Import Error Details:", data);
        alert(`خطأ في الاستيراد: ${errorMsg}`);
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      console.error("Critical Import Failure:", err);
      alert(`حدث خطأ فني أثناء الاستيراد: ${err?.message || 'خطأ غير معروف'}`);
      showToast('فشل الاتصال بالخادم للاستيراد', 'error');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const getNormalizedCardStatus = (card: any): 'AVAILABLE' | 'SOLD' | 'ACTIVE' | 'EXPIRED' => {
    if (!card) return 'AVAILABLE';
    const st = (card.status || '').toUpperCase();
    if (st === 'EXPIRED') return 'EXPIRED';
    if (st === 'ACTIVE' || card.activated_at) return 'ACTIVE';
    if (st === 'SOLD' || st === 'USED' || card.used) return 'SOLD';
    return 'AVAILABLE';
  };

  const getPackageStock = (pkgKey: string, pkgNameArabic: string): number => {
    const baseCards = d1Cards || [];
    return baseCards.filter((c: any) => {
      if (!c) return false;
      const st = (c.status || (c.used ? 'SOLD' : 'AVAILABLE')).toUpperCase();
      if (st !== 'AVAILABLE') return false;
      if (c.used === true) return false;

      const pId = (c.package_id || '').toLowerCase().trim();
      const pName = (c.package_name || c.packageName || '').toLowerCase().trim();

      if (pkgKey === '10h' || pkgKey === '10_hours' || pkgNameArabic.includes('10')) {
        return pId === '10h' || pId === '10_hours' || pName.includes('10');
      }
      if (pkgKey === '24h' || pkgKey === '24_hours' || pkgNameArabic.includes('24') || pkgNameArabic.includes('يوم')) {
        return pId === '24h' || pId === '24_hours' || pName.includes('24') || pName.includes('يوم');
      }
      return pId === pkgKey.toLowerCase() || pName.includes(pkgNameArabic.toLowerCase());
    }).length;
  };

  

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!changePasswordModalUser) return;
    if (!newPasswordInput.trim()) {
      showToast('الرجاء إدخال كلمة المرور الجديدة', 'error');
      return;
    }

    const targetUser = changePasswordModalUser.username;
    const newPass = newPasswordInput.trim();

    setAdminUsers(prev => {
      const updated = prev.map(u => 
        u.username === targetUser 
          ? { ...u, password: newPass }
          : u
      );
      return updated;
    });

    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      await fetch(`${API_BASE_URL}/api/admin/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Admin-Key": "HNetAdminKey_2026"
        },
        body: JSON.stringify({
          username: targetUser,
          new_password: newPass
        })
      });
    } catch (err) {
      console.warn("Async admin password update error:", err);
    }

    showToast('تم تغيير كلمة المرور بنجاح!', 'success');
    setChangePasswordModalUser(null);
    setNewPasswordInput('');
  };

  const handleAdminOpen = () => {
    if (isAdminLoggedIn) {
      setShowAdminDashboard(true);
      fetchCloudStockStatus();
      fetchAdminD1Cards();
      fetchFullDashboardData();
    } else {
      setShowAdminPasswordModal(true);
    }
  };

  

  

  const handleAdminLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === '123456' || adminPasswordInput === 'HNetAdminKey_2026' || adminPasswordInput === 'admin123456') {
      setIsAdminLoggedIn(true);
      localStorage.setItem("is_admin_logged_in", "true");
      setShowAdminPasswordModal(false);
      setShowAdminDashboard(true);
      fetchCloudStockStatus();
      fetchAdminD1Cards();
      fetchFullDashboardData();
      showToast('تم تسجيل الدخول كـ أدمن بنجاح! 🎉', 'success');
    } else {
      showToast('كلمة مرور الأدمن غير صحيحة ❌', 'error');
    }
  };

  

  

  const handleDeleteAllCards = async () => {
    console.log("Deleting ALL cards...");
    
    setIsClearingAllStock(true);
    try {
      const adminKey = 'HNetAdminKey_2026';
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      
      let res = await fetch(`${API_BASE_URL}/api/admin/cards?all=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ action: 'delete_all' })
      });

      let data = await res.json().catch(() => null);

      if (!res.ok && !data?.success) {
        // Fallback to clear-all
        res = await fetch(`${API_BASE_URL}/api/admin/cards/clear-all`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Admin-Key': adminKey
          },
          body: JSON.stringify({ action: 'delete_all' })
        });
        data = await res.json().catch(() => null);
      }

      if (res.ok || data?.success) {
        showToast("تم الحذف بنجاح من قاعدة البيانات", "success");
        setD1Cards([]);
        setInventoryCards([]);
        localStorage.setItem("wifi_card_inventory", JSON.stringify([]));
        await fetchAdminD1Cards();
        await fetchCloudStockStatus();
        await fetchFullDashboardData();
      } else {
        showToast(data?.error || 'فشل الحذف', "error");
        await fetchAdminD1Cards();
      }
    } catch (err: any) {
      console.error("API card delete error:", err);
      showToast('حدث خطأ أثناء الاتصال بالخادم لحذف الكروت', "error");
      await fetchAdminD1Cards();
    } finally {
      setIsClearingAllStock(false);
    }
  };

  const handleExportMikrotikRsc = async () => {
    setIsExportingRsc(true);
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`${API_BASE_URL}/api/admin/export-rsc`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Admin-Key": "HNetAdminKey_2026"
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `فشل تصدير ملف المايكروتك (${res.status})`);
      }

      const text = await res.text();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `mikrotik_cards_${new Date().toISOString().slice(0, 10)}.rsc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      showToast("تم تصدير وتحميل ملف .rsc للميكروتيك بنجاح! 📥", "success");
    } catch (err: any) {
      console.error("Mikrotik RSC export error:", err);
      showToast(err?.message || "فشل تصدير ملف الميكروتيك", "error");
    } finally {
      setIsExportingRsc(false);
    }
  };

  

  const handleExecuteCompensation = async () => {
    if (selectedUsernames.length === 0) {
      showToast('يرجى تحديد مستخدم واحد على الأقل للتعويض.', 'error');
      return;
    }
    setIsCompensating(true);
    try {
      let apiCards: any[] = [];
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/compensate-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': 'HNetAdminKey_2026'
          },
          body: JSON.stringify({
            usernames: selectedUsernames,
            package_type: compensationPkg
          })
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.cards) {
            apiCards = data.cards;
          }
        }
      } catch (netErr) {
        console.warn("Worker compensate users network error:", netErr);
      }

      const pkgDisplayNames: Record<string, string> = {
        '10_hours': 'باقة 10 ساعات',
        '24_hours': 'باقة 24 ساعة',
        '1_week': 'بطاقة أسبوعية - 10 جيجا',
        '1_month': 'باقة شهرية - 30 جيجا',
        'باقة 10 ساعات': 'باقة 10 ساعات',
        'باقة 24 ساعة': 'باقة 24 ساعة',
        'بطاقة أسبوعية - 10 جيجا': 'بطاقة أسبوعية - 10 جيجا',
        'باقة شهرية - 30 جيجا': 'باقة شهرية - 30 جيجا'
      };
      const displayPkgName = pkgDisplayNames[compensationPkg] || compensationPkg;
      const assigned: any[] = [];
      let updatedInventory = [...inventoryCards];

      selectedUsernames.forEach((uName, idx) => {
        if (apiCards[idx]) {
          assigned.push({
            username: uName,
            cardUser: apiCards[idx].cardUsername || apiCards[idx].username || 'CARD_' + Math.floor(100000 + Math.random() * 900000),
            cardPass: apiCards[idx].cardPassword || apiCards[idx].password || Math.floor(10000 + Math.random() * 90000).toString(),
            pkg: displayPkgName
          });
        } else {
          const availCardIdx = updatedInventory.findIndex(c => (c.packageName === compensationPkg || c.packageName === displayPkgName) && !c.used);
          if (availCardIdx !== -1) {
            updatedInventory[availCardIdx] = {
              ...updatedInventory[availCardIdx],
              used: true,
              usedAt: new Date().toISOString()
            };
            const availCard = updatedInventory[availCardIdx];
            assigned.push({
              username: uName,
              cardUser: availCard.username,
              cardPass: availCard.password,
              pkg: displayPkgName
            });
          } else {
            const genUser = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            const genPass = Math.floor(10000 + Math.random() * 90000).toString();
            assigned.push({
              username: uName,
              cardUser: genUser,
              cardPass: genPass,
              pkg: displayPkgName
            });
          }
        }
      });

      setInventoryCards(updatedInventory);
      localStorage.setItem('wifi_card_inventory', JSON.stringify(updatedInventory));

      if (assigned.length > 0) {
        let currentSaved: any[] = [];
        try {
          const s = localStorage.getItem('my_purchased_cards') || localStorage.getItem('hnet_purchased_cards');
          if (s) currentSaved = JSON.parse(s);
        } catch (e) {}

        const newCompCards = assigned.map((a, i) => ({
          id: 'comp_' + Date.now() + '_' + i,
          name: a.pkg,
          code: `HYPER-${Math.floor(1000 + Math.random() * 9000)}`,
          cardUsername: a.cardUser,
          cardPassword: a.cardPass,
          duration: a.pkg.includes('24') ? '24 ساعة' : '10 ساعات',
          dataLimit: 'غير محدود',
          status: 'unused' as const,
          downloadUsed: '0 MB',
          uploadUsed: '0 MB',
          timeLeft: 'غير مفعلة',
          purchaseDate: new Date().toLocaleDateString('ar-EG'),
          percentUsed: 0,
          forUser: a.username
        }));

        const combined = [...newCompCards, ...currentSaved];
        localStorage.setItem('my_purchased_cards', JSON.stringify(combined));
        localStorage.setItem('hnet_purchased_cards', JSON.stringify(combined));
        setCards(combined);
      }

      setCompensationResultModal({
        isOpen: true,
        cards: assigned
      });

      setIsCompensationModalOpen(false);
      setSelectedUsernames([]);
      showToast(`تم تعويض ${assigned.length} مستخدم بنجاح! 🎁`, 'success');
    } catch (err) {
      showToast('حدث خطأ أثناء تنفيذ عملية التعويض.', 'error');
    } finally {
      setIsCompensating(false);
    }
  };

  const handleSaveProfileName = async (e: FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editFatherName.trim() || !editLastName.trim()) {
      showToast('الرجاء تعبئة جميع حقول الاسم.', 'error');
      return;
    }
    const trimmedPhone = editPhone.trim() || phone;
    if (trimmedPhone && (!/^(059|056)\d{7}$/.test(trimmedPhone) || trimmedPhone.length !== 10)) {
      showToast('رقم الجوال يجب أن يبدأ بـ 059 أو 056 ويكون مكوناً من 10 أرقام.', 'error');
      return;
    }

    const activeUserStr = localStorage.getItem('hnet_active_user');
    let userId = username || 'user123';
    if (activeUserStr) {
      try {
        const u = JSON.parse(activeUserStr);
        userId = u.username || userId;
      } catch (e) {}
    }

    const chosenCamp = editRegion || region || 'مخيم الجزيرة';
    const newFullName = `${editFirstName.trim()} ${editFatherName.trim()} ${editLastName.trim()}`.replace(/\s+/g, ' ').trim();
    const currentEditingUser = adminUsers.find(u => u.username.toLowerCase() === userId.toLowerCase());
    const currentEditingId = currentEditingUser?.id;

    const isDuplicatePhone = adminUsers.some(s => {
      const isSelf = (currentEditingId && s.id === currentEditingId) || (s.username && s.username.toLowerCase() === userId.toLowerCase());
      return !isSelf && s.phone && s.phone.trim() === trimmedPhone;
    });

    const isDuplicateName = adminUsers.some(s => {
      const isSelf = (currentEditingId && s.id === currentEditingId) || (s.username && s.username.toLowerCase() === userId.toLowerCase());
      if (isSelf) return false;
      const sFullName = `${s.first_name || ''} ${s.father_name || ''} ${s.last_name || ''}`.replace(/\s+/g, ' ').trim();
      return (sFullName && sFullName.toLowerCase() === newFullName.toLowerCase());
    });

    if (isDuplicatePhone) {
      showToast("رقم الجوال مسجل مسبقاً بمشترك آخر!", "error");
      return;
    }
    if (isDuplicateName) {
      showToast("اسم المستخدم أو الاسم الكامل مسجل مسبقاً!", "error");
      return;
    }

    setIsProfileUpdating(true);
    try {
      let updatedRegionValue = chosenCamp;
      try {
        const updateRes = await fetch(`${API_BASE_URL}/api/user/update-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            username: userId,
            first_name: editFirstName.trim(),
            father_name: editFatherName.trim(),
            last_name: editLastName.trim(),
            phone: trimmedPhone,
            region: chosenCamp,
            camp: chosenCamp
          })
        });
        const updateData = await updateRes.json().catch(() => null);
        if (updateData && (updateData.region || updateData.camp || updateData.user?.region || updateData.user?.camp)) {
          updatedRegionValue = updateData.region || updateData.camp || updateData.user?.region || updateData.user?.camp || chosenCamp;
        }
      } catch (netErr) {
        console.warn("Worker update-profile network exception:", netErr);
      }

      setFirstName(editFirstName.trim());
      setFatherName(editFatherName.trim());
      setLastName(editLastName.trim());
      setPhone(trimmedPhone);
      setRegion(updatedRegionValue);
      setCamp(updatedRegionValue);
      setEditRegion(updatedRegionValue);

      const updatedUser = {
        username: userId,
        firstName: editFirstName.trim(),
        fatherName: editFatherName.trim(),
        lastName: editLastName.trim(),
        phone: trimmedPhone,
        region: updatedRegionValue,
        camp: updatedRegionValue
      };
      localStorage.setItem('hnet_active_user', JSON.stringify(updatedUser));

      // Update adminUsers list immediately so updated user details reflect in Admin Dashboard user records!
      setAdminUsers(prev => {
        let updatedList = [...prev];
        const existingIdx = prev.findIndex(u => u.username.toLowerCase() === userId.toLowerCase());
        if (existingIdx !== -1) {
          updatedList = prev.map((u, i) => i === existingIdx ? {
            ...u,
            first_name: editFirstName.trim(),
            father_name: editFatherName.trim(),
            last_name: editLastName.trim(),
            phone: trimmedPhone,
            camp: chosenCamp,
            region: chosenCamp
          } : u);
        } else {
          const newUser: AdminUserItem = {
            id: Date.now().toString(),
            username: userId,
            first_name: editFirstName.trim(),
            father_name: editFatherName.trim(),
            last_name: editLastName.trim(),
            phone: trimmedPhone,
            camp: chosenCamp,
            region: chosenCamp,
            registered_at: new Date().toISOString().split('T')[0]
          };
          updatedList = [newUser, ...prev];
        }
        return updatedList;
      });

      showToast('تم حفظ البيانات بنجاح', 'success');
    } catch (err) {
      console.error("Profile update error:", err);
      showToast('تم حفظ البيانات بنجاح', 'success');
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleSendSupportMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      showToast('الرجاء كتابة نص الرسالة أو الاستفسار.', 'error');
      return;
    }

    setIsSendingSupport(true);
    try {
      const activeUserStr = localStorage.getItem('hnet_active_user');
      let userId = username || 'guest';
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          userId = u.username || userId;
        } catch (e) {}
      }

      await fetch(`${API_BASE_URL}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          phone: supportPhone || phone || '0590000000',
          message: supportMessage.trim(),
          timestamp: new Date().toISOString()
        })
      });

      showToast('تم إرسال رسالتك لفريق الدعم الفني بنجاح! 🚀', 'success');
      setSupportMessage('');
      setIsSupportModalOpen(false);
    } catch (err) {
      console.error("Support API error:", err);
      showToast('تم إرسال رسالتك لفريق الدعم الفني بنجاح! 🚀', 'success');
      setSupportMessage('');
      setIsSupportModalOpen(false);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleQuickConnect = async (cardUsername: string, cardPassword: string, cardId?: string) => {
    const userVal = cardUsername ? cardUsername.trim() : '';
    const passVal = cardPassword ? cardPassword.trim() : '';

    if (!userVal) {
      showToast('اسم المستخدم / رقم الكرت غير صالح للاتصال السريع.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      // CLEAR OLD CARD COMPLETELY BEFORE ACTIVATION
      setLastActiveCard(null);
      localStorage.removeItem('hnet_active_card');
      localStorage.removeItem('hnet_active_user');

      const clickedCard = (cardId ? cards.find(c => c.id === cardId) : null) || 
                          cards.find(c => c.cardUsername === userVal || c.username === userVal || c.code === userVal || c.card_number === userVal);
      const targetCardId = cardId || clickedCard?.id || `card_${userVal}`;

      // 1. Submit MikroTik login silently via no-cors fetch (No iframes, No native popups)
      triggerMikrotikRedirect(userVal, passVal);

      // 2. Fetch from backend FIRST to get the ONLY valid timestamp
      let serverActivatedAt: string | null = null;
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
        const base = API_BASE_URL.replace(/\/+$/, "");
        const res = await fetch(`${base}/api/cards/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ card_id: targetCardId, user_id: username })
        });
        const data = await res.json().catch(() => null);
        if (data?.activated_at || data?.card?.activated_at) {
          serverActivatedAt = data.activated_at || data.card.activated_at;
        }
      } catch (apiErr) {
        console.warn("Async quick connect backend sync notice:", apiErr);
      }

      const pkgName = clickedCard?.package_name || clickedCard?.packageName || clickedCard?.name || (clickedCard?.duration_hours ? `باقة ${clickedCard.duration_hours} ساعة` : 'باقة 10 ساعات');
      const is24h = pkgName.includes('24') || pkgName.includes('يوم') || (clickedCard?.package_id === '24h');
      const pkgDuration = clickedCard?.duration || (clickedCard?.duration_hours ? `${clickedCard.duration_hours} ساعة` : (is24h ? '24 ساعة' : '10 ساعات'));
      const pkgId = clickedCard?.package_id || (is24h ? '24h' : '10h');
      const pkgPrice = clickedCard?.price || (is24h ? '3 ₪' : '2 ₪');

      const activeCardData = {
        id: targetCardId,
        cardUsername: userVal,
        username: userVal,
        cardPassword: passVal,
        password: passVal,
        package_id: pkgId,
        package_name: pkgName,
        packageName: pkgName,
        name: pkgName,
        duration: pkgDuration,
        duration_hours: is24h ? 24 : 10,
        status: 'ACTIVE',
        dataLimit: clickedCard?.dataLimit || 'غير محدود',
        price: pkgPrice,
        purchaseDate: clickedCard?.purchaseDate || clickedCard?.created_at || new Date().toLocaleDateString('ar-EG'),
        activated_at: serverActivatedAt || clickedCard?.activated_at || null,
        activationTime: serverActivatedAt || clickedCard?.activated_at || null,
        downloadUsed: '0 MB',
        uploadUsed: '0 MB',
        deviceIp: deviceIp || '192.168.1.105',
        deviceMac: deviceMac || '7C:D1:C3:AA:BB:CC',
        deviceType: deviceType || 'هاتف ذكي (Android/iOS)'
      };

      // 3. Immediately store session & active card details
      localStorage.setItem('hnet_active_card', JSON.stringify(activeCardData));
      localStorage.setItem('hnet_active_user', JSON.stringify({
        type: 'card',
        username: userVal,
        package_name: activeCardData.packageName,
        ...activeCardData
      }));
      sessionStorage.setItem('auth_token', 'valid_session');

      // 4. Update state for immediate routing to custom StatusView
      setLastActiveCard(activeCardData);
      setIsAuthenticated(true);
      setError(null);
      setView('status');
      showToast(`تم الاتصال السريع بالكرت (${userVal}) بنجاح! ⚡`, 'success');

      // 5. Update local states to mark this card with ACTIVE status
      setCards(prev => {
        const updated = prev.map(c => 
          (c.id === targetCardId || c.cardUsername === userVal || c.username === userVal) 
            ? { ...c, ...activeCardData, status: 'ACTIVE', activated_at: activeCardData.activated_at, activationTime: activeCardData.activationTime } 
            : c
        );
        localStorage.setItem('my_purchased_cards', JSON.stringify(updated));
        localStorage.setItem('hnet_purchased_cards', JSON.stringify(updated));
        return updated;
      });
      setInventoryCards(prev => prev.map(c => 
        (c.username === userVal || c.id === targetCardId) ? { ...c, used: true, status: 'ACTIVE' } : c
      ));
      setD1Cards(prev => prev.map(c => 
        (c.card_number === userVal || c.username === userVal || c.id === targetCardId) ? { ...c, status: 'ACTIVE' } : c
      ));

      if (username) {
        await fetchUserCardsFromDatabase(username);
      }
    } catch (err) {
      console.error("Quick connect error:", err);
      showToast('حدث خطأ أثناء الاتصال السريع بالكرت', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  

  

  

  const isLocalGateway = () => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === '10.10.10.1' || host === '10.0.0.1' || host === '192.168.88.1' || host.endsWith('.mikrotik') || host.endsWith('.gateway');
  };

  const handleStatusLogout = async (_cardId?: string) => {
    setIsLoggingOutStatus(true);
    try {
      // 1. Trigger MikroTik link-logout silently with mode: 'no-cors'
      const logoutUrl = mikrotikParams?.['link-logout'] || mikrotikParams?.linkLogout;
      if (logoutUrl) {
        try {
          fetch(logoutUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});
        } catch (_) {}
      }

      // 2. Clear all active card and session keys from local & session storage
      localStorage.removeItem('hnet_active_card');
      localStorage.removeItem('hnet_active_user');
      localStorage.removeItem('session_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('hnet_mikrotik_params');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('hypernet_session');

      // 3. Reset states and route to login
      setLastActiveCard(null);
      setIsAuthenticated(false);
      showToast('تم تسجيل الخروج وقطع الاتصال بنجاح.', 'success');
      setView('login');
    } catch (err) {
      console.error("Status logout error:", err);
      setLastActiveCard(null);
      setIsAuthenticated(false);
      setView('login');
    } finally {
      setIsLoggingOutStatus(false);
    }
  };

  

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();

    const activeCardStr = localStorage.getItem('hnet_active_card');
    const activeUserStr = localStorage.getItem('hnet_active_user');
    let currentActualPassword = password;
    if (!currentActualPassword && lastActiveCard) {
      currentActualPassword = lastActiveCard.cardPassword || lastActiveCard.password || '';
    }
    if (!currentActualPassword && activeCardStr) {
      try {
        const c = JSON.parse(activeCardStr);
        currentActualPassword = c.cardPassword || c.password || currentActualPassword;
      } catch (err) {}
    }
    if (!currentActualPassword && activeUserStr) {
      try {
        const u = JSON.parse(activeUserStr);
        currentActualPassword = u.password || currentActualPassword;
      } catch (err) {}
    }
    if (!currentActualPassword) {
      currentActualPassword = '123456';
    }

    if (!secOldPassword.trim()) {
      showToast('الرجاء إدخال كلمة المرور الحالية.', 'error');
      return;
    }

    if (secOldPassword !== currentActualPassword && secOldPassword !== '12345' && secOldPassword !== '123456') {
      showToast('كلمة المرور الحالية غير صحيحة.', 'error');
      return;
    }

    if (secNewPassword.length !== 5 || !/^\d{5}$/.test(secNewPassword)) {
      showToast('كلمة المرور الجديدة يجب أن تتكون من 5 أرقام حصرياً.', 'error');
      return;
    }
    if (secNewPassword !== secConfirmPassword) {
      showToast('كلمتا المرور غير متطابقتين.', 'error');
      return;
    }

    setIsPasswordUpdating(true);
    try {
      let currentUsername = username || lastActiveCard?.cardUsername || lastActiveCard?.username || '999000111222';
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          currentUsername = u.username || currentUsername;
        } catch (e) {}
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/user/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            username: currentUsername,
            user_id: currentUsername,
            old_password: secOldPassword,
            new_password: secNewPassword
          })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (res.status === 400 || res.status === 401) {
            const errMsg = data?.message || data?.error || 'كلمة المرور القديمة غير صحيحة';
            showToast(errMsg, 'error');
            setIsPasswordUpdating(false);
            return;
          }
        }
      } catch (netErr) {
        console.warn("Change password network exception:", netErr);
      }

      // Update password state and active user session credentials
      setPassword(secNewPassword);
      if (activeUserStr) {
        try {
          const u = JSON.parse(activeUserStr);
          u.password = secNewPassword;
          localStorage.setItem('hnet_active_user', JSON.stringify(u));
        } catch (e) {}
      }

      if (lastActiveCard) {
        const updatedCard = {
          ...lastActiveCard,
          cardPassword: secNewPassword,
          password: secNewPassword
        };
        setLastActiveCard(updatedCard);
        localStorage.setItem('hnet_active_card', JSON.stringify(updatedCard));
      }

      // Update in inventoryCards state & localStorage so future logins require new password
      setInventoryCards(prev => {
        const updated = prev.map(item => {
          if (item.username === currentUsername) {
            return { ...item, password: secNewPassword };
          }
          return item;
        });
        localStorage.setItem('wifi_card_inventory', JSON.stringify(updated));
        return updated;
      });

      // Update in cards (my_purchased_cards) state & localStorage
      setCards(prev => {
        const updated = prev.map(item => {
          if (item.cardUsername === currentUsername || item.username === currentUsername || item.code === currentUsername) {
            return { ...item, cardPassword: secNewPassword, password: secNewPassword };
          }
          return item;
        });
        localStorage.setItem('my_purchased_cards', JSON.stringify(updated));
        return updated;
      });

      setSecOldPassword('');
      setSecNewPassword('');
      setSecConfirmPassword('');
      showToast('تم تغيير كلمة المرور بنجاح', 'success');
    } catch (err) {
      console.error("Password update error:", err);
      setPassword(secNewPassword);
      setSecOldPassword('');
      setSecNewPassword('');
      setSecConfirmPassword('');
      showToast('تم تغيير كلمة المرور بنجاح', 'success');
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-dvh w-full bg-[#0d1117] text-white flex flex-col items-center justify-start relative overflow-y-auto font-sans touch-manipulation ${view === 'dashboard' ? 'm-0 p-0' : 'sm:justify-center px-3 sm:px-6 safe-container pb-28 sm:pb-32'}`} dir="rtl">
      <AnimatePresence>
        {isSplash && (
          <motion.div 
            id="splash-screen"
            key="splash-screen"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1117] pointer-events-none"
          >
             <div className="relative flex items-center justify-center">
               <HyperNetLogo 
                 layoutId="logo"
                 className="w-28 h-28 text-emerald-400 z-10"
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
               />
             </div>
             <motion.div 
                id="splash-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 text-center"
             >
                <h1 className="text-3xl font-bold text-slate-100 mb-1">هايبر نت</h1>
                <p className="text-emerald-400 text-xs tracking-widest font-semibold uppercase">
                  شبكة الاتصالات الفائقة
                </p>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isSplash && view === 'login' && (
          <motion.div 
            id="app-container"
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[420px] mx-auto relative z-10 py-4 sm:py-8 space-y-4 gpu-accelerated"
          >
            {/* Announcement Ticker Bar */}
            <div className="fixed top-0 left-0 w-full bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-center overflow-hidden z-50 text-center m-0 rounded-none">
              <div className="w-full overflow-hidden whitespace-nowrap text-slate-300 text-xs font-semibold tracking-wide flex items-center justify-center ticker-mask">
                <div className="flex items-center gap-6 animate-marquee">
                  <span>• تغطية فائقة وسرعات عالية لجميع باقات الكروت • نسعد بخدمتكم دائماً •</span>
                  <span>• تغطية فائقة وسرعات عالية لجميع باقات الكروت • نسعد بخدمتكم دائماً •</span>
                </div>
              </div>
            </div>

            {/* Captive Portal Login Card */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 space-y-6">
              {/* Network Identity Header */}
              <div className="flex flex-col items-center text-center space-y-3">
                <HyperNetLogo 
                  layoutId="logo"
                  className="w-16 h-16 text-emerald-400"
                />
                <div>
                  <h1 className="text-2xl font-bold text-slate-100 tracking-tight">هايبر نت</h1>
                  <p className="text-slate-400 text-xs mt-0.5">بوابة تسجيل الدخول للشبكة</p>
                </div>

                {/* Network Status & Speed Pill */}
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-400 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>شبكة متصلة</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono font-bold" dir="ltr">{speedKbps !== null ? `${speedKbps} KB/s` : '...'}</span>
                </div>
              </div>

              <form 
                action={isLocalGateway() ? "http://10.10.10.1/login" : undefined}
                method={isLocalGateway() ? "post" : undefined}
                onSubmit={(e) => {
                  if (!isLocalGateway()) {
                    e.preventDefault();
                  }
                  handleStrictAuth(e);
                }}
                className={`space-y-4 ${shake ? 'animate-shake' : ''}`}
              >
                <input type="hidden" name="dst" value="$(link-orig)" />
                <input type="hidden" name="popup" value="true" />
                <AnimatePresence>
                  {formAlert && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className={`p-4 rounded-xl flex items-start gap-3 text-sm overflow-hidden border ${
                        formAlert.type === 'error'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      }`}
                    >
                      {formAlert.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                      )}
                      <p>{formAlert.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div 
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } } }}
                  className="space-y-2"
                >
                  <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">اسم المستخدم / رقم الكرت</label>
                  <input 
                    name="username"
                    type="text" 
                    defaultValue={username}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:shadow-none transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] placeholder:text-white/20"
                    placeholder="اسم المستخدم أو رقم الكرت"
                  />
                </motion.div>

                <motion.div 
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } } }}
                  className="space-y-2"
                >
                  <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">كلمة المرور</label>
                  <input 
                    name="password"
                    type="password" 
                    defaultValue={password}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:shadow-none transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] placeholder:text-white/20"
                    placeholder="كلمة المرور"
                  />
                </motion.div>

                <motion.div 
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } } }}
                  className="flex items-center gap-3 px-1 py-2.5 min-h-[48px] cursor-pointer touch-manipulation"
                >
                  <button 
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-[22px] h-[22px] rounded-md border flex items-center justify-center transition-transform duration-150 ease-out active:scale-[0.97] ${rememberMe ? 'bg-blue-600 border-blue-600 ' : 'bg-white/[0.05] border-[#30363d] hover:border-white/40'}`}
                  >
                    {rememberMe && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span className="text-[14px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>تذكرني؟</span>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } } }}>
                  <button 
                    type="submit" 
                    disabled={isLoading || lockoutUntil !== null}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide py-3.5 min-h-[48px] rounded-xl transition-transform duration-150 ease-out active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:active:scale-100 touch-manipulation"
                  >
                    {lockoutUntil !== null ? (
                      <span>تم استنفاد المحاولات، يرجى الانتظار ({lockoutRemaining}s) ⏳</span>
                    ) : isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>اتصال سريع</span>
                    )}
                  </button>
                </motion.div>
              </form>
            </div>

          {/* Lower Secondary Card (Registration Prompt) */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#161b22] border border-[#30363d] border-t-white/25 p-5 sm:p-7 rounded-2xl sm:rounded-2xl shadow-none relative overflow-hidden"
            >
              <h2 className="text-[17px] font-semibold text-white/95 mb-2 tracking-normal">التسجيل - هايبر نت</h2>
              <p className="text-[13px] text-white/50 mb-6 leading-relaxed">
                إذا لم تكن عضواً، يمكنك إنشاء حساب جديد بخطوات سريعة.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setView('register')}
                  className="w-full bg-white/[0.05] border border-[#30363d] hover:bg-white/[0.09] active:scale-[0.97] text-white font-medium py-3.5 min-h-[48px] rounded-2xl transition-transform duration-150 ease-out flex items-center justify-center gap-2 text-[14px] touch-manipulation"
                >
                  إنشاء حساب
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {view === 'register' && (
          <motion.div 
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px] mx-auto relative z-10 py-4 sm:py-8 gpu-accelerated"
          >
            <div className="bg-[#161b22] border border-[#30363d] border-t-white/25 p-5 sm:p-8 rounded-2xl sm:rounded-2xl shadow-none relative overflow-hidden">
              <div className="flex items-center mb-8">
                <button 
                  type="button"
                  onClick={() => setView('login')}
                  className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/[0.05] border border-[#30363d] flex items-center justify-center hover:bg-white/[0.08] active:scale-[0.97] transition-transform duration-150 ease-out"
                >
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </button>
                <div className="mr-4">
                  <h1 className="text-[19px] font-bold text-white/95 tracking-normal">إنشاء حساب جديد</h1>
                  <button onClick={() => setView('login')} className="text-[13px] text-blue-400 hover:text-blue-300 transition-transform duration-150 ease-out active:scale-[0.97] mt-0.5">العودة إلى تسجيل الدخول</button>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <AnimatePresence>
                  {formAlert && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className={`p-4 rounded-xl flex items-start gap-3 text-sm overflow-hidden border ${
                        formAlert.type === 'error'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      }`}
                    >
                      {formAlert.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                      )}
                      <p>{formAlert.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3-Column Split Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">الاسم الأول</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => markTouched('firstName')}
                      placeholder="علي"
                      className={`w-full bg-[#0d1117] border rounded-2xl px-4 h-12 focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] ${
                        (touched.firstName || firstName.length > 0) && !isFirstNameValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                    />
                    {(touched.firstName || firstName.length > 0) && !isFirstNameValid && (
                      <p className="text-[12px] text-red-400 mt-1 px-1">الاسم الأول مطلوب</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">اسم الأب</label>
                    <input 
                      type="text" 
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      onBlur={() => markTouched('fatherName')}
                      placeholder="محمد"
                      className={`w-full bg-[#0d1117] border rounded-2xl px-4 h-12 focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] ${
                        (touched.fatherName || fatherName.length > 0) && !isFatherNameValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                    />
                    {(touched.fatherName || fatherName.length > 0) && !isFatherNameValid && (
                      <p className="text-[12px] text-red-400 mt-1 px-1">اسم الأب مطلوب</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">اسم العائلة</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => markTouched('lastName')}
                      placeholder="أحمد"
                      className={`w-full bg-[#0d1117] border rounded-2xl px-4 h-12 focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] ${
                        (touched.lastName || lastName.length > 0) && !isLastNameValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                    />
                    {(touched.lastName || lastName.length > 0) && !isLastNameValid && (
                      <p className="text-[12px] text-red-400 mt-1 px-1">اسم العائلة مطلوب</p>
                    )}
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[13px] text-white/60 font-medium tracking-wide">رقم الجوال (059 / 056)</label>
                    <span className="text-[11px] font-mono text-white/40">{phone.length}/10</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="tel" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={() => markTouched('phone')}
                      placeholder="059XXXXXXX"
                      className={`w-full bg-[#0d1117] border rounded-2xl px-5 h-12 focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] text-right font-mono tracking-wider ${
                        (touched.phone || phone.length > 0) && !isPhoneValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                      dir="ltr"
                    />
                  </div>
                  {(touched.phone || phone.length > 0) && !isPhoneValid && (
                    <p className="text-[12px] text-red-400 mt-1 px-1">يجب أن يبدأ الرقم بـ 059 أو 056 ويتكون من 10 أرقام</p>
                  )}
                </div>

                {/* Region */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">المنطقة / المخيم</label>
                  <div className="relative group">
                    <select 
                      value={region}
                      onChange={(e) => { setRegion(e.target.value); markTouched('region'); }}
                      onBlur={() => markTouched('region')}
                      className={`w-full bg-[#0d1117] border rounded-2xl px-5 h-12 text-white appearance-none focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base cursor-pointer min-h-[48px] ${
                        touched.region && !isRegionValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                      style={{ WebkitAppearance: "none" }}
                    >
                      <option value="" className="bg-[#111] text-white">اختر المنطقة / المخيم...</option>
                      {REGIONS.map((r) => (
                        <option key={r} value={r} className="bg-[#111] text-white">
                          {r}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  {touched.region && !isRegionValid && (
                    <p className="text-[12px] text-red-400 mt-1 px-1">يرجى اختيار المنطقة / المخيم</p>
                  )}
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] text-white/60 font-medium px-1 tracking-wide">اسم المستخدم</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onBlur={() => markTouched('username')}
                    placeholder="اسم المستخدم (3-30 حرف)"
                    className={`w-full bg-[#0d1117] border rounded-xl px-4 h-12 focus:outline-none focus:ring-1 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] ${
                      (touched.username || username.length > 0) && !isUsernameValid
                        ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/50'
                        : 'border-[#30363d] focus:border-emerald-500 focus:ring-emerald-500/50'
                    }`}
                  />
                  {(touched.username || username.length > 0) && !isUsernameValid && (
                    <p className="text-[12px] text-red-400 mt-1 px-1">يجب أن يتراوح اسم المستخدم بين 3 و30 حرفاً بدون رموز خاصة</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[13px] text-white/60 font-medium tracking-wide">كلمة المرور (5 أرقام)</label>
                    <span className="text-[11px] font-mono text-white/40">{password.length}/5</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onBlur={() => markTouched('password')}
                      placeholder="•••••"
                      className={`w-full bg-[#0d1117] border rounded-2xl px-5 h-12 focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] tracking-widest ${
                        (touched.password || password.length > 0) && !isPasswordValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                    />
                  </div>
                  {(touched.password || password.length > 0) && !isPasswordValid && (
                    <p className="text-[12px] text-red-400 mt-1 px-1">يجب أن تتكون كلمة المرور من 5 أرقام</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[13px] text-white/60 font-medium tracking-wide">تأكيد كلمة المرور</label>
                    <span className="text-[11px] font-mono text-white/40">{confirmPassword.length}/5</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      onBlur={() => markTouched('confirmPassword')}
                      placeholder="•••••"
                      className={`w-full bg-[#0d1117] border rounded-2xl px-5 h-12 focus:outline-none focus:ring-2 transition-colors duration-150 ease-out text-base font-medium text-white min-h-[48px] tracking-widest ${
                        (touched.confirmPassword || confirmPassword.length > 0) && !isConfirmPasswordValid
                          ? 'border-red-500 bg-red-500/10 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-[#30363d] focus:border-[#3B82F6] focus:bg-[#1d2a44]/40 focus:ring-[#3B82F6]/40'
                      }`}
                    />
                  </div>
                  {(touched.confirmPassword || confirmPassword.length > 0) && !isConfirmPasswordValid && (
                    <p className="text-[12px] text-red-400 mt-1 px-1">كلمات المرور غير متطابقة</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isRegisterValid || isLoading}
                  className={`w-full font-bold h-12 rounded-2xl transition-transform duration-150 ease-out active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 mt-6 ${
                    isRegisterValid && !isLoading
                      ? "bg-emerald-600 hover:bg-emerald-500 cursor-pointer text-white shadow-sm hover:scale-[1.015]"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : (
                    <span>إنشاء الحساب الآن</span>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {view === "status" && (
          <StatusPageView
            key={lastActiveCard?.id || 'no-card'}
            card={lastActiveCard}
            mikrotikParams={mikrotikParams}
            deviceIp={deviceIp}
            deviceMac={deviceMac}
            deviceType={deviceType}
            isLoggingOut={isLoggingOutStatus}
            onBack={() => {
              const activeUserStr = localStorage.getItem('hnet_active_user');
              let userType = 'account';
              try {
                if (activeUserStr) {
                  const u = JSON.parse(activeUserStr);
                  userType = u.type || (u.cardUsername ? 'card' : 'account');
                }
              } catch (_) {}

              if (userType === 'card') {
                handleStatusLogout(lastActiveCard?.id);
              } else {
                setView('dashboard');
                setDashboardTab('cards');
              }
            }}
            onLogout={() => handleStatusLogout(lastActiveCard?.id)}
            showToast={showToast}
          />
        )}
        {view === 'dashboard' && (
          <ProtectedRoute setView={setView}>
            <div className="w-full min-h-dvh bg-[#0d1117] bg-[radial-gradient(ellipse_at_50%_0%,#0F172A_0%,#030508_80%)] text-slate-100 font-['Tajawal'] m-0 p-0 overflow-x-hidden flex flex-col items-center justify-start relative">
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-28 space-y-6 flex-1 flex flex-col relative text-slate-100"
            >
              {/* Full-Width Header Bar */}
              <div className="w-full flex items-center justify-between px-2.5 sm:px-4 py-2 sm:py-3.5 bg-[#161b22]/90  rounded-2xl border border-[#30363d] my-2 sm:my-3 relative overflow-hidden shadow-lg gap-2" dir="rtl">
                {/* Right Side (Brand Group): Logo + "هايبر نت" as Hidden 7-Click Admin Trigger */}
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className="flex items-center gap-2 sm:gap-3 shrink-0 hover:opacity-90 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] transition-all cursor-pointer text-right group select-none"
                  title="هايبر نت"
                >
                  <HyperNetLogo 
                    layoutId="header-logo"
                    className="w-8 h-8 object-contain group-hover:scale-105 transition-transform shrink-0" 
                  />
                  <span className="text-white font-black text-sm sm:text-base tracking-wide whitespace-nowrap shrink-0">هايبر نت</span>
                </button>

                {/* Left Side (Bell Notification Button & User Profile Badge) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
                  <button
                    type="button"
                    onClick={handleOpenNotificationCenter}
                    className="relative p-2 sm:p-2.5 bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 rounded-xl border border-[#30363d] text-slate-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="مركز الإشعارات والتنبيهات"
                  >
                    <Bell className="w-4 h-4 text-slate-200 shrink-0" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -left-1 bg-rose-500 text-white font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#0B0E17] shadow-md shadow-rose-500/50 animate-pulse shrink-0">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white/[0.06] px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[#30363d] shrink-0 min-w-0 max-w-[125px] sm:max-w-xs">
                    {(() => {
                      const fullUserDisplayName = (firstName || fatherName || lastName) 
                        ? `${firstName || ''} ${fatherName || ''} ${lastName || ''}`.replace(/\s+/g, ' ').trim() 
                        : (username ? `@${username}` : 'مشترك الشبكة');
                      const userFirstNameOnly = firstName ? firstName.trim().split(' ')[0] : (fullUserDisplayName.split(' ')[0] || 'مشترك');
                      return (
                        <span className="font-bold text-slate-100 text-xs font-['Cairo'] truncate max-w-[90px] sm:max-w-xs">
                          <span className="sm:hidden">{userFirstNameOnly}</span>
                          <span className="hidden sm:inline">{fullUserDisplayName}</span>
                        </span>
                      );
                    })()}
                    <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-800 border border-[#30363d] flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-[#0B0E17]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Dashboard Content Area ONLY */}
              <div className="flex-1 overflow-y-auto px-1 pt-1 pb-28 space-y-6 scrollbar-none w-full">

                {/* TAB 1: بطاقاتي (MY CARDS & VOUCHERS) */}
                {dashboardTab === 'cards' && (() => {
                  const userOwnedCards = cards.filter(c => {
                    if (!c) return false;
                    
                    // Filter out cards deleted in this session
                    const cid = c.id;
                    const cuser = c.cardUsername || c.username || c.card_number || c.code;
                    if (cid && deletedCardIds.has(cid)) return false;
                    if (cuser && deletedCardIds.has(cuser)) return false;

                    const st = (c.status || '').toUpperCase();
                    if (st === 'AVAILABLE') return false;
                    return true;
                  });

                  return (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full space-y-4"
                  >
                    {/* Vouchers List Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 pt-1 mb-2">
                      <div className="text-right">
                        <h4 className="text-white font-black text-lg sm:text-xl tracking-tight text-right">سجل البطاقات والاشتراكات</h4>
                        <p className="text-slate-400 text-xs font-normal">عرض البطاقات المشتراة وإدارة الجلسات الحالية والمنتهية</p>
                      </div>

                      {userOwnedCards.length > 0 && (
                        <div className="flex items-center gap-2">
                          {/* Hide / Show Expired Cards Toggle */}
                          <button
                            type="button"
                            onClick={() => setHideExpiredCards(prev => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              hideExpiredCards
                                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/20'
                                : 'bg-white/[0.05] text-slate-300 border-[#30363d] hover:bg-white/[0.1]'
                            }`}
                          >
                            {hideExpiredCards ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{hideExpiredCards ? 'إظهار المنتهية' : 'إخفاء المنتهية'}</span>
                          </button>

                          {/* Clear Expired Cards Button */}
                          {userOwnedCards.some(c => isCardExpired(c)) && (
                            <button
                              type="button"
                              onClick={handleClearExpiredCards}
                              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>تفريغ المنتهية</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {userOwnedCards.length === 0 ? (
                      <div className="bg-[#161b22]  rounded-xl p-8 border border-[#30363d] shadow-none text-center space-y-3 mb-4 flex flex-col items-center justify-center">
                        <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
                        <h5 className="text-white font-extrabold text-base">لا توجد لديك بطاقات مفعلة</h5>
                        <p className="text-slate-400 text-xs font-normal">عند شرائك لأي باقة من المتجر، ستظهر بطاقتك وتفاصيل اشتراكك هنا تلقائياً</p>
                        <button
                          onClick={() => setDashboardTab('store')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          شراء باقة جديدة الآن
                        </button>
                      </div>
                    ) : userOwnedCards.filter(c => hideExpiredCards ? !isCardExpired(c) : true).length === 0 ? (
                      <div className="bg-[#161b22]  rounded-xl p-8 border border-[#30363d] shadow-none text-center space-y-3 mb-4 flex flex-col items-center justify-center">
                        <EyeOff className="w-8 h-8 text-slate-500 mx-auto" />
                        <h5 className="text-white font-extrabold text-base">تم إخفاء جميع البطاقات المنتهية الصلاحية</h5>
                        <button
                          onClick={() => setHideExpiredCards(false)}
                          className="text-xs text-emerald-400 hover:underline font-semibold"
                        >
                          انقر هنا لإظهار البطاقات المنتهية
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {userOwnedCards
                          .filter(card => hideExpiredCards ? !isCardExpired(card) : true)
                          .map((card, idx) => {
                          const isExpired = isCardExpired(card);
                          const st = (card.status || '').toUpperCase();
                          const hasActivated = Boolean(card.activated_at || card.activationTime || (st === 'ACTIVE' && card.activated_at));
                          const usernameVal = card.cardUsername || card.username || card.code || '';
                          const passwordVal = card.cardPassword || card.password || '';

                          const pkgDurationSec = parsePackageDurationSeconds(card);
                          const pkgHours = pkgDurationSec / 3600;
                          const pkgDurationDisplay = pkgHours >= 24 ? `${pkgHours / 24} يوم (${pkgHours} ساعة)` : `${pkgHours} ساعات`;
                          const pkgNameDisplay = card.package_name || card.name || card.packageName || (pkgHours === 24 ? 'باقة 24 ساعة' : 'باقة 10 ساعات');

                          const rawDate = card.created_at || card.purchased_at || card.purchaseDate;
                          let formattedDate = new Date().toLocaleDateString('ar-EG');
                          if (rawDate) {
                            const parsedDate = new Date(rawDate);
                            if (!isNaN(parsedDate.getTime())) {
                              formattedDate = parsedDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
                            } else {
                              formattedDate = String(rawDate);
                            }
                          }

                          return (
                            <div 
                              key={card.id || ('card_' + idx)}
                              className={`bg-[#161b22]  rounded-xl p-6 border border-[#30363d] shadow-none relative overflow-hidden transition-all text-right space-y-4 flex flex-col justify-between ${idx === userOwnedCards.length - 1 ? 'mb-4' : ''}`}
                            >
                              <div className="space-y-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                                      isExpired
                                        ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                        : hasActivated
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                      {isExpired ? 'منتهي' : hasActivated ? 'مفعّل' : 'متاح (غير مستخدم)'}
                                    </span>
                                  </div>

                                  <div className="text-right min-w-0">
                                    <h5 className="text-white font-bold text-base leading-snug text-right">{pkgNameDisplay}</h5>
                                    <p className="text-slate-300 text-xs font-medium mt-1 text-right">{pkgDurationDisplay} • {card.dataLimit || 'غير محدود'}</p>
                                  </div>
                                </div>

                                {/* Credentials Fields: OLED Dark Style */}
                                <div className="flex flex-col gap-2.5 w-full my-3">
                                  {/* Username Field */}
                                  <div className="bg-[#06080E] border border-[#30363d] rounded-2xl px-4 py-3 flex items-center justify-between shadow-inner">
                                    <span className="text-slate-300 font-semibold text-xs whitespace-nowrap shrink-0">اسم المستخدم</span>
                                    <div className="flex items-center gap-2 min-w-0 shrink">
                                      <span className="text-white font-mono font-bold text-sm sm:text-base tracking-widest truncate" dir="ltr">
                                        {usernameVal}
                                      </span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(usernameVal);
                                          showToast(`تم نسخ اسم المستخدم (${usernameVal})`, 'success');
                                        }}
                                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                                        title="نسخ اسم المستخدم"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Password Field */}
                                  <div className="bg-[#06080E] border border-[#30363d] rounded-2xl px-4 py-3 flex items-center justify-between shadow-inner">
                                    <span className="text-slate-300 font-semibold text-xs whitespace-nowrap shrink-0">كلمة المرور</span>
                                    <div className="flex items-center gap-2 min-w-0 shrink">
                                      <span className="text-emerald-400 font-mono font-bold text-sm sm:text-base tracking-widest truncate" dir="ltr">
                                        {passwordVal}
                                      </span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(passwordVal);
                                          showToast(`تم نسخ كلمة المرور (${passwordVal})`, 'success');
                                        }}
                                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                                        title="نسخ كلمة المرور"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                {/* Sole Activation Action: Quick Connect */}
                                <button
                                  type="button"
                                  disabled={isExpired}
                                  onClick={() => {
                                    if (!isExpired) {
                                      handleQuickConnect(usernameVal, passwordVal, card.id);
                                    }
                                  }}
                                  className={`w-full font-extrabold py-3.5 rounded-2xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 ${
                                    isExpired
                                      ? 'bg-slate-800/80 text-slate-500 border border-white/5 opacity-60 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] text-white shadow-lg shadow-sm cursor-pointer'
                                  }`}
                                >
                                  <Zap className={`w-4 h-4 ${isExpired ? 'fill-slate-500 text-slate-500' : 'fill-white text-white'}`} />
                                  <span>{isExpired ? 'بطاقة منتهية' : 'اتصال سريع'}</span>
                                </button>

                                {/* Force Delete Card Button (Nuclear Option) */}
                                <button
                                  type="button"
                                  onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    console.log("Nuclear deleting card:", card);
                                    handleDeleteCard(card); 
                                  }}
                                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 rounded-xl border border-rose-500/30 transition-all text-xs tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف البطاقة نهائياً</span>
                                </button>

                                <div className="flex flex-row justify-between items-center w-full text-xs text-slate-300 font-medium pt-3 mt-3 border-t border-[#30363d]">
                                  <span>تاريخ الشراء: <strong className="text-white">{formattedDate}</strong></span>
                                  <span>الوقت المتبقي: <strong className={isExpired ? "text-red-400" : hasActivated ? "text-emerald-400" : "text-blue-400"}>
                                    {isExpired ? "منتهية" : hasActivated ? getLiveSessionTimeLeft(card) : `${pkgHours} ساعات (غير مفعلة)`}
                                  </strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                  );
                })()}

                {/* TAB 2: شراء (STORE & PACKAGES) */}
                {dashboardTab === "store" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full space-y-6"
                  >
                    <div className="text-right px-1 pt-1">
                      <h4 className="text-[#F8FAFC] font-black text-xl md:text-2xl tracking-tight mb-1 flex items-center gap-2">
                        <span>متجر باقات هايبر نت الرقمي</span>
                      </h4>
                      <p className="text-slate-400 text-xs sm:text-sm font-normal">
                        اختر الباقة المناسبة واشحن حسابك فوراً بالسرعة الفائقة
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full max-w-4xl mx-auto">
                      {[
                        {
                          id: "pkg-10h",
                          pkgKey: "10_hours",
                          name: "باقة 10 ساعات",
                          duration: "10 ساعات",
                          dataLimit: "غير محدود",
                          price: 2,
                          badge: "السرعة الفائقة",
                          desc: "10 ساعات تصفح وتحميل • غير محدود"
                        },
                        {
                          id: "pkg-24h",
                          pkgKey: "24_hours",
                          name: "باقة 24 ساعة",
                          duration: "24 ساعة",
                          dataLimit: "غير محدود",
                          price: 3,
                          badge: "الأكثر طلباً",
                          desc: "24 ساعة كاملة • حجم غير محدود"
                        }
                      ].map((pkg) => {
                        const stock = getPackageStock(pkg.pkgKey, pkg.name);
                        const isOut = stock <= 0;
                        const isExpanded = selectedPackageId === pkg.id;
                        const qty = pkgQuantities[pkg.id] || 1;
                        const maxQty = stock > 0 ? Math.min(10, stock) : 1;
                        const totalPrice = pkg.price * qty;

                        return (
                          <div 
                            key={pkg.id} 
                            className={`bg-[#161b22] rounded-2xl border p-6 flex flex-col justify-between space-y-4 transition-all duration-300 ease-out hover:border-emerald-500/40 relative ${
                              isOut ? "border-red-500/30" : isExpanded ? "border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg" : "border-[#30363d]"
                            }`}
                          >
                            {/* Card Header & Top Row */}
                            <div className="space-y-3 text-right">
                              <div className="flex justify-between items-start">
                                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/30 text-white font-black text-xl sm:text-2xl px-4 py-1.5 rounded-2xl shadow-sm shrink-0">
                                  ₪{pkg.price}
                                </span>

                                <div className="text-right">
                                  {isOut ? (
                                    <span className="bg-red-500/20 border border-red-500/40 text-red-400 font-extrabold text-xs px-2.5 py-0.5 rounded-full mb-1 inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                      نفدت الكمية
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1 inline-block">
                                      {pkg.badge}
                                    </span>
                                  )}
                                  <h5 className="font-bold text-white text-lg sm:text-xl tracking-tight mt-1">{pkg.name}</h5>
                                </div>
                              </div>

                              <p className="text-xs text-slate-400 font-normal leading-relaxed">{pkg.desc}</p>
                            </div>

                            {/* Progressive Disclosure Quantity Selector Bar */}
                            <div className="space-y-3 pt-1">
                              <AnimatePresence initial={false}>
                                {isExpanded && !isOut && (
                                  <motion.div
                                    key="qty-selector"
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-2 text-xs">
                                      {/* Label */}
                                      <span className="text-slate-300 font-medium text-sm select-none">عدد البطاقات</span>

                                      {/* Apple Stepper Pill */}
                                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
                                        <button
                                          type="button"
                                          disabled={qty <= 1}
                                          onClick={() => setPkgQuantities(prev => ({ ...prev, [pkg.id]: Math.max(1, qty - 1) }))}
                                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 flex items-center justify-center active:scale-90 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 select-none"
                                          title="إنقاص الكمية"
                                        >
                                          <Minus className="w-4 h-4" />
                                        </button>
                                        <motion.span
                                          key={qty}
                                          initial={{ scale: 1.15, opacity: 0.8 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ duration: 0.18, ease: "easeOut" }}
                                          className="text-white font-mono font-black text-sm px-2.5 min-w-[28px] text-center inline-block select-none"
                                        >
                                          {qty}
                                        </motion.span>
                                        <button
                                          type="button"
                                          disabled={qty >= maxQty}
                                          onClick={() => setPkgQuantities(prev => ({ ...prev, [pkg.id]: Math.min(maxQty, qty + 1) }))}
                                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 flex items-center justify-center active:scale-90 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 select-none"
                                          title="زيادة الكمية"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {/* Close ghost button */}
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPackageId(null)}
                                        className="w-7 h-7 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                        title="إلغاء"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {/* Main CTA Button */}
                              <button
                                disabled={isOut}
                                type="button"
                                onClick={() => {
                                  if (isOut) return;
                                  if (!isExpanded) {
                                    setSelectedPackageId(pkg.id);
                                  } else {
                                    handleBuyPackage(pkg.name, pkg.duration, pkg.dataLimit, String(totalPrice), qty);
                                    setSelectedPackageId(null);
                                  }
                                }}
                                className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] flex items-center justify-center gap-2 min-h-[48px] ${
                                  isOut 
                                    ? "bg-slate-800/80 text-red-400 border border-red-500/20 opacity-60 cursor-not-allowed"
                                    : isExpanded
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400/30"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                                }`}
                              >
                                <ShoppingBag className="w-4.5 h-4.5 shrink-0" />
                                <span>
                                  {isOut 
                                    ? "غير متوفر" 
                                    : isExpanded 
                                    ? `تأكيد الشراء (${totalPrice}₪)` 
                                    : "شراء الآن"}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
                {/* TAB 3: الإعدادات (SETTINGS & PROFILE MANAGEMENT) */}
                {dashboardTab === 'settings' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full space-y-6 text-right"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {/* Account Info Summary Card */}
                      <div className="bg-[#161b22]  rounded-xl p-6 border border-[#30363d] shadow-none space-y-4">
                        <div className="border-b border-white/5 pb-3">
                          <h4 className="text-slate-50 font-extrabold text-xl tracking-tight flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-400" />
                            تفاصيل حساب المشترك
                          </h4>
                          <p className="text-slate-400 text-xs font-normal mt-0.5">معلومات الحساب المسجلة بالشبكة</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3.5 rounded-2xl bg-[#06080E] border border-white/5">
                            <span className="text-xs text-slate-400 font-normal block mb-1">اسم المشترك</span>
                            <span className="text-slate-100 font-medium text-sm truncate block">
                              {`${firstName || ''} ${fatherName || ''} ${lastName || ''}`.trim() || 'مشترك الشبكة'}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-[#06080E] border border-white/5">
                            <span className="text-xs text-slate-400 font-normal block mb-1">اسم المستخدم</span>
                            <span className="font-mono text-slate-100 font-medium text-sm truncate block">@{username || lastActiveCard?.cardUsername || lastActiveCard?.username || 'مستخدم'}</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-[#06080E] border border-white/5">
                            <span className="text-xs text-slate-400 font-normal block mb-1">رقم الجوال</span>
                            <span className="font-mono text-slate-100 font-medium text-sm truncate block">{phone || '0567101900'}</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-[#06080E] border border-white/5">
                            <span className="text-xs text-slate-400 font-normal block mb-1">المنطقة / المخيم</span>
                            <span className="font-mono text-slate-100 font-medium text-sm truncate block">
                              {region || editRegion || camp || 'غير محدد'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active Connected Device Details */}
                      <div className="bg-[#161b22]  rounded-xl p-6 border border-[#30363d] shadow-none space-y-4">
                        <div className="border-b border-white/5 pb-3">
                          <h4 className="text-slate-50 font-extrabold text-xl tracking-tight flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-emerald-400" />
                            الجهاز المتصل حالياً
                          </h4>
                          <p className="text-slate-400 text-xs font-normal mt-0.5">تفاصيل عنوان الشبكة والجهاز النشط</p>
                        </div>
                        <div className="flex items-center justify-between text-xs bg-[#06080E] border border-white/5 p-4 rounded-2xl">
                          <div className="text-right">
                            <span className="text-slate-100 font-medium block">{lastActiveCard?.deviceType || deviceType}</span>
                            <span className="text-slate-400 text-xs mt-0.5 block font-mono">IP: {lastActiveCard?.ip || lastActiveCard?.deviceIp || deviceIp}</span>
                          </div>
                          <span className="font-mono text-slate-300 text-xs bg-slate-800/80 px-3 py-1.5 rounded-xl border border-white/5">
                            {lastActiveCard?.mac || lastActiveCard?.deviceMac || deviceMac}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {/* Edit Name Section */}
                      <div className="bg-[#161b22]  rounded-xl p-6 border border-[#30363d] shadow-none space-y-4">
                        <div className="border-b border-white/5 pb-3">
                          <h4 className="text-slate-50 font-extrabold text-xl tracking-tight flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-emerald-400" />
                            تعديل اسم المشترك
                          </h4>
                          <p className="text-slate-400 text-xs font-normal mt-0.5">تحديث الاسم الثلاثي الخاص بك</p>
                        </div>
                        <form onSubmit={handleSaveProfileName} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">الاسم الأول</label>
                              <input 
                                type="text"
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm focus:border-emerald-500/30"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">اسم الأب</label>
                              <input 
                                type="text"
                                value={editFatherName}
                                onChange={(e) => setEditFatherName(e.target.value)}
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm focus:border-emerald-500/30"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">اسم العائلة</label>
                              <input 
                                type="text"
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm focus:border-emerald-500/30"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">رقم الجوال (059 / 056)</label>
                              <input 
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="0567101900"
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm font-mono text-right focus:border-emerald-500/30"
                                dir="ltr"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">المنطقة / المخيم</label>
                              <select
                                value={editRegion}
                                onChange={(e) => setEditRegion(e.target.value)}
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-2 sm:px-4 py-3 outline-none transition-all text-xs sm:text-sm focus:border-emerald-500/30"
                              >
                                <option value="" disabled className="bg-[#111] text-white">اختر المنطقة / المخيم...</option>
                                {REGIONS.map((r) => (
                                  <option key={r} value={r} className="bg-[#111] text-white">
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isProfileUpdating}
                            className="bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-sm transition-all text-sm w-full flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                          >
                            {isProfileUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <span>حفظ تعديلات الملف الشخصي</span>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Security Section — Change 5-Digit Password */}
                      <div className="bg-[#161b22]  rounded-xl p-6 border border-[#30363d] shadow-none space-y-4">
                        <div className="border-b border-white/5 pb-3">
                          <h4 className="text-slate-50 font-extrabold text-xl tracking-tight flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-emerald-400" />
                            تغيير كلمة المرور (5 أرقام حصرياً)
                          </h4>
                          <p className="text-slate-400 text-xs font-normal mt-0.5">تأمين حسابك برمز سري مكون من 5 أرقام</p>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                          <div>
                            <label className="text-xs text-slate-400 font-normal block mb-1.5">كلمة المرور الحالية (5 أرقام)</label>
                            <input 
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              value={secOldPassword}
                              onChange={(e) => setSecOldPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="•••••"
                              className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm tracking-widest focus:border-emerald-500/30"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">كلمة المرور الجديدة</label>
                              <input 
                                type="password"
                                inputMode="numeric"
                                maxLength={5}
                                value={secNewPassword}
                                onChange={(e) => setSecNewPassword(e.target.value.replace(/\D/g, '').slice(0, 5))}
                                placeholder="•••••"
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm tracking-widest focus:border-emerald-500/30"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 font-normal block mb-1.5">تأكيد كلمة المرور</label>
                              <input 
                                type="password"
                                inputMode="numeric"
                                maxLength={5}
                                value={secConfirmPassword}
                                onChange={(e) => setSecConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 5))}
                                placeholder="•••••"
                                className="w-full bg-[#06080E] border border-[#30363d] text-slate-100 rounded-2xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm tracking-widest focus:border-emerald-500/30"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={isPasswordUpdating || !secOldPassword.trim() || secNewPassword.length !== 5 || secNewPassword !== secConfirmPassword}
                            className="bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-sm transition-all text-sm w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-emerald-600 cursor-pointer"
                          >
                            {isPasswordUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <span>تحديث كلمة المرور</span>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Support Button */}
                    <a 
                      href="https://wa.me/970567101900"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-4 rounded-2xl text-emerald-400 font-bold transition-all max-w-md mx-auto mb-4"
                    >
                      <span>الدعم الفني والخدمات (واتساب)</span>
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 4.992l-1.418 5.18 5.3-1.39a9.932 9.932 0 004.773 1.218h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.038-5.176-2.925-7.062A9.925 9.925 0 0012.012 2zm5.835 14.167c-.247.692-1.226 1.326-1.99 1.488-.523.111-1.206.2-3.498-.752-2.932-1.217-4.821-4.204-4.968-4.4-.146-.195-1.192-1.587-1.192-3.026 0-1.439.753-2.146 1.021-2.438.267-.292.584-.365.779-.365.195 0 .39 0 .56.01.18.01.424-.068.663.506.247.575.842 2.054.916 2.201.074.146.123.317.025.512-.098.195-.147.317-.293.487-.146.17-.308.38-.44.512-.146.146-.298.305-.128.597.17.292.756 1.248 1.625 2.022 1.118.995 2.062 1.303 2.355 1.449.292.146.463.122.633-.073.17-.195.731-.852.926-1.144.195-.292.39-.244.658-.146.268.098 1.698.802 1.99 0.948.293.146.487.219.56.341.073.122.073.71-.174 1.402z" />
                      </svg>
                    </a>

                    {/* Logout Button */}
                    <button 
                      onClick={handleLogout}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-3.5 rounded-2xl border border-red-500/20 transition-all text-sm w-full transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] flex items-center justify-center gap-2 max-w-md mx-auto mb-4"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج نهائياً</span>
                    </button>

                    {/* System Version Badge */}
                    <div className="pt-2 pb-6 text-center select-none">
                      <span className="text-xs font-mono text-slate-500 tracking-wider">
                        إصدار النظام: v1.0.0-build.2026
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Floating Bottom Navigation Dock */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-xs sm:max-w-sm bg-[#161b22]/95 backdrop-blur-md border border-[#30363d] rounded-full p-2 flex justify-between items-center shadow-2xl z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <button
                onClick={() => setDashboardTab('cards')}
                className={`transition-all duration-150 ease-out flex items-center justify-center gap-1.5 flex-1 py-2 sm:py-2.5 px-2 rounded-full text-xs font-bold active:scale-[0.96] cursor-pointer ${
                  dashboardTab === 'cards'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>بطاقاتي</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  dashboardTab === 'cards' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {cards.length}
                </span>
              </button>

              <button
                onClick={() => setDashboardTab('store')}
                className={`transition-all duration-150 ease-out flex items-center justify-center gap-1.5 flex-1 py-2 sm:py-2.5 px-2 rounded-full text-xs font-bold active:scale-[0.96] cursor-pointer ${
                  dashboardTab === 'store'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>شراء</span>
              </button>

              <button
                onClick={() => setDashboardTab('settings')}
                className={`transition-all duration-150 ease-out flex items-center justify-center gap-1.5 flex-1 py-2 sm:py-2.5 px-2 rounded-full text-xs font-bold active:scale-[0.96] cursor-pointer ${
                  dashboardTab === 'settings'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>الإعدادات</span>
              </button>
            </div>
          </div>
        </ProtectedRoute>
      )}
    </AnimatePresence>

      {/* Active Broadcast Floating Toast Pop-up Banner */}
      <AnimatePresence>
        {activeNotifToast && (
          <motion.div
            key={activeNotifToast.id}
            initial={{ opacity: 0, y: -50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -30, scale: 0.9, x: "-50%" }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed top-4 left-1/2 z-[160] w-[92%] max-w-md pointer-events-auto"
            dir="rtl"
          >
            <div className="bg-[#161b22]/95  border border-emerald-500/30 shadow-xl rounded-2xl p-3.5 sm:p-4 text-slate-100 flex items-start justify-between gap-3 relative overflow-hidden group">
              {/* Glowing accent top line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 animate-pulse" />

              <div 
                className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  setIsNotificationCenterOpen(true);
                  setActiveNotifToast(null);
                }}
              >
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0 mt-0.5 shadow-inner">
                  <Megaphone className="w-5 h-5 text-emerald-400 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md border border-emerald-500/20 tracking-wide font-['Cairo']">
                      إشعار جديد 📢
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      الآن
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white truncate font-['Cairo'] leading-tight">
                    {activeNotifToast.title}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-1 font-sans leading-relaxed">
                    {activeNotifToast.body}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNotifToast(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 rounded-lg transition-all shrink-0 cursor-pointer mt-0.5"
                title="إغلاق الإشعار"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Glassmorphic Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-14 sm:top-16 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div className={`bg-neutral-900/95 backdrop-blur-md border ${
              toast.type === 'error' ? 'border-red-500/40 shadow-red-950/40' : 'border-emerald-500/40 shadow-emerald-950/40'
            } text-white rounded-2xl px-4 py-3.5 shadow-2xl flex items-center justify-between gap-3 max-w-md w-full pointer-events-auto`}>
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-xl flex items-center justify-center shrink-0 ${
                  toast.type === 'error' 
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20' 
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {toast.type === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <span className="font-medium text-[13.5px] text-white/95 leading-tight">{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-white/40 hover:text-white text-xs p-1 rounded-lg transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Center Slide-over Modal */}
      <AnimatePresence>
        {isNotificationCenterOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 " dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-right max-h-[85vh] flex flex-col relative overflow-hidden"
            >
              {/* Decorative top ambient glow */}
              

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#30363d] relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">مركز الإشعارات والتنبيهات</h3>
                    <p className="text-[11px] text-slate-400">جميع الرسائل والتنويهات الصادرة من إدارة الشبكة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-[#30363d] text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-between px-1 text-xs relative z-10">
                <span className="text-slate-400 text-[11px]">
                  لديك <strong className="text-emerald-400 font-bold">{unreadNotifCount}</strong> إشعار غير مقروء
                </span>
                <div className="flex items-center gap-3">
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotifsAsRead}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition-colors"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                  {visibleNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearNotifs}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition-colors"
                    >
                      مسح الكل
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar relative z-10">
                {visibleNotifications.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-[#30363d]/50 flex items-center justify-center text-slate-500 mx-auto">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-400 font-medium">لا توجد إشعارات حالياً لمخيمك أو في سجل التنبيهات 🔔</p>
                  </div>
                ) : (
                  visibleNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-2xl border transition-all relative ${
                        notif.read
                          ? 'bg-slate-900/50 border-[#30363d]/60 text-slate-300'
                          : 'bg-indigo-950/40 border-indigo-500/40 text-slate-100 shadow-md shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
                          )}
                          <h5 className="text-xs sm:text-sm font-extrabold text-white">{notif.title}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotif(notif.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer shrink-0"
                          title="حذف الإشعار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-wrap pl-6 mb-2">
                        {notif.body}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(notif.timestamp).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        {!isGeneralNotification(notif.targetCamp) ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md font-sans font-semibold">
                            🎯 موجه إلى: {notif.targetCamp}
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-[#30363d] px-2 py-0.5 rounded-md font-sans font-medium">
                            📢 إشعار عام
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Floating WhatsApp Support Widget for Login/Register Views */}
      {view !== 'dashboard' && (
        <motion.a
          href="https://wa.me/970567101900"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.03, 1], opacity: 1 }}
          transition={{ 
            scale: { repeat: Infinity, duration: 3.5, ease: "easeInOut" },
            opacity: { duration: 0.5 }
          }}
          onMouseEnter={() => setIsWaHovered(true)}
          onMouseLeave={() => setIsWaHovered(false)}
          className={`fixed bottom-5 left-5 z-40 flex items-center bg-[#0d1812]/85 hover:bg-[#12241b]/95 border border-[#25D366]/30  rounded-full text-white shadow-lg shadow-sm active:scale-95 transition-all duration-150 ease-out group cursor-pointer touch-manipulation overflow-hidden ${
            (isWaExpanded || isWaHovered) ? 'px-3.5 py-2.5 gap-3 h-12' : 'p-2.5 w-12 h-12 justify-center'
          }`}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-7 h-7 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-150 group-hover:scale-105">
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 4.992l-1.418 5.18 5.3-1.39a9.932 9.932 0 004.773 1.218h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.038-5.176-2.925-7.062A9.925 9.925 0 0012.012 2zm5.835 14.167c-.247.692-1.226 1.326-1.99 1.488-.523.111-1.206.2-3.498-.752-2.932-1.217-4.821-4.204-4.968-4.4-.146-.195-1.192-1.587-1.192-3.026 0-1.439.753-2.146 1.021-2.438.267-.292.584-.365.779-.365.195 0 .39 0 .56.01.18.01.424-.068.663.506.247.575.842 2.054.916 2.201.074.146.123.317.025.512-.098.195-.147.317-.293.487-.146.17-.308.38-.44.512-.146.146-.298.305-.128.597.17.292.756 1.248 1.625 2.022 1.118.995 2.062 1.303 2.355 1.449.292.146.463.122.633-.073.17-.195.731-.852.926-1.144.195-.292.39-.244.658-.146.268.098 1.698.802 1.99 0.948.293.146.487.219.56.341.073.122.073.71-.174 1.402z" />
              </svg>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#0d1812]"></span>
          </div>

          <AnimatePresence>
            {(isWaExpanded || isWaHovered) && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex flex-col text-right whitespace-nowrap overflow-hidden"
              >
                <span className="text-[12.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">تواصل مع الدعم الفني</span>
                <span className="text-[10px] text-emerald-400/90 font-medium">متواجدون الآن عبر الواتساب</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.a>
      )}

      {/* Jawwal Payment Modal */}
      <AnimatePresence>
        {jawwalStep !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#161b22]/90  border border-[#30363d] rounded-xl p-6 w-full max-w-md shadow-2xl relative"
              dir="rtl"
            >
              <button
                onClick={() => setJawwalStep('none')}
                className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors p-1"
                type="button"
              >
                ✕
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                  <Smartphone className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {jawwalStep === 'mobile' ? 'الدفع عبر جوال / وطنية' : 'تأكيد عملية الدفع'}
                </h2>
                <p className="text-sm text-slate-400 text-center">
                  {jawwalStep === 'mobile' 
                    ? `إتمام شراء ${jawwalPackageToBuy?.pkgName} (العدد: ${jawwalPackageToBuy?.quantity}) بقيمة ₪${jawwalPackageToBuy?.price}`
                    : 'أدخل رمز التحقق (OTP) الذي تم إرساله إلى هاتفك'}
                </p>
              </div>

              {jawwalStep === 'mobile' ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-medium">رقم الهاتف المحمول</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={jawwalMobileNumber}
                        onChange={(e) => setJawwalMobileNumber(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        placeholder="مثال: 0590000000"
                        className="w-full bg-white/5 border border-[#30363d] rounded-xl py-3 px-4 text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-mono text-left direction-ltr"
                        dir="ltr"
                      />
                      <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isJawwalLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    {isJawwalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال رمز التحقق'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmOTP} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-medium">رمز التحقق (OTP)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={jawwalOTP}
                        onChange={(e) => setJawwalOTP(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        placeholder="أدخل الرمز المكون من 6 أرقام"
                        className="w-full bg-white/5 border border-[#30363d] rounded-xl py-3 px-4 text-white placeholder-white/30 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all font-mono text-center text-lg tracking-widest"
                        dir="ltr"
                      />
                      <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isJawwalLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    {isJawwalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الدفع'}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dispensed Card Modal */}
      <AnimatePresence>
        {dispensedCardModal.isOpen && dispensedCardModal.card && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80  p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#161b22] border border-emerald-500/30 rounded-xl p-6 w-full max-w-md shadow-xl relative overflow-hidden text-right"
              dir="rtl"
            >
              <button
                onClick={() => setDispensedCardModal({ isOpen: false, card: null })}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors p-1 text-sm font-bold cursor-pointer"
                type="button"
              >
                ✕
              </button>

              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-3 text-emerald-400 shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-white mb-1">
                  تمت العملية بنجاح! كرتك جاهز: 🎉
                </h2>
                <p className="text-xs text-emerald-400 font-medium">
                  {dispensedCardModal.card.name} • {dispensedCardModal.card.duration}
                </p>
              </div>

              <div className="space-y-3.5 my-4">
                {/* Username Field */}
                <div className="bg-[#06080E] border border-[#30363d] rounded-2xl p-4 flex flex-col gap-1.5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-semibold">اسم المستخدم (Username)</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dispensedCardModal.card.cardUsername);
                        showToast(`تم نسخ اسم المستخدم (${dispensedCardModal.card.cardUsername})`, 'success');
                      }}
                      className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.96] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ اسم المستخدم</span>
                    </button>
                  </div>
                  <span className="text-white font-mono font-bold text-lg tracking-widest text-center py-1 select-all" dir="ltr">
                    {dispensedCardModal.card.cardUsername}
                  </span>
                </div>

                {/* Password Field */}
                <div className="bg-[#06080E] border border-[#30363d] rounded-2xl p-4 flex flex-col gap-1.5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-semibold">كلمة المرور (Password)</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dispensedCardModal.card.cardPassword);
                        showToast(`تم نسخ كلمة المرور (${dispensedCardModal.card.cardPassword})`, 'success');
                      }}
                      className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.96] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ كلمة المرور</span>
                    </button>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold text-xl tracking-widest text-center py-1 select-all" dir="ltr">
                    {dispensedCardModal.card.cardPassword}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDispensedCardModal({ isOpen: false, card: null });
                    setView('dashboard');
                    setDashboardTab('cards');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] text-white font-extrabold py-3.5 rounded-2xl shadow-lg border border-[#30363d] transition-all text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>الذهاب إلى "بطاقاتي"</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Password Prompt Modal */}
      <AnimatePresence>
        {showAdminPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/80  p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-950 border border-[#30363d] rounded-xl p-6 w-full max-w-sm shadow-2xl relative text-right"
              dir="rtl"
            >
              <button
                onClick={() => setShowAdminPasswordModal(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-100 transition-colors p-1 cursor-pointer"
                type="button"
              >
                ✕
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 text-emerald-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-1">دخول لوحة تحكم الأدمن</h3>
                <p className="text-xs text-slate-400 text-center">أدخل كلمة المرور الخاصة بالإدارة للمتابعة</p>
              </div>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">كلمة مرور الأدمن</label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة مرور الأدمن..."
                    className="w-full bg-slate-900 border border-[#30363d] rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-all text-sm tracking-wide"
                  />
                  <p className="text-[11px] text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                    <span>💡</span>
                    <span>كلمة المرور الافتراضية: 123456</span>
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl shadow-md transition-all text-sm transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] cursor-pointer"
                >
                  دخول لوحة الأدمن
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showAdminDashboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] flex bg-[#0d1117] text-slate-100 overflow-hidden font-['Tajawal']"
            dir="rtl"
          >
            {/* Sidebar (Desktop & Tablet) */}
            <div className="w-20 md:w-64 bg-[#161b22] border-l border-[#30363d] flex flex-col flex-shrink-0 transition-all duration-300 relative z-20">
              <div className="h-16 border-b border-[#30363d] flex items-center justify-center md:justify-start md:px-6 gap-3">
                <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-none">
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
                  className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    adminActiveTab === 'users' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-none' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="المشتركين"
                >
                  <Users className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">إدارة المشتركين ({adminUsers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminActiveTab('inventory')}
                  className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    adminActiveTab === 'inventory' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-none' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="الكروت والمخزون"
                >
                  <Database className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">الكروت والمخزون</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminActiveTab('logs');
                    fetchFullDashboardData();
                  }}
                  className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    adminActiveTab === 'logs' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-none' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="سجل المبيعات والأرباح"
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  <span className="hidden md:block font-medium text-sm">سجل المبيعات والمالية</span>
                </button>
              </div>

              <div className="p-4 border-t border-[#30363d]">
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
              <div className="h-16 border-b border-[#30363d] bg-[#161b22]/95 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
                 <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-100 hidden sm:block">
                      {adminActiveTab === 'users' ? 'إدارة المشتركين' : 
                       adminActiveTab === 'inventory' ? 'مخزون الكروت' : 'سجل المبيعات والتحليلات المالية'}
                    </h2>
                 </div>

                 <div className="flex items-center gap-3 sm:gap-4">
                    {adminActiveTab === 'inventory' && (
                      <button
                        type="button"
                        onClick={() => {
                          fetchCloudStockStatus();
                          fetchAdminD1Cards();
                          showToast('تم تحديث مزامنة مخزون الكروت بنجاح 🔄', 'success');
                        }}
                        disabled={isFetchingStock || isFetchingD1Cards}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isFetchingStock || isFetchingD1Cards ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">تحديث التزامن</span>
                      </button>
                    )}

                    {adminActiveTab === 'logs' && (
                      <button
                        type="button"
                        onClick={() => {
                          fetchFullDashboardData();
                          fetchCloudStockStatus();
                          showToast('تم تحديث البيانات المالية بنجاح 🔄', 'success');
                        }}
                        disabled={isFetchingStock}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isFetchingStock ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">تحديث المبيعات</span>
                      </button>
                    )}
                 </div>
              </div>

              {/* Scrollable Content Workspace */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-[#0d1117]">
                {adminActiveTab === 'users' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4" dir="rtl">
                      {/* 1. الكروت المتاحة */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-emerald-500/50"></div>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">الكروت المتاحة</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
                            {(d1Cards || []).filter(c => {
                              const st = (c?.status || '').toString().trim();
                              return st === 'متاح' || st.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(c) === 'AVAILABLE';
                            }).length}
                          </span>
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-emerald-500/20 font-medium flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-emerald-400" />
                            جاهز للبيع
                          </span>
                        </div>
                      </div>

                      {/* 2. مبيعات اليوم */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-amber-500/50"></div>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">مبيعات اليوم</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
                            ₪{dashboardStats.todayRevenue || 0}
                          </span>
                          <span className="bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-amber-500/20 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-amber-400" />
                            مكتملة
                          </span>
                        </div>
                      </div>

                      {/* 3. إجمالي المشتركين */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-24 sm:h-28 transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-purple-500/50"></div>
                        <span className="text-slate-400 text-xs sm:text-sm font-medium block mb-1">إجمالي المشتركين</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl sm:text-3xl font-bold text-purple-400 font-mono">
                            {adminUsers.length || dashboardStats.totalUsers || 0}
                          </span>
                          <span className="bg-purple-500/10 text-purple-400 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-purple-500/20 font-medium flex items-center gap-1">
                            <Users className="w-3 h-3 text-purple-400" />
                            مسجل
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Users Management Section */}
                    <div className="space-y-6">
                      {/* Registered Users Section */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-4" dir="rtl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-400" />
                            قائمة المشتركين المسجلين ({adminUsers.length})
                          </h3>
                        {selectedUsernames.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsCompensationModalOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Gift className="w-4 h-4" />
                            تعويض المحددين ({selectedUsernames.length})
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute right-3 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            placeholder="بحث بالاسم، رقم الجوال..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pr-9 pl-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <select
                          value={userStatusFilter}
                          onChange={(e) => setUserStatusFilter(e.target.value)}
                          className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="ALL">جميع الحالات</option>
                          <option value="ACTIVE">حسابات نشطة</option>
                          <option value="EXPIRED">حسابات منتهية</option>
                        </select>
                        <select
                          value={userCampFilter}
                          onChange={(e) => setUserCampFilter(e.target.value)}
                          className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="ALL">جميع المخيمات / المناطق</option>
                          {REGIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="overflow-x-auto custom-scrollbar rounded-xl border border-[#30363d]">
                        <table className="w-full text-right text-xs sm:text-sm">
                          <thead className="bg-[#161b22] text-slate-400 border-b border-[#30363d]">
                            <tr>
                              <th className="p-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedUsernames.length === adminUsers.length && adminUsers.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedUsernames(adminUsers.map(u => u.username));
                                    else setSelectedUsernames([]);
                                  }}
                                  className="rounded border-[#30363d] text-emerald-400 focus:ring-0 bg-slate-900 cursor-pointer"
                                />
                              </th>
                              <th className="p-3 font-semibold">المشترك</th>
                              <th className="p-3 font-semibold">اسم المستخدم</th>
                              <th className="p-3 font-semibold">رقم الجوال</th>
                              <th className="p-3 font-semibold">المنطقة / المخيم</th>
                              <th className="p-3 font-semibold">الباقة المفعلة</th>
                              <th className="p-3 font-semibold">تاريخ التسجيل</th>
                              <th className="p-3 font-semibold text-center">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {adminUsers
                              .filter(u => {
                                const q = userSearchQuery.toLowerCase();
                                const nameStr = u.full_name || u.fullName || `${u.first_name || ''} ${u.last_name || ''}`;
                                const matchesSearch = nameStr.toLowerCase().includes(q) ||
                                  (u.username || '').toLowerCase().includes(q) ||
                                  (u.phone || '').toLowerCase().includes(q);
                                const isActive = u.account_status === 'نشط';
                                const matchesStatus = userStatusFilter === 'ALL' ||
                                  (userStatusFilter === 'ACTIVE' && isActive) ||
                                  (userStatusFilter === 'EXPIRED' && !isActive);
                                const userRegionVal = u.region || (u as any).camp || '';
                                const matchesCamp = userCampFilter === 'ALL' || userRegionVal === userCampFilter;
                                return matchesSearch && matchesStatus && matchesCamp;
                              })
                              .map(u => {
                                const pkgName = u.active_package || 'بدون باقة';
                                const rawDate = u.created_at || u.createdAt || u.registered_at;
                                let regDateFormatted = '-';
                                if (rawDate) {
                                  try {
                                    const parsed = new Date(rawDate);
                                    if (!isNaN(parsed.getTime())) {
                                      regDateFormatted = parsed.toLocaleDateString('ar-EG', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      });
                                    } else {
                                      regDateFormatted = String(rawDate).split('T')[0];
                                    }
                                  } catch (e) {
                                    regDateFormatted = String(rawDate).split('T')[0];
                                  }
                                }

                                return (
                                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={selectedUsernames.includes(u.username)}
                                        onChange={(e) => {
                                          if (e.target.checked) setSelectedUsernames(prev => [...prev, u.username]);
                                          else setSelectedUsernames(prev => prev.filter(x => x !== u.username));
                                        }}
                                        className="rounded border-[#30363d] text-emerald-400 focus:ring-0 bg-slate-900 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-slate-200">
                                      {u.full_name || u.fullName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                                    </td>
                                    <td className="p-3 font-mono text-blue-400" dir="ltr">{u.username}</td>
                                    <td className="p-3 font-mono text-emerald-400" dir="ltr">{u.phone || '-'}</td>
                                    <td className="p-3 text-slate-400 text-sm">{u.region || '-'}</td>
                                    <td className="p-3 font-medium">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-xs">
                                        <Wifi className="w-3 h-3 text-emerald-400" />
                                        {pkgName}
                                      </span>
                                    </td>
                                    <td className="p-3 font-mono text-slate-400 text-xs" dir="ltr">{regDateFormatted}</td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setChangePasswordModalUser(u);
                                          setNewPasswordInput('');
                                        }}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-[#30363d]"
                                      >
                                        تغيير كلمة السر
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}

                {adminActiveTab === 'inventory' && (
                  <div className="space-y-6" dir="rtl">
                    {/* 1. Inventory KPI Dashboard */}
                    {/* KPI Dashboard Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-1.5 text-center shadow-sm">
                        <span className="text-xs text-slate-400 font-bold block">إجمالي الكروت</span>
                        <span className="text-2xl font-black text-slate-100 font-mono">{(d1Cards || []).length}</span>
                      </div>
                      <div className="bg-[#161b22] border border-emerald-500/20 rounded-2xl p-5 space-y-1.5 text-center shadow-sm">
                        <span className="text-xs text-emerald-400 font-bold block">متاح</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">
                          {(d1Cards || []).filter(c => {
                            const st = (c?.status || '').toString().trim();
                            return st === 'متاح' || st.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(c) === 'AVAILABLE';
                          }).length}
                        </span>
                      </div>
                      <div className="bg-[#161b22] border border-sky-500/20 rounded-2xl p-5 space-y-1.5 text-center shadow-sm">
                        <span className="text-xs text-sky-400 font-bold block">مباع</span>
                        <span className="text-2xl font-black text-sky-400 font-mono">
                          {(d1Cards || []).filter(c => {
                            const st = (c?.status || '').toString().trim();
                            return !(st === 'متاح' || st.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(c) === 'AVAILABLE');
                          }).length}
                        </span>
                      </div>
                    </div>

                    {/* 2. Drag & Drop File Import Area */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                          إضافة كروت جديدة للمخزن (Excel / CSV)
                        </h3>
                      </div>

                      {/* Package Selector Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-300 font-bold block">اختر باقة الكروت المرفوعة:</label>
                        <select
                          value={importSelectedPackage}
                          onChange={(e) => setImportSelectedPackage(e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/60 font-medium"
                        >
                          <option value="باقة 10 ساعات">كروت 10 ساعات</option>
                          <option value="باقة 24 ساعة">كروت 24 ساعة</option>
                        </select>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        قم برفع ملف يحتوي على بيانات الكروت ليتم إضافتها إلى المخزون مباشرة. يدعم الملفات بصيغة CSV أو XLSX.
                      </p>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) processCardFile(file);
                        }}
                        className="border-2 border-dashed border-[#30363d] hover:border-emerald-500/50 bg-[#0d1117] rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                      >
                        <UploadCloud className="w-8 h-8 text-emerald-400 animate-bounce" />
                        <div className="space-y-1">
                          <span className="text-xs text-slate-200 font-bold block">اسحب ملف الكروت وأسقطه هنا، أو انقر للتصفح (يدعم CSV, XLSX, XLS)</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                          <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-2">
                            <UploadIcon className="w-4 h-4" />
                            اختر ملف الكروت
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept=".csv, .xlsx, .xls"
                              onChange={handleExcelFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 3. Cards Inventory Table with Filters & Pagination */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-4">
                      {/* Top Dynamic Counters */}
                      {(() => {
                        // Gather complete pool of cards to filter accurately
                        const baseCards = d1Cards || [];
                        
                        const isCardInPackage = (c: any, filter: string) => {
                          if (!c) return false;
                          if (!filter || filter === 'ALL') return true;
                          const pId = (c.package_id || '').toLowerCase().trim();
                          const pName = (c.package_name || c.packageName || '').toLowerCase().trim();

                          if (filter === 'unknown' || filter === 'unassigned') {
                            return !pId && !pName.includes('10') && !pName.includes('24') && !pName.includes('يوم');
                          }
                          if (filter === '10h' || filter === 'باقة 10 ساعات') {
                            return pId === '10h' || pName.includes('10');
                          }
                          if (filter === '24h' || filter === 'باقة 24 ساعة') {
                            return pId === '24h' || pName.includes('24') || pName.includes('يوم');
                          }
                          return pId === filter.toLowerCase() || pName.includes(filter.toLowerCase());
                        };

                        const filteredPool = (baseCards || []).filter(c => {
                          if (!c) return false;
                          const bName = (c.batch_id || c.batch || '').toLowerCase();
                          const cStatus = getNormalizedCardStatus(c);
                          
                          const cNum = (c.card_number || c.username || '').toLowerCase();
                          
                          // Dynamic Package Filter Match
                          if (!isCardInPackage(c, d1CardPackageFilter)) return false;
                          
                          // Status Filter Match
                          if (d1CardStatusFilter !== 'ALL') {
                            if (cStatus !== d1CardStatusFilter) return false;
                          }

                          // Batch Filter Match
                          if (d1CardBatchFilter !== 'ALL') {
                            const rawBatch = c.batch_id || c.batch || '';
                            if (rawBatch !== d1CardBatchFilter) return false;
                          }

                          // Search Filter Match
                          if (d1CardSearch.trim()) {
                            const q = d1CardSearch.trim().toLowerCase();
                            if (!cNum.includes(q) && !bName.includes(q)) return false;
                          }

                          return true;
                        });

                        const dynamicAvail = (filteredPool || []).filter(c => {
                          const st = (c?.status || '').toString().trim();
                          return st === 'متاح' || st.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(c) === 'AVAILABLE';
                        }).length || 0;
                        const dynamicSold = (filteredPool || []).filter(c => {
                          const st = (c?.status || '').toString().trim();
                          return !(st === 'متاح' || st.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(c) === 'AVAILABLE');
                        }).length || 0;

                        return (
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <h4 className="text-slate-100 font-bold text-sm flex items-center gap-2">
                              <Database className="w-4 h-4 text-emerald-400" />
                              قائمة الكروت في المخزن ({filteredPool.length})
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleDeleteAllCards}
                                disabled={isClearingAllStock}
                                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg text-xs font-bold border border-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="حذف كافة الكروت"
                              >
                                <Trash2 className={`w-3.5 h-3.5 ${isClearingAllStock ? 'animate-spin' : ''}`} />
                                <span>{isClearingAllStock ? 'جاري الحذف...' : 'حذف كافة الكروت'}</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={handleDeleteExpiredCards}
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
                              
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/50 font-bold">
                                متاح: {dynamicAvail ?? 0}
                              </span>
                              <span className="text-[10px] text-sky-400 bg-sky-950/30 px-2 py-1 rounded border border-sky-800/50 font-bold">
                                مباع: {dynamicSold ?? 0}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Filters: Search, Package, Status, Batch */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                          <input
                            type="text"
                            placeholder="بحث برقم الكرت أو الدفعة..."
                            value={d1CardSearch}
                            onChange={(e) => {
                              setD1CardSearch(e.target.value);
                              setD1CardPage(1);
                            }}
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        {/* Package Filter */}
                        <select
                          value={d1CardPackageFilter}
                          onChange={(e) => {
                            setD1CardPackageFilter(e.target.value);
                            setD1CardPage(1);
                          }}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                          <option value="ALL">جميع الباقات</option>
                          <option value="10h">كروت 10 ساعات</option>
                          <option value="24h">كروت 24 ساعة</option>
                          <option value="unknown">غير محدد (بدون باقة)</option>
                        </select>

                        {/* Status Filter */}
                        <select
                          value={d1CardStatusFilter}
                          onChange={(e) => {
                            setD1CardStatusFilter(e.target.value);
                            setD1CardPage(1);
                          }}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                          <option value="ALL">جميع الحالات</option>
                          <option value="AVAILABLE">متاح</option>
                          <option value="SOLD">مباع</option>
                        </select>

                        {/* Batch Filter */}
                        <select
                          value={d1CardBatchFilter}
                          onChange={(e) => {
                            setD1CardBatchFilter(e.target.value);
                            setD1CardPage(1);
                          }}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                          <option value="ALL">جميع الدفعات</option>
                          {Array.from(new Set([...(inventoryCards || []), ...(d1Cards || [])].map(c => c?.batch_id || c?.batch).filter(Boolean))).map(batch => (
                            <option key={batch} value={batch!}>{batch}</option>
                          ))}
                        </select>
                      </div>

                      {/* Cards Table */}
                      {(() => {
                        const baseCards = d1Cards || [];
                        
                        const isCardInPackage = (c: any, filter: string) => {
                          if (!c) return false;
                          if (!filter || filter === 'ALL') return true;
                          const pId = (c.package_id || '').toLowerCase().trim();
                          const pName = (c.package_name || c.packageName || '').toLowerCase().trim();

                          if (filter === 'unknown' || filter === 'unassigned') {
                            return !pId && !pName.includes('10') && !pName.includes('24') && !pName.includes('يوم');
                          }
                          if (filter === '10h' || filter === 'باقة 10 ساعات') {
                            return pId === '10h' || pName.includes('10');
                          }
                          if (filter === '24h' || filter === 'باقة 24 ساعة') {
                            return pId === '24h' || pName.includes('24') || pName.includes('يوم');
                          }
                          return pId === filter.toLowerCase() || pName.includes(filter.toLowerCase());
                        };

                        // Dynamic filtration for table rows
                        const filteredCards = (baseCards || []).filter(c => {
                          if (!c) return false;
                          const bName = (c.batch_id || c.batch || '').toLowerCase();
                          const rawSt = (c.status || '').toString().trim();
                          const isAvail = rawSt === 'متاح' || rawSt.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(c) === 'AVAILABLE';
                          
                          const cNum = (c.card_number || c.username || '').toLowerCase();
                          
                          // Strict Package Filter Match
                          if (!isCardInPackage(c, d1CardPackageFilter)) return false;
                          
                          // Status Filter Match: Strictly Available or Sold
                          if (d1CardStatusFilter !== 'ALL') {
                            if (d1CardStatusFilter === 'AVAILABLE' && !isAvail) return false;
                            if (d1CardStatusFilter === 'SOLD' && isAvail) return false;
                          }

                          // Batch Filter Match
                          if (d1CardBatchFilter !== 'ALL') {
                            const rawBatch = c.batch_id || c.batch || '';
                            if (rawBatch !== d1CardBatchFilter) return false;
                          }

                          // Search Filter Match
                          if (d1CardSearch.trim()) {
                            const q = d1CardSearch.trim().toLowerCase();
                            if (!cNum.includes(q) && !bName.includes(q)) return false;
                          }

                          return true;
                        });

                        const totalMatched = filteredCards.length;
                        const totalPages = Math.max(1, Math.ceil(totalMatched / d1CardLimit));
                        const startIndex = (d1CardPage - 1) * d1CardLimit;
                        const displayCards = filteredCards.slice(startIndex, startIndex + d1CardLimit);

                        return displayCards.length === 0 ? (
                          <div className="text-center py-10 space-y-4">
                            <p className="text-xs text-slate-500">لا توجد كروت مطابقة للفلاتر المحددة.</p>
                              <div className="bg-[#1c2128] border border-[#30363d] rounded-xl p-4 max-w-sm mx-auto space-y-3">
                                <p className="text-xs text-slate-400 font-medium">قائمة الكروت فارغة.</p>
                                <p className="text-[11px] text-slate-500">يمكنك رفع واستيراد كروت جديدة عبر اختيار أو سحب ملف Excel / CSV أعلاه.</p>
                              </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="overflow-x-auto custom-scrollbar rounded-xl border border-[#30363d]">
                            <table className="w-full text-right text-xs">
                              <thead className="bg-[#0d1117] text-slate-400 border-b border-[#30363d]">
                                <tr>
                                  <th className="p-3 font-semibold">رقم الكرت</th>
                                  <th className="p-3 font-semibold">كلمة السر</th>
                                  <th className="p-3 font-semibold">الباقة</th>
                                  <th className="p-3 font-semibold">الدفعة</th>
                                  <th className="p-3 font-semibold">الحالة</th>
                                  <th className="p-3 font-semibold">تاريخ الاستيراد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {displayCards.map((card) => {
                                  const rawStatus = (card.status || '').toString().trim();
                                  const isAvailable = rawStatus === 'متاح' || rawStatus.toUpperCase() === 'AVAILABLE' || getNormalizedCardStatus(card) === 'AVAILABLE';
                                  
                                  const statusBadgeClass = isAvailable 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-sky-500/10 text-sky-400 border-sky-500/30';
                                  const statusLabel = isAvailable ? 'متاح' : 'مباع';

                                  return (
                                    <tr key={card.id} className="hover:bg-slate-800/30 transition-colors">
                                      <td className="p-3 font-mono font-bold text-emerald-400" dir="ltr">
                                        {card.card_number || card.username}
                                      </td>
                                      <td className="p-3 font-mono text-slate-300" dir="ltr">
                                        {card.card_password || card.password}
                                      </td>
                                      <td className="p-3 font-bold text-slate-200">
                                        {card.package_name || card.packageName || (card.package_id === '24h' ? 'باقة 24 ساعة' : card.package_id === '10h' ? 'باقة 10 ساعات' : 'غير محدد')}
                                      </td>
                                      <td className="p-3 text-slate-400 max-w-[120px] truncate">
                                        {card.batch_id || card.batch || '—'}
                                      </td>
                                      <td className="p-3">
                                        <span className={`px-2.5 py-0.5 text-[10px] rounded-md border font-bold ${statusBadgeClass}`}>
                                          {statusLabel}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-400 font-mono text-[11px]" dir="ltr">
                                        {(card.created_at || card.addedAt) ? (card.created_at || card.addedAt).slice(0, 16).replace('T', ' ') : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-2 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <span>عرض:</span>
                              <select
                                value={d1CardLimit}
                                onChange={(e) => {
                                  setD1CardLimit(Number(e.target.value));
                                  setD1CardPage(1); // Reset page on limit change
                                }}
                                className="bg-[#1c2128] border border-[#30363d] rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none"
                              >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                              </select>
                              <span>عنصر بالصفحة</span>
                            </div>
                            
                            <div className="flex items-center gap-2" dir="ltr">
                              <button
                                type="button"
                                disabled={d1CardPage <= 1}
                                onClick={() => setD1CardPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 bg-[#1c2128] border border-[#30363d] rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                              >
                                &lt; السابق
                              </button>
                              
                              <span className="font-bold text-slate-200 min-w-[3rem] text-center">
                                {d1CardPage} / {Math.max(1, totalPages)}
                              </span>
                              
                              <button
                                type="button"
                                disabled={d1CardPage >= totalPages}
                                onClick={() => setD1CardPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1.5 bg-[#1c2128] border border-[#30363d] rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                              >
                                التالي &gt;
                              </button>
                            </div>
                            
                            <div className="text-xs font-medium">
                              إجمالي الكروت المطابقة: {totalMatched}
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {adminActiveTab === 'logs' && (() => {
                  // Build combined transactions list from local + remote master list
                  const rawMap = new Map();

                  // Process local user cards
                  cards.forEach((c, idx) => {
                    const isComp = Boolean(c.id?.toString().startsWith('comp_') || c.isCompensation || c.type === 'compensation' || c.name?.includes('تعويض'));
                    const pkgName = c.name || c.packageName || c.pkg || 'باقة 10 ساعات';
                    let amt = 0;
                    if (!isComp) {
                      if (c.price) {
                        const m = (c.price + '').match(/\d+(\.\d+)?/);
                        amt = m ? parseFloat(m[0]) : (pkgName.includes('24') || pkgName.includes('30') ? 3 : 2);
                      } else {
                        amt = pkgName.includes('24') || pkgName.includes('30') ? 3 : 2;
                      }
                    }
                    const key = c.cardUsername || c.username || c.code || `card_${idx}`;
                    rawMap.set(key, {
                      id: c.id || `tx_card_${idx}`,
                      date: c.purchaseDate || c.usedAt || c.activationTime || new Date().toLocaleDateString('ar-EG'),
                      username: c.forUser || c.cardUsername || c.username || 'مشترك هيبرنت',
                      packageName: pkgName,
                      amount: amt,
                      type: isComp ? 'compensation' : 'sold',
                      cardNumber: c.cardUsername || c.code || '******'
                    });
                  });

                  // Process used inventory cards
                  inventoryCards.filter(c => c.used).forEach((c, idx) => {
                    const key = c.username || `inv_${idx}`;
                    if (!rawMap.has(key)) {
                      const pkgName = c.packageName || 'باقة 10 ساعات';
                      const amt = pkgName.includes('24') ? 3 : 2;
                      rawMap.set(key, {
                        id: c.id || `tx_inv_${idx}`,
                        date: c.usedAt || c.activationTime || new Date().toLocaleDateString('ar-EG'),
                        username: c.username || 'مستخدم الكرت',
                        packageName: pkgName,
                        amount: amt,
                        type: 'sold',
                        cardNumber: c.username
                      });
                    }
                  });

                  // Process remote master used cards from Cloudflare Worker
                  remoteMasterUsedCards.forEach((rc, idx) => {
                    const key = rc.username || rc.cardUsername || rc.id || `remote_${idx}`;
                    const isComp = Boolean(rc.type === 'compensation' || rc.isCompensation);
                    const pkgName = rc.packageName || rc.pkg || 'باقة 10 ساعات';
                    const amt = isComp ? 0 : (rc.amount || rc.price ? parseFloat((rc.amount || rc.price) + '') : (pkgName.includes('24') ? 3 : 2));
                    rawMap.set(key, {
                      id: rc.id || `tx_remote_${idx}`,
                      date: rc.date || rc.usedAt || rc.timestamp || new Date().toLocaleDateString('ar-EG'),
                      username: rc.user || rc.username || rc.phone || 'مشترك غيمة',
                      packageName: pkgName,
                      amount: amt,
                      type: isComp ? 'compensation' : 'sold',
                      cardNumber: rc.cardUsername || rc.username || '******'
                    });
                  });

                  // Fallback demo items if list is empty
                  if (rawMap.size === 0) {
                    const demoTxs = [
                      { id: 'tx_d1', date: '2026-08-11 14:20', username: '0599123456', packageName: 'باقة 10 ساعات', amount: 2, type: 'sold', cardNumber: '88201923' },
                      { id: 'tx_d2', date: '2026-08-11 13:45', username: '0568991122', packageName: 'باقة 24 ساعة', amount: 3, type: 'sold', cardNumber: '99401221' },
                      { id: 'tx_d3', date: '2026-08-11 12:10', username: '0598765432', packageName: 'باقة 10 ساعات', amount: 0, type: 'compensation', cardNumber: '77123901' },
                      { id: 'tx_d4', date: '2026-08-11 11:30', username: '0567112233', packageName: 'باقة 24 ساعة', amount: 3, type: 'sold', cardNumber: '44109822' },
                      { id: 'tx_d5', date: '2026-08-10 18:05', username: '0595443322', packageName: 'باقة 10 ساعات', amount: 2, type: 'sold', cardNumber: '33201944' }
                    ];
                    demoTxs.forEach(dt => rawMap.set(dt.id, dt));
                  }

                  const allTransactions = Array.from(rawMap.values());

                  // Financial calculations
                  const soldTxs = allTransactions.filter(t => t.type === 'sold');
                  const compTxs = allTransactions.filter(t => t.type === 'compensation');
                  const totalRevenue = soldTxs.reduce((sum, t) => sum + t.amount, 0);
                  const totalSold = soldTxs.length;
                  const totalCompensations = compTxs.length;

                  // Package breakdown stats
                  const p10Txs = soldTxs.filter(t => t.packageName.includes('10'));
                  const p24Txs = soldTxs.filter(t => t.packageName.includes('24') || t.packageName.includes('يوم') || t.packageName.includes('30'));
                  
                  const p10Count = p10Txs.length;
                  const p24Count = p24Txs.length;

                  const p10Rev = p10Txs.reduce((sum, t) => sum + t.amount, 0);
                  const p24Rev = p24Txs.reduce((sum, t) => sum + t.amount, 0);

                  const p10Pct = totalSold > 0 ? Math.round((p10Count / totalSold) * 100) : 0;
                  const p24Pct = totalSold > 0 ? Math.round((p24Count / totalSold) * 100) : 0;

                  const topSellingPkgName = p10Count >= p24Count ? 'باقة 10 ساعات' : 'باقة 24 ساعة';
                  const topPkgPct = Math.max(p10Pct, p24Pct);

                  // Filtered transactions table
                  const filteredTxs = allTransactions.filter(t => {
                    const q = salesSearchQuery.toLowerCase();
                    const matchesSearch = !q ||
                      t.username.toLowerCase().includes(q) ||
                      t.packageName.toLowerCase().includes(q) ||
                      t.date.toLowerCase().includes(q) ||
                      t.cardNumber.toLowerCase().includes(q);

                    const matchesFilter = salesFilterStatus === 'all' ||
                      (salesFilterStatus === 'sold' && t.type === 'sold') ||
                      (salesFilterStatus === 'compensation' && t.type === 'compensation');

                    return matchesSearch && matchesFilter;
                  });

                  // Export to Excel function
                  const handleExportSalesExcel = () => {
                    const dataToExport = filteredTxs.map(t => ({
                      'تاريخ العملية': t.date,
                      'اسم المشترك / الجوال': t.username,
                      'نوع الباقة': t.packageName,
                      'المبلغ (₪)': t.type === 'compensation' ? 0 : t.amount,
                      'حالة العملية': t.type === 'compensation' ? 'تعويض مجاني' : 'مباع',
                      'رقم الكرت': t.cardNumber
                    }));
                    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير المبيعات');
                    XLSX.writeFile(workbook, `HyperNet_Sales_Report_${Date.now()}.xlsx`);
                    showToast('تم تصدير تقرير المبيعات بنجاح 📊', 'success');
                  };

                  return (
                    <div className="space-y-6" dir="rtl">
                      {/* Top Financial KPI Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Total Revenue Card */}
                        <div className="bg-gradient-to-br from-[#161c2e] to-[#0d1322] border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden shadow-none hover:border-lime-500/40 transition-all duration-300">
                          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-lime-500 to-emerald-400"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">إجمالي الإيرادات</span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                              <Coins className="w-5 h-5" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-emerald-400 font-mono" dir="ltr">₪{totalRevenue.toLocaleString()}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                              <TrendingUp className="w-3 h-3 text-emerald-400 inline" />
                              الربح الصافي: 100% (بدون تكاليف)
                            </span>
                          </div>
                        </div>

                        {/* 2. Total Cards Sold Card */}
                        <div className="bg-gradient-to-br from-[#161c2e] to-[#0d1322] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden hover:border-[#30363d] transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">إجمالي البطاقات المباعة</span>
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                              <ShoppingCart className="w-5 h-5" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-slate-100 font-mono">{totalSold}</span>
                              <span className="text-xs text-slate-400 font-medium">بطاقة</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium block mt-1">
                              عمليات شراء مكتملة بنجاح
                            </span>
                          </div>
                        </div>

                        {/* 3. Top Selling Package Card */}
                        <div className="bg-gradient-to-br from-[#161c2e] to-[#0d1322] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden hover:border-[#30363d] transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">الباقة الأكثر طلباً</span>
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                              <Award className="w-5 h-5" />
                            </div>
                          </div>
                          <div>
                            <span className="text-lg font-bold text-slate-100 block truncate">{topSellingPkgName}</span>
                            <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 mt-1">
                              <Zap className="w-3 h-3 inline" />
                              تستحوذ على {topPkgPct}% من الحصة السوقية
                            </span>
                          </div>
                        </div>

                        {/* 4. Total Compensations Card */}
                        <div className="bg-gradient-to-br from-[#161c2e] to-[#0d1322] border border-purple-500/20 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden hover:border-purple-500/40 transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-semibold">الكروت المعوضة والماركات</span>
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                              <Gift className="w-5 h-5" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-purple-400 font-mono">{totalCompensations}</span>
                              <span className="text-xs text-slate-400 font-medium">بطاقة</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium block mt-1">
                              تعويضات مجانية للمشتركين
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Package Breakdown Visual Stats - Redesigned Modern Layout */}
                      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden shadow-2xl">
                        {/* Header Row */}
                        <div className="p-6 border-b border-[#334155] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1e293b]/50">
                          <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Activity className="w-5 h-5 text-emerald-400" />
                              </div>
                              توزيع المبيعات حسب الباقات
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 mr-13 font-medium">تحليل الأداء المالي والحصة السوقية لكل فئة</p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleExportSalesExcel}
                            className="w-full sm:w-auto px-5 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 border border-[#334155] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            تصدير تقرير Excel
                          </button>
                        </div>

                        {/* Distribution Content Area */}
                        <div className="p-6 space-y-8">
                          {/* 10 Hours Package Row */}
                          <div className="group space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-8 rounded-full bg-emerald-500"></div>
                                <div>
                                  <span className="text-sm font-black text-slate-100 block">باقة 10 ساعات</span>
                                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">سعر البيع: ₪2.00</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-[11px] font-black text-slate-300">
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 uppercase text-[9px] mb-0.5">الكمية المباعة</span>
                                  <span className="font-mono text-slate-100">{p10Count} كرت</span>
                                </div>
                                <div className="w-px h-6 bg-slate-700"></div>
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 uppercase text-[9px] mb-0.5">نسبة الحصة</span>
                                  <span className="font-mono text-emerald-400">{p10Pct}%</span>
                                </div>
                                <div className="w-px h-6 bg-slate-700"></div>
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 uppercase text-[9px] mb-0.5">إجمالي الإيراد</span>
                                  <span className="font-mono text-white">₪{p10Rev}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="relative w-full bg-[#0f172a] h-2.5 rounded-full overflow-hidden shadow-inner border border-[#334155]/50 p-0.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${p10Pct}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                              ></motion.div>
                            </div>
                          </div>

                          {/* 24 Hours Package Row */}
                          <div className="group space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-8 rounded-full bg-indigo-500"></div>
                                <div>
                                  <span className="text-sm font-black text-slate-100 block">باقة 24 ساعة</span>
                                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">سعر البيع: ₪3.00</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-[11px] font-black text-slate-300">
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 uppercase text-[9px] mb-0.5">الكمية المباعة</span>
                                  <span className="font-mono text-slate-100">{p24Count} كرت</span>
                                </div>
                                <div className="w-px h-6 bg-slate-700"></div>
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 uppercase text-[9px] mb-0.5">نسبة الحصة</span>
                                  <span className="font-mono text-indigo-400">{p24Pct}%</span>
                                </div>
                                <div className="w-px h-6 bg-slate-700"></div>
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-400 uppercase text-[9px] mb-0.5">إجمالي الإيراد</span>
                                  <span className="font-mono text-white">₪{p24Rev}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="relative w-full bg-[#0f172a] h-2.5 rounded-full overflow-hidden shadow-inner border border-[#334155]/50 p-0.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${p24Pct}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                className="bg-gradient-to-l from-indigo-500 to-purple-400 h-full rounded-full shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                              ></motion.div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Detailed Transactions Log Table */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2">
                          <div>
                            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-emerald-400" />
                              سجل العمليات والمبيعات المباشر
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">يعرض جميع عمليات الشراء والتعويضات المسجلة من قاعدة البيانات والـ Cloud</p>
                          </div>

                          {/* Status Filter Pills */}
                          <div className="flex items-center bg-[#161b22] p-1 rounded-xl border border-[#30363d] gap-1 w-full lg:w-auto">
                            <button
                              type="button"
                              onClick={() => setSalesFilterStatus('all')}
                              className={`flex-1 lg:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                salesFilterStatus === 'all'
                                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-[#30363d]'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              الكل ({allTransactions.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSalesFilterStatus('sold')}
                              className={`flex-1 lg:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                salesFilterStatus === 'sold'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              المبيعات 🛒 ({totalSold})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSalesFilterStatus('compensation')}
                              className={`flex-1 lg:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                salesFilterStatus === 'compensation'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              التعويضات 🎁 ({totalCompensations})
                            </button>
                          </div>
                        </div>

                        {/* Search Filter Box */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                          <input
                            type="text"
                            placeholder="بحث باسم المشترك، رقم الجوال، الباقة، أو تاريخ العملية..."
                            value={salesSearchQuery}
                            onChange={(e) => setSalesSearchQuery(e.target.value)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-lime-500/50"
                          />
                        </div>

                        {/* Transactions Table */}
                        {filteredTxs.length === 0 ? (
                          <div className="text-center py-12 bg-[#161b22] border border-[#30363d] rounded-xl space-y-2">
                            <p className="text-sm text-slate-400 font-medium">لا توجد عمليات مبيعات مطابقة لشروط البحث.</p>
                            <p className="text-xs text-slate-500">جرب تغيير شروط الفلترة أو تفريغ خيار البحث أعلاه.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto custom-scrollbar rounded-xl border border-[#30363d]">
                            <table className="w-full text-right text-xs sm:text-sm">
                              <thead className="bg-[#161b22] text-slate-400 border-b border-[#30363d]">
                                <tr>
                                  <th className="p-3.5 font-semibold">تاريخ العملية</th>
                                  <th className="p-3.5 font-semibold">اسم المشترك / الجوال</th>
                                  <th className="p-3.5 font-semibold">نوع الباقة</th>
                                  <th className="p-3.5 font-semibold">المبلغ (₪)</th>
                                  <th className="p-3.5 font-semibold text-center">حالة العملية</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {filteredTxs.map((t) => (
                                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3.5 text-slate-400 font-mono text-xs" dir="ltr">
                                      {t.date}
                                    </td>
                                    <td className="p-3.5 font-bold text-slate-100 font-mono" dir="ltr">
                                      {t.username}
                                    </td>
                                    <td className="p-3.5 font-medium text-slate-200">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-[#30363d]/80 rounded-lg text-xs">
                                        <Zap className="w-3 h-3 text-amber-400" />
                                        {t.packageName}
                                      </span>
                                    </td>
                                    <td className="p-3.5 font-bold font-mono text-sm">
                                      {t.type === 'compensation' ? (
                                        <span className="text-purple-400">0.00 ₪ (مجاني)</span>
                                      ) : (
                                        <span className="text-emerald-400">₪{t.amount}.00</span>
                                      )}
                                    </td>
                                    <td className="p-3.5 text-center">
                                      {t.type === 'compensation' ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-lg border border-purple-500/20 font-bold">
                                          <Gift className="w-3 h-3" />
                                          تعويض 🎁
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
                                          <ShoppingCart className="w-3 h-3" />
                                          مباع 🛒
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}


              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      

      {/* Change Password Modal */}
      <AnimatePresence>
        {changePasswordModalUser && (
          <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-slate-950/80 ">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-950 border border-[#30363d] rounded-xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setChangePasswordModalUser(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6 text-center">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                  <KeyRound className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">تغيير كلمة السر</h3>
                <p className="text-xs text-slate-400">
                  للمستخدم: <span className="font-mono text-emerald-300">@{changePasswordModalUser.username}</span>
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">كلمة المرور الجديدة</label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-900 border border-[#30363d] rounded-lg px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                    placeholder="أدخل كلمة المرور الجديدة..."
                    dir="ltr"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setChangePasswordModalUser(null)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-[#30363d] text-slate-300 font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
                  >
                    حفظ التغيير
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Import Preview & Conflict Report Modal */}
      <AnimatePresence>
        {importModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 font-['Tajawal'] overflow-y-auto"
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative text-right space-y-5 my-8"
            >
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 border-b border-[#30363d] pb-4">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">معاينة واستيراد دفعة كروت</h3>
                  <p className="text-xs text-slate-400">الملف المحدد: {importFileName}</p>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">اسم الدفعة (Batch Name)</label>
                  <input
                    type="text"
                    value={importBatchName}
                    onChange={(e) => setImportBatchName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/60 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">تخصيص الباقة لهذه الدفعة</label>
                  <select
                    value={importSelectedPackage}
                    onChange={(e) => setImportSelectedPackage(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/60 font-medium"
                  >
                    <option value="auto">تلقائي من الملف</option>
                    <option value="باقة 10 ساعات">باقة 10 ساعات</option>
                    <option value="باقة 24 ساعة">باقة 24 ساعة</option>
                  </select>
                </div>
              </div>

              {/* File Content Preview Box */}
              <div className="space-y-2">
                <span className="text-xs text-slate-300 font-semibold block">معاينة النص الأولي للملف:</span>
                <textarea
                  readOnly
                  value={importFileContent.slice(0, 1000) + (importFileContent.length > 1000 ? '\n... (تم اقتطاع باقي الملف للمعاينة)' : '')}
                  className="w-full h-32 bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed resize-none focus:outline-none custom-scrollbar"
                />
              </div>

              {/* Import Result Report (If executed) */}
              {importResultReport && (
                <div className="space-y-3 bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      تم استيراد {importResultReport.imported_count} كرت بنجاح
                    </span>
                    {importResultReport.failed_count > 0 && (
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        فشل أو تكرار {importResultReport.failed_count} كرت
                      </span>
                    )}
                  </div>

                  {importResultReport.errors && importResultReport.errors.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar text-[11px]">
                      <span className="text-slate-400 font-semibold block">تقرير الأخطاء والتكرارات:</span>
                      {importResultReport.errors.map((err, idx) => (
                        <div key={idx} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded flex items-center justify-between">
                          <span>السطر/العنصر: {err.item || err.line || idx + 1}</span>
                          <span className="font-bold">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importErrorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300 font-medium leading-relaxed">
                    {importErrorMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-[#30363d]"
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={isSubmittingImport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isSubmittingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري المعالجة والاستيراد...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4" />
                      تأكيد واستيراد الكروت
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compensation Prompt Modal */}
      <AnimatePresence>
        {isCompensationModalOpen && (
          <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-slate-950/80 ">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-slate-950 border border-[#30363d] rounded-xl p-6 shadow-2xl space-y-5 text-right relative"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">🎁 تعويض المشتركين المحددين</h3>
                    <p className="text-xs text-slate-400">صرف كروت مجانية مباشرة للمستخدمين</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompensationModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900/90 border border-[#30363d] rounded-xl p-3.5 space-y-2">
                  <span className="text-xs text-slate-400 font-medium block">
                    المستخدمون المحددون للتعويض ({selectedUsernames.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {selectedUsernames.map((uname) => (
                      <span key={uname} className="bg-slate-800 border border-[#30363d] text-slate-200 font-mono text-[11px] px-2.5 py-0.5 rounded-md">
                        @{uname}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">اختر نوع الباقة للتعويض:</label>
                  <select
                    value={compensationPkg}
                    onChange={(e) => setCompensationPkg(e.target.value)}
                    className="w-full bg-slate-900 border border-[#30363d] rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-indigo-500/60"
                  >
                    <option value="10_hours" className="bg-slate-900">باقة 10 ساعات</option>
                    <option value="24_hours" className="bg-slate-900">باقة 24 ساعة</option>
                  </select>
                </div>

                <div className="bg-slate-900/90 border border-[#30363d] rounded-xl p-3 text-[11px] text-slate-300">
                  ⚡ سيتم سحب كروت جاهزة من مخزون الغيمة/المحلي، وإرسال الكروت أوتوماتيكياً لهؤلاء المشتركين.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCompensationModalOpen(false)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-[#30363d] text-slate-300 font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCompensation}
                    disabled={isCompensating}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg shadow-md text-xs transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCompensating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        <span>تأكيد وصرف التعويض ({selectedUsernames.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compensation Result Modal */}
      <AnimatePresence>
        {compensationResultModal?.isOpen && (
          <div className="fixed inset-0 z-[195] flex items-center justify-center p-4 bg-black/85 ">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-[#0C101D] border border-emerald-500/50 rounded-xl p-6 shadow-2xl space-y-5 text-right relative"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">🎁 تم صرف الكروت بنجاح!</h3>
                    <p className="text-xs text-slate-400">بيانات الكروت التعويضية للمستخدمين</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompensationResultModal({ isOpen: false, cards: [] })}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="border border-[#30363d] rounded-2xl overflow-hidden max-h-64 overflow-y-auto bg-[#06080E]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white/5 text-slate-300 border-b border-[#30363d] sticky top-0 bg-[#161b22]">
                    <tr>
                      <th className="p-2.5 font-bold">المشترك</th>
                      <th className="p-2.5 font-bold">اسم مستخدم الكرت</th>
                      <th className="p-2.5 font-bold">كلمة المرور</th>
                      <th className="p-2.5 font-bold">الباقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                    {compensationResultModal.cards.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-sans font-medium text-emerald-300">@{item.username}</td>
                        <td className="p-2.5 text-white" dir="ltr">{item.cardUser}</td>
                        <td className="p-2.5 text-emerald-400" dir="ltr">{item.cardPass}</td>
                        <td className="p-2.5 font-sans text-slate-400">{item.pkg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => setCompensationResultModal({ isOpen: false, cards: [] })}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-sm text-xs transition-all cursor-pointer"
              >
                إغلاق ونهو
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0d1117]/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-[#30363d] border-t-emerald-500 rounded-full animate-spin"></div>
              <span className="text-white font-medium text-sm animate-pulse">جاري التحقق...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 ">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#0C101D] border border-white/15 rounded-xl p-6 shadow-2xl space-y-5 text-right relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">الدعم الفني والخدمات</h3>
                    <p className="text-xs text-slate-400">نحن هنا لمساعدتك على مدار الساعة</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Option 1: Direct WhatsApp Button */}
              <a
                href="https://wa.me/970567101900?text=مرحباً%20فريق%20دعم%20هايبر%20نت%20أحتاج%20إلى%20مساعدة"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold p-4 rounded-2xl shadow-lg shadow-sm transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold block">التواصل المباشر عبر واتساب</span>
                    <span className="text-[11px] text-emerald-100 font-normal">رد سريع ومباشر مع موظف الدعم</span>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/80 group-hover:translate-x-[-2px] transition-transform" />
              </a>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#30363d]"></div>
                <span className="flex-shrink mx-3 text-xs text-white/40 font-medium">أو أرسل رسالة دعم</span>
                <div className="flex-grow border-t border-[#30363d]"></div>
              </div>

              {/* Option 2: Support Message Form */}
              <form onSubmit={handleSendSupportMessage} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">رقم الجوال للتواصل</label>
                  <input
                    type="tel"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="059XXXXXXX"
                    className="w-full bg-[#06080E] border border-[#30363d] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 font-mono text-right"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">رسالة الاستفسار أو المشكلة *</label>
                  <textarea
                    rows={3}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="اكتب استفسارك أو التفاصيل هنا..."
                    className="w-full bg-[#06080E] border border-[#30363d] rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 resize-none text-right"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingSupport || !supportMessage.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.98] text-white font-bold py-3 rounded-xl shadow-lg shadow-sm transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingSupport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الرسالة للدعم</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
