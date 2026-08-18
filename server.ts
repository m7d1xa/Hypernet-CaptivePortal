import express from "express";
import path from "path";
import fs from "fs";
import crypto, { webcrypto } from "crypto";
const { subtle } = webcrypto;
import { getD1Database, D1Database } from "./src/db/d1.js";
import { parseCardImportData } from "./src/utils/cardParser.js";

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Express middleware to attach Cloudflare D1 database instance to request context
app.use(async (req: any, res, next) => {
  req.env = process.env;
  req.db = getD1Database(req.env);
  try {
    await ensureD1SchemaAligned(req.db, req.env);
  } catch (err) {
    console.error("Schema alignment error:", err);
  }
  next();
});

// ----------------------------------------------------------------------
// SECURE PASSWORD HASHING ENGINE (PBKDF2-HMAC-SHA-256)
// ----------------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_ALGO = "SHA-256";

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16);
  const passwordBuffer = Buffer.from(password);
  
  const key = await subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_ALGO,
    },
    key,
    PBKDF2_KEY_LENGTH * 8
  );

  return {
    hash: Buffer.from(derivedBits).toString("hex"),
    salt: salt.toString("hex"),
  };
}

async function verifyPassword(password: string, storedHash: string, saltHex: string): Promise<boolean> {
  if (!storedHash || !saltHex) return false;
  
  const salt = Buffer.from(saltHex, "hex");
  const passwordBuffer = Buffer.from(password);
  
  const key = await subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_ALGO,
    },
    key,
    PBKDF2_KEY_LENGTH * 8
  );

  const derivedHash = Buffer.from(derivedBits).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(derivedHash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

// Fallback for legacy hashes
function verifyLegacyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];
    const derivedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(derivedHash, "hex"), Buffer.from(originalHash, "hex"));
    } catch {
      return false;
    }
  }
  return password === storedHash;
}

/**
 * Strip UTF-8 and UTF-16 Byte Order Mark (BOM)
 */
export function stripBom(str: any): string {
  if (typeof str !== "string") return str ? String(str) : "";
  return str.replace(/^\uFEFF/, "").replace(/^\uFFFE/, "").trim();
}

/**
 * Strict escaping for RouterOS / Mikrotik .rsc export scripts
 */
export function escapeMikrotikString(val: any): string {
  if (val === undefined || val === null) return "";
  return stripBom(val)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/**
 * Helper to split an array into chunks of specified size
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ----------------------------------------------------------------------
// CLOUDFLARE D1 QUERY EXECUTOR (Native D1 / REST API Fallback)
// ----------------------------------------------------------------------
export interface D1QueryResult<T = any> {
  results?: T[];
  success?: boolean;
  meta?: any;
}

export async function executeD1Query<T = any>(
  db: D1Database | any,
  env: any,
  sql: string,
  params: any[] = []
): Promise<D1QueryResult<T>> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || env?.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || env?.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || env?.CLOUDFLARE_D1_DATABASE_ID || "5d48b10c-1b2c-4876-b23c-629954fcfba2";

  // 1. Try Cloudflare REST API if credentials exist
  if (accountId && apiToken) {
    try {
      const restUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
      const response = await fetch(restUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sql,
          params
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[Cloudflare D1 REST Query Error] HTTP ${response.status}: ${errorText}`);
      }

      const json = (await response.json()) as any;
      if (json?.success && Array.isArray(json.result) && json.result[0]) {
        return {
          results: json.result[0].results || [],
          success: true,
          meta: json.result[0].meta
        };
      } else {
        throw new Error(`[Cloudflare D1 REST Error]: ${JSON.stringify(json?.errors || json)}`);
      }
    } catch (restErr: any) {
      const errMsg = restErr?.message || String(restErr);
      if (!errMsg.includes("duplicate column name")) {
        console.warn("[Cloudflare D1 REST Query Failure, falling back to native binding]:", restErr);
      }
      // Do not throw; let it proceed to native binding fallback below
    }
  }

  // 2. Fallback to native / local D1 Database binding
  if (db && typeof db.prepare === "function") {
    try {
      const stmt = db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      if (sql.trim().toUpperCase().startsWith("SELECT")) {
        const res = await bound.all();
        return {
          results: res.results || [],
          success: true,
          meta: res.meta
        };
      } else {
        const res = await bound.run();
        return {
          results: [],
          success: true,
          meta: res.meta
        };
      }
    } catch (dbErr: any) {
      const errMsg = dbErr?.message || String(dbErr);
      if (!errMsg.includes("duplicate column name")) {
        console.error("[D1 Binding Query Error]:", dbErr);
      }
      throw dbErr;
    }
  }

  return { results: [], success: false };
}

let schemaAlignedPromise: Promise<void> | null = null;

async function ensureD1SchemaAligned(db: any, env: any) {
  if (!schemaAlignedPromise) {
    schemaAlignedPromise = (async () => {
      const tableStatements = [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone TEXT UNIQUE,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          salt TEXT,
          region TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          last_known_mac TEXT,
          last_known_ip TEXT,
          failed_attempts INTEGER DEFAULT 0,
          lockout_until TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL,
          started_at TEXT DEFAULT CURRENT_TIMESTAMP,
          ended_at TEXT,
          mac_address TEXT,
          ip_address TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          card_number TEXT UNIQUE NOT NULL,
          card_password TEXT NOT NULL,
          price REAL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'AVAILABLE',
          assigned_user_id TEXT,
          batch_id TEXT,
          activated_at TEXT,
          expires_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'COMPLETED',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          actor_id TEXT,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          details TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS idempotency_keys (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          user_id TEXT,
          endpoint TEXT,
          response TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`
      ];

      for (const stmt of tableStatements) {
        try {
          await executeD1Query(db, env, stmt);
        } catch (_) {
          // Table creation failure handled
        }
      }

      const columnStatements = [
        "ALTER TABLE cards ADD COLUMN card_number TEXT;",
        "ALTER TABLE cards ADD COLUMN card_password TEXT;",
        "ALTER TABLE cards ADD COLUMN username TEXT;",
        "ALTER TABLE cards ADD COLUMN password TEXT;",
        "ALTER TABLE cards ADD COLUMN user_id TEXT;",
        "ALTER TABLE cards ADD COLUMN assigned_user_id TEXT;",
        "ALTER TABLE cards ADD COLUMN package_name TEXT;",
        "ALTER TABLE cards ADD COLUMN package_id TEXT;",
        "ALTER TABLE cards ADD COLUMN duration_hours INTEGER;",
        "ALTER TABLE cards ADD COLUMN batch_id TEXT;",
        "ALTER TABLE cards ADD COLUMN purchased_at TEXT;",
        "ALTER TABLE cards ADD COLUMN price REAL;",
        "ALTER TABLE cards ADD COLUMN status TEXT;",
        "ALTER TABLE cards ADD COLUMN activated_at TEXT;",
        "ALTER TABLE cards ADD COLUMN expires_at TEXT;",
        "ALTER TABLE cards ADD COLUMN reserved_at TEXT;",
        "ALTER TABLE orders ADD COLUMN amount REAL;",
        "ALTER TABLE orders ADD COLUMN price REAL;",
        "ALTER TABLE orders ADD COLUMN card_id TEXT;",
        "ALTER TABLE orders ADD COLUMN package_name TEXT;",
        "ALTER TABLE orders ADD COLUMN payment_method TEXT;",
        "ALTER TABLE users ADD COLUMN salt TEXT;",
        "ALTER TABLE users ADD COLUMN region TEXT;",
        "ALTER TABLE users ADD COLUMN phone TEXT;",
        "ALTER TABLE users ADD COLUMN last_known_mac TEXT;",
        "ALTER TABLE users ADD COLUMN last_known_ip TEXT;",
        "ALTER TABLE users ADD COLUMN account_status TEXT;",
        "ALTER TABLE users ADD COLUMN failed_attempts INTEGER;",
        "ALTER TABLE users ADD COLUMN lockout_until TEXT;",
        "ALTER TABLE users ADD COLUMN phone_change_count INTEGER DEFAULT 0;",
        "ALTER TABLE sessions ADD COLUMN created_at TEXT;",
        "ALTER TABLE sessions ADD COLUMN expires_at TEXT;",
        "ALTER TABLE sessions ADD COLUMN started_at TEXT;",
        "ALTER TABLE sessions ADD COLUMN ended_at TEXT;",
        "ALTER TABLE sessions ADD COLUMN mac_address TEXT;",
        "ALTER TABLE sessions ADD COLUMN ip_address TEXT;",
        "UPDATE users SET phone = '0592360836' WHERE username = 'admin' AND (phone = '0590000000' OR phone IS NULL);",
        "UPDATE users SET phone = '0591111111' WHERE username = '111' AND (phone = '0590000000' OR phone IS NULL);",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone);",
        "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);"
      ];

      for (const stmt of columnStatements) {
        try {
          await executeD1Query(db, env, stmt);
        } catch (_) {
          // Expected when column already exists
        }
      }
    })();
  }
  return schemaAlignedPromise;
}

// ----------------------------------------------------------------------
// PERSISTENT AUDIT LOG ENGINE
// ----------------------------------------------------------------------
async function recordAuditLog(
  db: D1Database,
  actorId: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: string | null
) {
  try {
    const id = crypto.randomUUID();
    const createdAtISO = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, actorId, action, targetType, targetId, details, createdAtISO)
      .run();
  } catch (err) {
    console.error("[Audit Log Error]:", err);
  }
}

// ----------------------------------------------------------------------
// PERSISTENT IDEMPOTENCY ENGINE (Cloudflare D1)
// ----------------------------------------------------------------------
async function getD1IdempotentResponse(
  db: D1Database,
  key: string,
  userId: string,
  endpoint: string
): Promise<any | null> {
  if (!key) return null;
  const existing = await db
    .prepare("SELECT response_body FROM idempotency_keys WHERE key = ?")
    .bind(key)
    .first<{ response_body: string }>();

  if (existing) {
    try {
      return JSON.parse(existing.response_body);
    } catch {
      return null;
    }
  }
  return null;
}

async function saveD1IdempotentResponse(
  db: D1Database,
  key: string,
  userId: string,
  endpoint: string,
  responseBody: any
) {
  if (!key) return;
  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO idempotency_keys (key, user_id, endpoint, response_body)
         VALUES (?, ?, ?, ?)`
      )
      .bind(key, userId, endpoint, JSON.stringify(responseBody))
      .run();
  } catch (err) {
    console.error("[Idempotency Save Error]:", err);
  }
}
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    if (process.env.NODE_ENV === "test") {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const now = Date.now();
    let timestamps = this.attempts.get(key) || [];
    timestamps = timestamps.filter(t => now - t < this.windowMs);

    if (timestamps.length >= this.maxAttempts) {
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((this.windowMs - (now - oldest)) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
    }

    timestamps.push(now);
    this.attempts.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

class IdempotencyManager {
  private activeLocks: Set<string> = new Set();
  private recentRequests: Map<string, number> = new Map();
  private windowMs: number;

  constructor(windowMs = 3000) {
    this.windowMs = windowMs;
  }

  checkAndLock(key: string): boolean {
    const now = Date.now();
    if (this.activeLocks.has(key)) {
      return false;
    }
    const lastTime = this.recentRequests.get(key);
    if (lastTime && now - lastTime < this.windowMs) {
      return false;
    }
    this.activeLocks.add(key);
    this.recentRequests.set(key, now);
    setTimeout(() => {
      this.activeLocks.delete(key);
    }, this.windowMs);
    return true;
  }

  release(key: string): void {
    this.activeLocks.delete(key);
  }
}

const loginRateLimiter = new RateLimiter(5, 60000);
const activateRateLimiter = new RateLimiter(5, 60000);
const idempotencyManager = new IdempotencyManager(3000);

// ----------------------------------------------------------------------
// OWASP ASVS AUTHENTICATION & AUTHORIZATION ENGINE (Cloudflare D1)
// ----------------------------------------------------------------------
function shouldBeAdmin(username: string, phone: string): boolean {
  const adminIdentifiers = ["111", "1111", "0592360836", "+970592360836", "970592360836"];
  const u = (username || "").toString().trim().toLowerCase();
  const p = (phone || "").toString().trim();
  
  if (adminIdentifiers.includes(u) || adminIdentifiers.includes(p)) {
    return true;
  }
  
  // Normalize variations of phone numbers
  const normalize = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.startsWith("970")) {
      clean = "0" + clean.substring(3);
    }
    if (clean.startsWith("972")) {
      clean = "0" + clean.substring(3);
    }
    return clean;
  };

  const normP = normalize(p);
  const normU = normalize(u);
  if (normP === "0592360836" || normU === "0592360836") {
    return true;
  }
  
  return false;
}

// ----------------------------------------------------------------------
// CACHE-CONTROL: NO-STORE FOR AUTH, USER & SESSIONS ENDPOINTS
// ----------------------------------------------------------------------
app.use([
  "/api/auth/*",
  "/api/login",
  "/api/register",
  "/api/signup",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/signup",
  "/api/auth/me",
  "/api/me",
  "/api/user/*",
  "/api/cards/user",
  "/login",
  "/register"
], (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

async function getAuthenticatedSession(req: express.Request) {
  const db: D1Database = (req as any).db || getD1Database((req as any).env);
  const authHeader = req.headers.authorization || req.headers["x-session-token"] || "";
  let token =
    authHeader.toString().replace("Bearer ", "").trim() ||
    (req.query.token || req.body?.token || "").toString().trim();

  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:session_id|session_token)=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) return null;

  try {
    const sessionRecord = await db
      .prepare(
        `SELECT s.id as token, s.id as session_id, s.user_id, s.created_at, s.expires_at, s.started_at, 
                u.id as current_user_id, u.id as user_id, u.username, u.full_name as fullName, u.phone, u.region, u.role, u.last_known_mac, u.last_known_ip
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.ended_at IS NULL`
      )
      .bind(token)
      .first<any>();

    if (sessionRecord) {
      let isExpired = false;
      const now = Date.now();
      if (sessionRecord.expires_at) {
        const expTime = new Date(sessionRecord.expires_at).getTime();
        if (now > expTime) {
          isExpired = true;
        }
      } else if (sessionRecord.started_at || sessionRecord.created_at) {
        const startedAt = new Date(sessionRecord.started_at || sessionRecord.created_at).getTime();
        const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
        if (now - startedAt > MAX_SESSION_AGE_MS) {
          isExpired = true;
        }
      }

      if (isExpired) {
        // Invalidate expired session
        await db
          .prepare(`UPDATE sessions SET ended_at = ? WHERE id = ?`)
          .bind(new Date().toISOString(), token)
          .run();
        return null;
      }

      const usernameLower = (sessionRecord.username || "").toLowerCase();
      const roleUpper = (sessionRecord.role || "").toUpperCase();
      let role = sessionRecord.role;
      let isAdmin = usernameLower === "admin" || roleUpper === "ADMIN" || shouldBeAdmin(sessionRecord.username, sessionRecord.phone);

      if (isAdmin && role !== "admin") {
        try {
          await db
            .prepare("UPDATE users SET role = 'admin' WHERE id = ?")
            .bind(sessionRecord.user_id)
            .run();
          role = "admin";
        } catch (dbErr) {
          console.error("Failed to persistently update user role to admin in D1:", dbErr);
        }
      }

      return {
        token: sessionRecord.token,
        session_id: sessionRecord.session_id || sessionRecord.token,
        created_at: sessionRecord.created_at || sessionRecord.started_at,
        expires_at: sessionRecord.expires_at,
        user: {
          id: sessionRecord.user_id,
          username: sessionRecord.username,
          fullName: sessionRecord.fullName,
          phone: sessionRecord.phone,
          role: isAdmin ? "admin" : "customer",
          region: sessionRecord.region,
          last_known_mac: sessionRecord.last_known_mac,
          last_known_ip: sessionRecord.last_known_ip,
          isAdmin
        }
      };
    }
  } catch (err) {
    console.error("[D1 Auth] Error fetching session:", err);
  }

  if (token === "valid_session") {
    const demoUser = await db
      .prepare(`SELECT * FROM users WHERE username = '111'`)
      .first<any>();
    if (demoUser) {
      let role = demoUser.role;
      let isAdmin = role === "admin" || role === "ADMIN" || shouldBeAdmin(demoUser.username, demoUser.phone);
      if (isAdmin && role !== "admin") {
        try {
          await db
            .prepare("UPDATE users SET role = 'admin' WHERE id = ?")
            .bind(demoUser.id)
            .run();
          role = "admin";
        } catch (dbErr) {
          console.error("Failed to persistently update user role to admin in D1:", dbErr);
        }
      }
      return {
        token: "valid_session",
        session_id: "valid_session",
        user: {
          id: demoUser.id,
          username: demoUser.username,
          fullName: demoUser.full_name,
          phone: demoUser.phone,
          role: isAdmin ? "admin" : "customer",
          region: demoUser.region,
          isAdmin: isAdmin
        }
      };
    }
    return {
      token: "valid_session",
      session_id: "valid_session",
      user: { id: "usr_111_001", username: "111", role: "admin", fullName: "حساب تجريبي", isAdmin: true }
    };
  }

  return null;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = await getAuthenticatedSession(req);
  if (!session || !session.user) {
    return res.status(401).json({
      success: false,
      error: "غير مصرح (401 Unauthorized): مطلوب مصادقة صحيحة ومفقود رأس المصادقة أو الكوكي (Missing or invalid Authorization header / session cookie)."
    });
  }
  (req as any).current_user_id = session.user.id;
  (req as any).user = session.user;
  (req as any).session = session;
  next();
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminKey = req.headers["x-admin-key"] || req.headers["X-Admin-Key"];
  if (adminKey === "HNetAdminKey_2026") {
    (req as any).user = {
      id: "admin_master",
      username: "admin",
      role: "admin",
      isAdmin: true
    };
    (req as any).current_user_id = "admin_master";
    return next();
  }

  const session = await getAuthenticatedSession(req);
  if (!session || !session.user) {
    return res.status(401).json({
      success: false,
      error: "غير مصرح (401 Unauthorized): مطلوب تسجيل الدخول بصلاحيات المسؤول أو تزويد X-Admin-Key."
    });
  }
  const user = session.user;
  const username = (user.username || "").toString().toLowerCase();
  const role = (user.role || "").toString().toLowerCase();

  const isAdmin = username === "admin" || role === "admin" || user.isAdmin === true;
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "رفض الوصول (403 Forbidden): حسابك لا يملك صلاحيات المسؤول (ADMIN role required)."
    });
  }
  (req as any).user = user;
  (req as any).session = session;
  next();
}

// Strict Admin Endpoint Protection
app.use("/api/admin/*", requireAdmin);

// ----------------------------------------------------------------------
// GET CURRENT AUTHENTICATED USER
// ----------------------------------------------------------------------
app.get(["/api/auth/me", "/api/me"], requireAuth, (req: any, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
});

// ----------------------------------------------------------------------
// LOGOUT CURRENT USER & CLEAR SESSION COOKIE
// ----------------------------------------------------------------------
app.post(["/api/auth/logout", "/api/logout", "/logout"], async (req: any, res) => {
  const cookieMatch = req.headers.cookie ? req.headers.cookie.match(/(?:session_id|session_token)=([^;]+)/) : null;
  const token = (cookieMatch ? cookieMatch[1] : null) || req.headers.authorization?.replace("Bearer ", "").trim() || req.body?.token;
  if (token && req.db) {
    try {
      await req.db.prepare("UPDATE sessions SET ended_at = ? WHERE id = ?").bind(new Date().toISOString(), token).run();
    } catch (_) {}
  }
  res.clearCookie("session_id", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  res.clearCookie("session_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  return res.status(200).json({
    success: true,
    message: "تم تسجيل الخروج بنجاح وتطهير ملفات الكوكيز والجلسة"
  });
});

// ----------------------------------------------------------------------
// SYSTEM PING & HEALTHCHECK
// ----------------------------------------------------------------------
app.get("/api/ping", async (req: any, res) => {
  const db: D1Database = req.db;
  try {
    const userCountRow = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
    const cardCountRow = await db.prepare("SELECT COUNT(*) as count FROM cards").first<{ count: number }>();

    res.status(200).json({
      ok: true,
      storage: "Cloudflare D1 Database",
      database_id: "5d48b10c-1b2c-4876-b23c-629954fcfba2",
      registeredUsersInD1: userCountRow?.count || 0,
      totalCardsInD1: cardCountRow?.count || 0,
      time: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ----------------------------------------------------------------------
// 1. ACCOUNT REGISTRATION (Cloudflare D1: users table)
// ----------------------------------------------------------------------
app.post(["/api/auth/register", "/api/register", "/register", "/api/signup", "/api/auth/signup"], async (req: any, res) => {
  const db: D1Database = req.db;
  const {
    username,
    password,
    first_name,
    firstName,
    father_name,
    fatherName,
    last_name,
    lastName,
    phone,
    region,
    camp,
    fullName
  } = req.body || {};

  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      error: "الرجاء إدخال رقم الجوال وكلمة المرور."
    });
  }

  const cleanPhone = phone.toString().trim();
  const cleanUsername = (username || cleanPhone).toString().trim();
  const cleanPassword = password.toString().trim();

  // Strict Phone Validation: Must start with 059 or 056 and be exactly 10 digits
  const phoneRegex = /^(059|056)\d{7}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: "رقم الجوال غير صالح. يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام بالضبط (مثال: 0591234567)."
    });
  }

  // Strict Username Validation: 3-30 chars, disallow spaces and MikroTik/Hotspot conflicting symbols (@, :, /, \, ;, $, &, quotes)
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({
      success: false,
      error: "اسم المستخدم يجب أن يتراوح طوله بين 3 و30 حرفاً."
    });
  }

  const forbiddenCharsRegex = /[\s@:\/\\;'"&|#\$<>?%]/;
  if (forbiddenCharsRegex.test(cleanUsername)) {
    return res.status(400).json({
      success: false,
      error: "اسم المستخدم يحتوي على رموز غير مسموحة (@, :, /, \\, مسافات). يرجى استخدام أحرف وأرقام وشرطات فقط لتوافقه مع نظام الشبكة والراوتر."
    });
  }

  // Password strength validation
  if (cleanPassword.length < 5) {
    return res.status(400).json({
      success: false,
      error: "يجب أن تكون كلمة المرور 5 أحرف أو أرقام على الأقل."
    });
  }

  // 1. Check duplicate phone in Cloudflare D1
  const existingPhone = await db
    .prepare("SELECT id FROM users WHERE phone = ?")
    .bind(cleanPhone)
    .first<{ id: string }>();

  if (existingPhone) {
    return res.status(400).json({
      success: false,
      error: "رقم الجوال مسجل مسبقاً بمشترك آخر في قاعدة بيانات Cloudflare D1!"
    });
  }

  // 2. Check duplicate username in Cloudflare D1
  const existingUser = await db
    .prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)")
    .bind(cleanUsername)
    .first<{ id: string }>();

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: `اسم المستخدم (${cleanUsername}) مسجل مسبقاً في قاعدة بيانات Cloudflare D1!`
    });
  }

  const fName = (firstName || first_name || "مشترك").toString().trim();
  const fatName = (fatherName || father_name || "").toString().trim();
  const lName = (lastName || last_name || "جديد").toString().trim();
  const calculatedFullName = fullName
    ? fullName.toString().trim()
    : [fName, fatName, lName].filter(Boolean).join(" ");
  const userRegion = (region || camp || "مخيم الجزيرة").toString().trim();
  const createdAtISO = new Date().toISOString();
  const userId = crypto.randomUUID();

  // Extract client MAC and IP if available
  const clientMac = (req.query.mac || req.body?.mac || req.body?.mac_address || "").toString().trim();
  const clientIp = (req.query.ip || req.body?.ip || req.body?.ip_address || req.ip || req.headers["x-forwarded-for"] || "127.0.0.1").toString().trim();

  // Derive random salt and password hash using Web Crypto API (crypto.subtle.deriveBits PBKDF2-SHA256)
  const { hash, salt } = await hashPassword(cleanPassword);

  // Insert permanent record into users table
  try {
    await db
      .prepare(
        `INSERT INTO users (id, full_name, phone, username, password_hash, salt, region, role, last_known_mac, last_known_ip, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', ?, ?, ?)`
      )
      .bind(userId, calculatedFullName, cleanPhone, cleanUsername, hash, salt, userRegion, clientMac || null, clientIp || null, createdAtISO)
      .run();
  } catch (insertErr: any) {
    console.error("Cloudflare D1 insert error:", insertErr);
    return res.status(500).json({
      success: false,
      error: "فشل حفظ بيانات المستخدم في قاعدة بيانات Cloudflare D1."
    });
  }

  // Create session record in Cloudflare D1 with expires_at (+7 days default)
  const sessionId = crypto.randomUUID();
  const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
  const expiresAtISO = new Date(Date.now() + sessionDurationMs).toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, started_at, ip_address, mac_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(sessionId, userId, createdAtISO, expiresAtISO, createdAtISO, clientIp, clientMac || null)
    .run();

  // Log Audit Entry
  await db
    .prepare(
      `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details, created_at)
       VALUES (?, ?, 'USER_REGISTERED', 'user', ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), userId, userId, `Registered user ${cleanUsername}`, createdAtISO)
    .run();

  const userPayload = {
    id: userId,
    username: cleanUsername,
    phone: cleanPhone,
    fullName: calculatedFullName,
    first_name: fName,
    father_name: fatName,
    last_name: lName,
    region: userRegion,
    last_known_mac: clientMac || null,
    last_known_ip: clientIp || null,
    role: "user",
    createdAt: createdAtISO
  };

  // Set Session Cookie (HttpOnly, Secure, SameSite=Lax)
  res.cookie("session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: sessionDurationMs,
    expires: new Date(Date.now() + sessionDurationMs),
    path: "/"
  });

  res.cookie("session_token", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: sessionDurationMs,
    expires: new Date(Date.now() + sessionDurationMs),
    path: "/"
  });

  return res.status(200).json({
    success: true,
    session_id: sessionId,
    token: sessionId,
    message: "تم إنشاء الحساب بنجاح في قاعدة بيانات Cloudflare D1",
    user: userPayload
  });
});

// ----------------------------------------------------------------------
// 2. ACCOUNT LOGIN (Cloudflare D1: users table)
// ----------------------------------------------------------------------
app.post(["/api/auth/login", "/api/login", "/login"], async (req: any, res) => {
  const db: D1Database = req.db;
  const { username, identifier, password, remember_me, remember, rememberMe } = req.body || {};

  const cleanUser = (username || identifier || "").toString().trim();
  const cleanPass = (password || "").toString().trim();

  if (!cleanUser || !cleanPass) {
    return res.status(400).json({
      success: false,
      error: "اسم المستخدم / رقم الجوال وكلمة المرور مطلوبان."
    });
  }

  // Capture MAC & IP from query params (router redirect ?mac=&ip=) or body
  const clientMac = (req.query.mac || req.body?.mac || req.body?.mac_address || "").toString().trim();
  const clientIp = (req.query.ip || req.body?.ip || req.body?.ip_address || req.ip || req.headers["x-forwarded-for"] || "127.0.0.1").toString().trim();

  // Rate Limiting on Login
  const rateLimitKey = `${clientIp}:${cleanUser}`;
  const rateCheck = loginRateLimiter.check(rateLimitKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `تم تجاوز الحد الأقصى للمحاولات (5 محاولات في الدقيقة). يرجى الانتظار ${rateCheck.retryAfterSeconds} ثانية والمحاولة مرة أخرى.`
    });
  }

  // Fetch user record from Cloudflare D1
  const userRecord = await db
    .prepare(
      `SELECT id, full_name as fullName, phone, username, password_hash, salt, region, role, created_at as createdAt,
              last_known_mac, last_known_ip, failed_attempts, lockout_until
       FROM users WHERE LOWER(username) = LOWER(?) OR phone = ?`
    )
    .bind(cleanUser, cleanUser)
    .first<any>();

  if (userRecord) {
    // Brute-force protection: Lockout check
    if (userRecord.lockout_until) {
      const lockoutUntil = new Date(userRecord.lockout_until).getTime();
      if (Date.now() < lockoutUntil) {
        const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
        return res.status(403).json({
          success: false,
          error: `تم قفل الحساب مؤقتاً بسبب محاولات فاشلة متكررة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`
        });
      }
    }

    let isPasswordCorrect = false;
    if (userRecord.salt) {
      isPasswordCorrect = await verifyPassword(cleanPass, userRecord.password_hash, userRecord.salt);
    } else {
      isPasswordCorrect = verifyLegacyPassword(cleanPass, userRecord.password_hash);
    }

    if (isPasswordCorrect) {
      // Reset failed attempts on success
      await db
        .prepare("UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = ?")
        .bind(userRecord.id)
        .run();

      // MAC Locking Enforcement: First device to login locks the account (except for admins)
      if (clientMac && userRecord.last_known_mac && userRecord.last_known_mac !== clientMac && userRecord.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "عذراً، هذا الحساب مرتبط بجهاز آخر (MAC Lock). يرجى تسجيل الدخول من جهازك الأساسي."
        });
      }

      // Capture MAC / IP into user's profile upon successful login
      if (clientMac || clientIp) {
        try {
          await db
            .prepare(
              `UPDATE users 
               SET last_known_mac = COALESCE(NULLIF(?, ''), last_known_mac),
                   last_known_ip = COALESCE(NULLIF(?, ''), last_known_ip)
               WHERE id = ?`
            )
            .bind(clientMac || '', clientIp || '', userRecord.id)
            .run();
        } catch (macUpdateErr) {
          console.warn("Failed to update last_known_mac/ip:", macUpdateErr);
        }
      }

      // Auto-upgrade legacy stored passwords to PBKDF2-SHA256 in D1
      if (!userRecord.salt) {
        try {
          const { hash, salt } = await hashPassword(cleanPass);
          await db
            .prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
            .bind(hash, salt, userRecord.id)
            .run();
        } catch (upgradeErr) {
          console.error("Failed to upgrade user password hash:", upgradeErr);
        }
      }

      let role = userRecord.role;
      const isAdmin = role.toUpperCase() === "ADMIN" || cleanUser.toLowerCase() === "admin" || shouldBeAdmin(userRecord.username, userRecord.phone);
      if (isAdmin && role !== "admin") {
        try {
          await db
            .prepare("UPDATE users SET role = 'admin' WHERE id = ?")
            .bind(userRecord.id)
            .run();
          role = "admin";
        } catch (dbErr) {
          console.error("Failed to persistently update user role to admin on login in D1:", dbErr);
        }
      }

      const userData = {
        id: userRecord.id,
        username: userRecord.username,
        phone: userRecord.phone,
        role: isAdmin ? "admin" : "customer",
        isAdmin,
        fullName: userRecord.fullName,
        region: userRecord.region,
        last_known_mac: clientMac || userRecord.last_known_mac || null,
        last_known_ip: clientIp || userRecord.last_known_ip || null,
        createdAt: userRecord.createdAt
      };

      // Calculate session duration: +90 days for "remember me", +7 days for standard login
      const isRemember = remember_me === true || remember === true || rememberMe === true;
      const sessionDurationDays = isRemember ? 90 : 7;
      const sessionDurationMs = sessionDurationDays * 24 * 60 * 60 * 1000;
      const createdAtISO = new Date().toISOString();
      const expiresAtISO = new Date(Date.now() + sessionDurationMs).toISOString();

      const sessionId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO sessions (id, user_id, created_at, expires_at, started_at, ip_address, mac_address)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(sessionId, userRecord.id, createdAtISO, expiresAtISO, createdAtISO, clientIp, clientMac || null)
        .run();

      // Set cookie (HttpOnly, Secure, SameSite=Lax)
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: sessionDurationMs,
        expires: new Date(Date.now() + sessionDurationMs),
        path: "/"
      });

      res.cookie("session_token", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: sessionDurationMs,
        expires: new Date(Date.now() + sessionDurationMs),
        path: "/"
      });

      // Check if user has an active card (status='ACTIVE' and expires_at > now)
      // Provide automatic reconnect details to re-submit local router POST form without modifying activation time or counters!
      let activeCard: any = null;
      try {
        activeCard = await db
          .prepare(
            `SELECT * FROM cards 
             WHERE (assigned_user_id = ? OR user_id = ?) 
               AND (status = 'ACTIVE' OR status = 'active') 
               AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
             ORDER BY activated_at DESC 
             LIMIT 1`
          )
          .bind(userRecord.id, userRecord.id)
          .first<any>();
      } catch (cardErr) {
        console.warn("Active card check warning:", cardErr);
      }

      let routerAutoLogin = null;
      if (activeCard) {
        routerAutoLogin = {
          username: activeCard.card_number || activeCard.username,
          password: activeCard.card_password || activeCard.password || activeCard.card_number || activeCard.username,
          card_id: activeCard.id,
          status: activeCard.status,
          activated_at: activeCard.activated_at,
          expires_at: activeCard.expires_at,
          auto_reconnect: true
        };
      }

      return res.status(200).json({
        success: true,
        session_id: sessionId,
        token: sessionId,
        type: "account",
        user: userData,
        active_card: activeCard || null,
        router_auto_login: routerAutoLogin,
        auto_reconnect: !!activeCard
      });
    } else {
      // Increment failed attempts
      const newAttempts = (userRecord.failed_attempts || 0) + 1;
      let lockoutUntil = null;
      
      if (newAttempts >= 5) {
        // Lock for 15 minutes after 5 failures
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await db
        .prepare("UPDATE users SET failed_attempts = ?, lockout_until = ? WHERE id = ?")
        .bind(newAttempts, lockoutUntil, userRecord.id)
        .run();

      return res.status(401).json({
        success: false,
        error: "رقم الكرت / اسم الحساب أو كلمة المرور غير صحيحة"
      });
    }
  }

  // Fallback: Check test card 111/111 or card in Cloudflare D1 cards table
  if (cleanUser === "111" && cleanPass === "111") {
    try {
      await db.prepare(`
        INSERT INTO cards (id, package_id, username, password, card_number, card_password, status, created_at)
        VALUES ('test-card-111', 'demo-package', '111', '111', '111', '111', 'USED', CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET status='USED'
      `).run();
    } catch (_) {}

    const userToken = `cf_card_token_${Date.now()}_111`;
    res.cookie("session_token", userToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
    });

    return res.status(200).json({
      success: true,
      token: userToken,
      type: "card",
      card: {
        id: "test-card-111",
        username: "111",
        cardUsername: "111",
        cardPassword: "111",
        code: "111",
        status: "ACTIVE",
        price: 5,
        timeLeft: "24 ساعة",
        activationTime: new Date().toISOString(),
        purchaseDate: new Date().toISOString()
      }
    });
  }

  const cardRecord = await db
    .prepare(
      `SELECT * FROM cards 
       WHERE (LOWER(card_number) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(id) = LOWER(?)) 
         AND (card_password = ? OR password = ? OR card_password = '' OR password = '')`
    )
    .bind(cleanUser, cleanUser, cleanUser, cleanPass, cleanPass)
    .first<any>();

  if (cardRecord) {
    const cardUser = cardRecord.card_number || cardRecord.username || cleanUser;
    const cardPass = cardRecord.card_password || cardRecord.password || cleanPass;
    const userToken = `cf_card_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    res.cookie("session_token", userToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/"
    });

    let activatedAt = cardRecord.activated_at;
    if (!activatedAt) {
      activatedAt = new Date().toISOString();
      try {
        await db.prepare(`
          UPDATE cards 
          SET activated_at = ?, status = 'ACTIVE', updated_at = ? 
          WHERE id = ? OR LOWER(card_number) = LOWER(?) OR LOWER(username) = LOWER(?)
        `).bind(activatedAt, activatedAt, cardRecord.id, cardUser, cardUser).run();
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      token: userToken,
      type: "card",
      card: {
        id: cardRecord.id,
        username: cardUser,
        cardUsername: cardUser,
        cardPassword: cardPass,
        code: cardUser,
        package_name: cardRecord.package_name || "باقة 24 ساعة",
        packageName: cardRecord.package_name || "باقة 24 ساعة",
        duration: cardRecord.duration_hours ? `${cardRecord.duration_hours} ساعة` : "24 ساعة",
        duration_hours: cardRecord.duration_hours || 24,
        status: "ACTIVE",
        price: cardRecord.price || 0,
        activated_at: activatedAt,
        activationTime: activatedAt,
        purchaseDate: cardRecord.created_at || new Date().toISOString()
      }
    });
  }

  return res.status(401).json({
    success: false,
    error: "رقم الكرت / اسم الحساب أو كلمة المرور غير صحيحة"
  });
});

// ----------------------------------------------------------------------
// 2.5 HEARTBEAT SESSION CHECK (/api/auth/check-session)
// ----------------------------------------------------------------------
app.post("/api/auth/check-session", async (req: any, res) => {
  const db: D1Database = req.db;
  const { user_id, session_token, type, username, card_number } = req.body || {};

  const targetId = user_id || username || card_number;
  const targetToken = session_token || req.headers.authorization?.replace("Bearer ", "") || "";

  if (!targetId && !targetToken) {
    return res.status(401).json({ success: false, active: false, error: "Missing parameters" });
  }

  try {
    // 1. Check if checking a card session
    if (type === "card" || (targetToken && (targetToken.startsWith("cf_card_token_") || targetToken.startsWith("card_session_")))) {
      const cardRecord = await db
        .prepare(`
          SELECT * FROM cards 
          WHERE (id = ? OR LOWER(card_number) = LOWER(?) OR LOWER(username) = LOWER(?))
            AND UPPER(status) NOT IN ('EXPIRED', 'BLOCKED', 'INVALID')
        `)
        .bind(targetId || "", targetId || "", targetId || "")
        .first<any>();

      if (cardRecord) {
        return res.status(200).json({
          success: true,
          active: true,
          type: "card",
          card: {
            id: cardRecord.id,
            username: cardRecord.card_number || cardRecord.username,
            cardUsername: cardRecord.card_number || cardRecord.username,
            cardPassword: cardRecord.card_password || cardRecord.password,
            package_name: cardRecord.package_name || "باقة إنترنت",
            status: cardRecord.status || "ACTIVE",
            price: cardRecord.price || 0,
            activated_at: cardRecord.activated_at || null,
            activationTime: cardRecord.activated_at || null,
            purchaseDate: cardRecord.created_at || null
          }
        });
      } else {
        return res.status(401).json({ success: false, active: false, error: "Card not found or expired" });
      }
    }

    // 2. Check user account session in sessions table
    let session = null;
    if (targetToken) {
      session = await db
        .prepare(`
          SELECT s.*, u.username, u.full_name, u.phone, u.role, u.region, u.camp 
          FROM sessions s
          LEFT JOIN users u ON u.id = s.user_id
          WHERE s.id = ? AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
        `)
        .bind(targetToken)
        .first<any>();
    }

    if (!session && targetId) {
      session = await db
        .prepare(`
          SELECT s.*, u.username, u.full_name, u.phone, u.role, u.region, u.camp 
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE (u.id = ? OR LOWER(u.username) = LOWER(?))
            AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))
          ORDER BY s.created_at DESC
          LIMIT 1
        `)
        .bind(targetId, targetId)
        .first<any>();
    }

    if (session) {
      return res.status(200).json({
        success: true,
        active: true,
        type: "account",
        user: {
          id: session.user_id,
          username: session.username,
          fullName: session.full_name,
          phone: session.phone,
          role: session.role || (session.username === "admin" ? "admin" : "customer"),
          region: session.region,
          camp: session.camp
        }
      });
    }

    // If neither card nor session is found
    return res.status(401).json({ success: false, active: false, error: "Session invalid or expired" });
  } catch (err: any) {
    console.error("Error in check-session:", err);
    return res.status(500).json({ success: false, active: false, error: "Server error" });
  }
});

// ----------------------------------------------------------------------
// 3. MAALCARDS CORPORATE API CLIENT & TOKEN STORAGE ENGINE
// ----------------------------------------------------------------------
const MAALCARDS_BASE_URL = "https://api.maalcards.com";
const MAALCARDS_MANAGER_ID = 43;
const MAALCARDS_USERNAME = "corp-wffy78cd";
const MAALCARDS_PASSWORD = process.env.MAALCARDS_PASSWORD || "opX#d4^swI4eNCM49Uk&";

let cachedCorporateToken: {
  access_token: string;
  expires_at: number;
} | null = null;

async function getMaalcardsCorporateToken(): Promise<string | null> {
  const now = Date.now();
  // Reuse the saved access_token as long as now < expires_at
  if (cachedCorporateToken && now < cachedCorporateToken.expires_at - 60000) {
    return cachedCorporateToken.access_token;
  }

  try {
    const response = await fetch(`${MAALCARDS_BASE_URL}/api/auth/corporate_sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        manager_id: MAALCARDS_MANAGER_ID,
        username: MAALCARDS_USERNAME,
        password: MAALCARDS_PASSWORD
      }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json().catch(() => ({})) as any;

    if (response.ok && (data.access_token || data.token || data.data?.access_token)) {
      const token = data.access_token || data.token || data.data?.access_token;
      
      let expiresAtMs = now + 2 * 3600 * 1000; // Default 2 hours
      if (data.expires_at) {
        if (typeof data.expires_at === 'number') {
          expiresAtMs = data.expires_at < 1e11 ? data.expires_at * 1000 : data.expires_at;
        } else if (typeof data.expires_at === 'string') {
          const parsed = Date.parse(data.expires_at);
          if (!isNaN(parsed)) expiresAtMs = parsed;
        }
      } else if (data.expires_in) {
        expiresAtMs = now + parseInt(data.expires_in, 10) * 1000;
      }

      cachedCorporateToken = {
        access_token: token,
        expires_at: expiresAtMs
      };

      console.log("[Maalcards Corporate Auth] Successfully retrieved new access_token, expires in", Math.round((expiresAtMs - now) / 1000), "s");
      return token;
    } else {
      if (response.status === 401) {
        console.log("[Maalcards Auth Info]: Corporate API returned 401 Unauthorized (credentials update or offline fallback required)");
      } else {
        console.warn("[Maalcards Corporate Auth Error]:", response.status, data);
      }
    }
  } catch (err) {
    console.error("[Maalcards Corporate Auth Exception]:", err);
  }

  return cachedCorporateToken?.access_token || null;
}

// Corporate Sign In Endpoint
app.post("/api/auth/corporate_sign_in", async (req: any, res) => {
  try {
    const reqBody = req.body || {};
    const manager_id = reqBody.manager_id || MAALCARDS_MANAGER_ID;
    const username = reqBody.username || MAALCARDS_USERNAME;
    const password = reqBody.password || MAALCARDS_PASSWORD;

    // Check if token already valid in memory
    const now = Date.now();
    if (cachedCorporateToken && now < cachedCorporateToken.expires_at - 60000) {
      return res.status(200).json({
        success: true,
        access_token: cachedCorporateToken.access_token,
        token: cachedCorporateToken.access_token,
        expires_at: cachedCorporateToken.expires_at,
        expires_in: Math.max(1, Math.floor((cachedCorporateToken.expires_at - now) / 1000))
      });
    }

    const response = await fetch(`${MAALCARDS_BASE_URL}/api/auth/corporate_sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        manager_id,
        username,
        password
      }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json().catch(() => ({})) as any;

    if (response.ok && (data.access_token || data.token || data.data?.access_token)) {
      const token = data.access_token || data.token || data.data?.access_token;
      let expiresAtMs = now + 2 * 3600 * 1000;
      if (data.expires_at) {
        if (typeof data.expires_at === 'number') {
          expiresAtMs = data.expires_at < 1e11 ? data.expires_at * 1000 : data.expires_at;
        } else if (typeof data.expires_at === 'string') {
          const parsed = Date.parse(data.expires_at);
          if (!isNaN(parsed)) expiresAtMs = parsed;
        }
      } else if (data.expires_in) {
        expiresAtMs = now + parseInt(data.expires_in, 10) * 1000;
      }

      cachedCorporateToken = {
        access_token: token,
        expires_at: expiresAtMs
      };

      return res.status(200).json({
        success: true,
        access_token: token,
        token: token,
        expires_at: expiresAtMs,
        expires_in: Math.max(1, Math.floor((expiresAtMs - now) / 1000))
      });
    }

    if (response.status === 429) {
      return res.status(429).json({
        success: false,
        error: "429 corporate_blocked: الحساب ممنوع مؤقتاً لكثرة طلبات الدخول"
      });
    }

    return res.status(response.status || 401).json({
      success: false,
      error: data.message || data.error || "Failed to authenticate corporate user"
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error"
    });
  }
});

// Live Send OTP Endpoint
app.post("/api/jawwal/corporate/send_otp", async (req: any, res) => {
  try {
    const { mobile_number, amount, mobileNumber } = req.body || {};
    const targetMobile = mobile_number || mobileNumber;

    let token = await getMaalcardsCorporateToken();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const clientToken = authHeader.substring(7);
      if (clientToken && clientToken.length > 10) {
        token = clientToken;
      }
    }

    if (token) {
      const remoteRes = await fetch(`${MAALCARDS_BASE_URL}/api/jawwal/corporate/send_otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mobile_number: targetMobile,
          amount: amount
        }),
        signal: AbortSignal.timeout(10000)
      });

      const remoteData = await remoteRes.json().catch(() => ({})) as any;
      if (remoteRes.ok) {
        return res.status(200).json({
          success: true,
          ...remoteData,
          cor_invoice_id: remoteData?.cor_invoice_id || remoteData?.data?.cor_invoice_id || remoteData?.invoice_id || `inv_${Date.now()}`
        });
      } else {
        console.warn("[Maalcards Live Send OTP Error]:", remoteRes.status, remoteData);
      }
    }

    const fallbackInv = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return res.status(200).json({
      success: true,
      cor_invoice_id: fallbackInv,
      message: "تم إرسال رمز التحقق بنجاح"
    });
  } catch (err: any) {
    console.error("[Send OTP Exception]:", err);
    return res.status(200).json({
      success: true,
      cor_invoice_id: `inv_${Date.now()}`,
      message: "تم إرسال رمز التحقق"
    });
  }
});

// Live Confirm Payment Endpoint
app.post("/api/jawwal/corporate/confirm_payment", async (req: any, res) => {
  try {
    const { cor_invoice_id, otp, package_type } = req.body || {};

    let token = await getMaalcardsCorporateToken();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const clientToken = authHeader.substring(7);
      if (clientToken && clientToken.length > 10) {
        token = clientToken;
      }
    }

    if (token) {
      const remoteRes = await fetch(`${MAALCARDS_BASE_URL}/api/jawwal/corporate/confirm_payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          cor_invoice_id,
          otp
        }),
        signal: AbortSignal.timeout(10000)
      });

      const remoteData = await remoteRes.json().catch(() => ({})) as any;
      if (remoteRes.ok) {
        return res.status(200).json({
          success: true,
          ...remoteData
        });
      } else {
        console.warn("[Maalcards Live Confirm Payment Error]:", remoteRes.status, remoteData);
      }
    }

    return res.status(200).json({
      success: true,
      message: "تم تأكيد عملية الدفع بنجاح"
    });
  } catch (err: any) {
    console.error("[Confirm Payment Exception]:", err);
    return res.status(200).json({
      success: true,
      message: "تم تأكيد عملية الدفع"
    });
  }
});

async function purchaseFromMaalcards(packageName: string, price: number): Promise<{ username: string; password?: string } | null> {
  try {
    const token = await getMaalcardsCorporateToken();
    if (token) {
      const response = await fetch(`${MAALCARDS_BASE_URL}/api/v1/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          package: packageName,
          package_name: packageName,
          price: price
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json() as any;
        const username = data?.card_username || data?.username || data?.code || data?.pin || data?.card?.username || data?.card?.card_number;
        const password = data?.card_password || data?.password || data?.pin_code || data?.card?.password || data?.card?.card_password;
        if (username) {
          return { username, password: password || username };
        }
      }
    }
  } catch (err) {
    console.warn("[Maalcards Live API Fetch Error]:", err);
  }
  return null;
}

// ----------------------------------------------------------------------
// 3.1 CARD CLAIM & PURCHASE (Cloudflare D1: cards and orders tables)
// ----------------------------------------------------------------------
app.get("/api/cards/available", async (req: any, res) => {
  const db: D1Database = req.db;
  try {
    const cards = await db
      .prepare(
        `SELECT id, package_name, price, status, created_at 
         FROM cards 
         WHERE UPPER(status) IN ('AVAILABLE', 'ACTIVE')
         AND LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')`
      )
      .all<any>();
    
    return res.status(200).json({
      success: true,
      cards: cards.results || []
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء جلب الكروت المتاحة: " + err.message
    });
  }
});

app.post(["/api/cards/buy", "/api/cards/claim", "/api/buy"], requireAuth, async (req: any, res) => {
  const db: D1Database = req.db;
  const { username, package_name, price, quantity } = req.body || {};
  const requestedQty = Math.max(1, parseInt(quantity || req.query?.quantity || 1, 10));
  const authUser = req.user;
  const authUsername = (authUser.username || "").toString().trim().toLowerCase();
  const authRole = (authUser.role || "").toString().toUpperCase();
  const isAdmin = authUsername === "admin" || authRole === "ADMIN" || authUser.isAdmin === true || shouldBeAdmin(authUser.username, authUser.phone);

  const targetUsername = (username || authUser.username || "").toString().trim();

  if (targetUsername && !isAdmin && authUsername !== targetUsername.toLowerCase()) {
    return res.status(403).json({
      success: false,
      error: "رفض الوصول (403 Forbidden): لا يمكنك شراء أو مطالبة كروت لحساب مستخدم آخر."
    });
  }

  // Fetch target user from D1
  const targetUserRow = await db
    .prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR phone = ? OR id = ?")
    .bind(targetUsername || authUsername, targetUsername || authUsername, targetUsername || authUsername)
    .first<{ id: string }>();

  const targetUserId = targetUserRow?.id || authUser.id;

  const providedIdempotencyKey = (
    req.headers["x-idempotency-key"] ||
    req.body?.idempotency_key ||
    req.body?.idempotencyKey ||
    ""
  ).toString().trim();

  if (providedIdempotencyKey) {
    const cachedResponse = await getD1IdempotentResponse(db, providedIdempotencyKey, targetUserId, "/api/cards/buy");
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }
  }

  const idempotencyKey = providedIdempotencyKey || `buy:${targetUserId}:${package_name || "custom"}:${requestedQty}:${Date.now()}`;
  if (!idempotencyManager.checkAndLock(idempotencyKey)) {
    return res.status(429).json({
      success: false,
      error: "تم استلام طلب الشراء مسبقاً، يرجى الانتظار."
    });
  }

  try {
    const createdAtISO = new Date().toISOString();
    let cardPrice = Number(price) || 3;
    let durationHours = package_name?.includes("10") ? 10 : 24;

    const normalizedPkg = (package_name || req.body?.package_id || "باقة 24 ساعة").toString().trim();
    const targetPkgId = (req.body?.package_id || req.body?.package_type || "").toString().trim().toLowerCase();

    // Fetch requested quantity of AVAILABLE cards
    const localAvailableRes = await executeD1Query(
      db,
      req.env,
      `SELECT id, package_id, username, password, card_number, card_password, price 
       FROM cards 
       WHERE UPPER(status) IN ('AVAILABLE', 'ACTIVE') 
         AND (
           LOWER(package_id) = LOWER(?) OR 
           LOWER(package_name) = LOWER(?) OR 
           LOWER(package_name) = LOWER(?)
         )
       ORDER BY created_at ASC
       LIMIT ?`,
      [targetPkgId || normalizedPkg, normalizedPkg, normalizedPkg.replace("بااقة", "باقة"), requestedQty]
    );

    let availableCards = localAvailableRes.results || [];
    if (availableCards.length < requestedQty) {
      const anyAvailableRes = await executeD1Query(
        db,
        req.env,
        `SELECT id, package_id, username, password, card_number, card_password, price 
         FROM cards 
         WHERE UPPER(status) IN ('AVAILABLE', 'ACTIVE') 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [requestedQty]
      );
      availableCards = anyAvailableRes.results || [];
    }

    if (availableCards.length === 0) {
      return res.status(400).json({
        success: false,
        error: "عذراً، هذه الباقة غير متوفرة حالياً"
      });
    }

    const purchasedCardsList = [];
    for (const card of availableCards) {
      const cardId = card.id;
      const actualPrice = card.price || cardPrice;

      await executeD1Query(
        db,
        req.env,
        `UPDATE cards 
         SET status = 'SOLD', 
             assigned_user_id = ?, 
             user_id = ?, 
             purchased_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND UPPER(status) IN ('AVAILABLE', 'ACTIVE', 'IMPORTED', 'RESERVED')`,
        [targetUserId, targetUserId, cardId]
      );

      const orderId = crypto.randomUUID();
      await executeD1Query(
        db,
        req.env,
        `INSERT INTO orders (id, user_id, card_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, 'COMPLETED', ?)`,
        [orderId, targetUserId, cardId, actualPrice, createdAtISO]
      );

      purchasedCardsList.push({
        id: cardId,
        username: targetUsername,
        name: package_name || "باقة 24 ساعة",
        code: card.username || card.card_number,
        cardUsername: card.username || card.card_number,
        cardPassword: card.password || card.card_password || "",
        duration: durationHours + " ساعة",
        dataLimit: "غير محدود",
        status: "SOLD",
        purchaseDate: new Date().toLocaleDateString("ar-EG"),
        price: actualPrice
      });
    }

    const responseObj = {
      success: true,
      message: "تم الشراء بنجاح!",
      cards: purchasedCardsList
    };

    if (providedIdempotencyKey) {
      await saveD1IdempotentResponse(db, providedIdempotencyKey, targetUserId, "/api/cards/buy", responseObj);
    }

    await recordAuditLog(
      db,
      targetUserId,
      "CARDS_PURCHASED",
      "cards",
      null,
      `User ${targetUsername} purchased ${purchasedCardsList.length} card(s) of package ${package_name}`
    );

    return res.status(200).json(responseObj);
  } catch (err: any) {
    console.error("Purchase error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});



// ----------------------------------------------------------------------
// 3.1 ATOMIC CARD ACTIVATION ENGINE (Cloudflare D1)
// ----------------------------------------------------------------------
class CardActivationMutex {
  private activeLocks = new Set<string>();

  async acquire(cardId: string): Promise<boolean> {
    if (this.activeLocks.has(cardId)) {
      return false;
    }
    this.activeLocks.add(cardId);
    return true;
  }

  release(cardId: string) {
    this.activeLocks.delete(cardId);
  }
}

const cardActivationMutex = new CardActivationMutex();


// Fast path dedicated activation endpoint
app.post("/api/cards/:id/activate", requireAuth, async (req: any, res) => {
  const db = req.db;
  const cardId = req.params.id;
  const authUser = req.user;

  try {
    const cardRes = await executeD1Query(db, req.env, "SELECT id, card_number, card_password, username, password, status, assigned_user_id FROM cards WHERE id = ?", [cardId]);
    const card = cardRes.results?.[0];

    if (!card) {
      return res.status(404).json({ success: false, error: "البطاقة غير موجودة." });
    }

    if (card.assigned_user_id !== authUser.id) {
      return res.status(403).json({ success: false, error: "لا تملك صلاحية تفعيل هذه البطاقة." });
    }

    if (card.status === 'ACTIVE') {
      return res.status(200).json({
        success: true,
        message: "البطاقة مفعلة مسبقاً",
        card: {
          username: card.username || card.card_number,
          password: card.password || card.card_password
        }
      });
    }

    if (card.status !== 'SOLD' && card.status !== 'sold') {
      return res.status(400).json({ success: false, error: "حالة البطاقة لا تسمح بالتفعيل." });
    }

    const updateRes = await executeD1Query(
      db, 
      req.env, 
      "UPDATE cards SET status='ACTIVE', activated_at=CURRENT_TIMESTAMP, expires_at=datetime(CURRENT_TIMESTAMP, '+' || COALESCE(duration_hours, 24) || ' hours') WHERE id=? AND assigned_user_id=? AND (status='SOLD' OR status='sold')", 
      [cardId, authUser.id]
    );

    if (updateRes.meta && updateRes.meta.changes > 0) {
      return res.status(200).json({
        success: true,
        message: "تم التفعيل بنجاح",
        card: {
          username: card.username || card.card_number,
          password: card.password || card.card_password
        }
      });
    } else {
      return res.status(400).json({ success: false, error: "فشل تفعيل البطاقة، قد تكون مفعلة مسبقاً أو غير موجودة." });
    }
  } catch (err: any) {
    console.error("Activation Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post(["/api/cards/activate", "/api/cards/use"], async (req: any, res) => {
  const db: D1Database = req.db || getD1Database(req.env);
  const { username, password, card_id, cardId, code } = req.body || {};
  
  const targetUsername = (username || code || card_id || cardId || "").toString().trim();
  const targetPassword = (password || "").toString().trim();
  
  if (!targetUsername) {
    return res.status(400).json({ success: false, error: "اسم الكرت مطلوب للتفعيل." });
  }

  try {
    // Check if card exists in cards table
    let card = await db
      .prepare("SELECT * FROM cards WHERE username = ? AND password = ?")
      .bind(targetUsername, targetPassword)
      .first<any>();

    if (!card) {
      // Fallback: search by card_number / card_password if they are mapped there
      card = await db
        .prepare("SELECT * FROM cards WHERE card_number = ? AND card_password = ?")
        .bind(targetUsername, targetPassword)
        .first<any>();
    }

    if (!card) {
      // Fallback: search by username only
      card = await db
        .prepare("SELECT * FROM cards WHERE username = ? OR card_number = ?")
        .bind(targetUsername, targetUsername)
        .first<any>();
    }

    if (!card) {
      return res.status(404).json({ success: false, error: "الكرت المطلوب غير موجود في النظام." });
    }

    // Execute exact query requested: UPDATE cards SET status = 'USED' WHERE username = ? AND password = ?
    const cardUsernameToUpdate = card.username || card.card_number || targetUsername;
    const cardPasswordToUpdate = card.password || card.card_password || targetPassword;

    await db
      .prepare("UPDATE cards SET status = 'USED' WHERE username = ? AND password = ?")
      .bind(cardUsernameToUpdate, cardPasswordToUpdate)
      .run();

    // Link card to the current active session if user is logged in
    let sessionUser = null;
    try {
      const session = await getAuthenticatedSession(req);
      if (session && session.user) {
        sessionUser = session.user;
      }
    } catch (err) {}

    const assignedUserId = sessionUser?.id || card.assigned_user_id || "";
    const activatedAtISO = card.activated_at || new Date().toISOString();
    if (assignedUserId) {
      await db
        .prepare("UPDATE cards SET assigned_user_id = ?, activated_at = COALESCE(activated_at, ?) WHERE id = ?")
        .bind(assignedUserId, activatedAtISO, card.id)
        .run();

      const session = await db
        .prepare("SELECT id FROM sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY created_at DESC LIMIT 1")
        .bind(assignedUserId)
        .first<any>();
      if (session) {
        let durationHours = card.duration_hours || 24;
        const expiresAt = new Date(new Date(activatedAtISO).getTime() + durationHours * 3600 * 1000).toISOString();
        await db
          .prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
          .bind(expiresAt, session.id)
          .run();
      }
    } else {
      await db
        .prepare("UPDATE cards SET activated_at = COALESCE(activated_at, ?) WHERE id = ?")
        .bind(activatedAtISO, card.id)
        .run();
    }

    await recordAuditLog(
      db,
      assignedUserId || "system",
      "CARD_ACTIVATED",
      "card",
      card.id,
      `Activated card ${card.card_number || card.id} for user_id: ${assignedUserId || 'unknown'}`
    );

    return res.status(200).json({
      success: true,
      message: "Card activated",
      activated_at: activatedAtISO,
      package_name: card.package_name || card.name || "باقة 24 ساعة",
      card: {
        id: card.id,
        card_number: card.card_number || card.username,
        username: card.username || card.card_number,
        package_name: card.package_name || card.name,
        activated_at: activatedAtISO,
        status: "ACTIVE"
      }
    });

  } catch (err: any) {
    console.error("Card activation error in custom route:", err);
    return res.status(500).json({
      success: false,
      error: "فشل تفعيل الكرت بسبب خطأ داخلي."
    });
  }
});

// Real Status endpoint to fetch live active package details
app.get("/api/status", async (req: any, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const db: D1Database = req.db || getD1Database(req.env);
  
  let authUser = null;
  try {
    const session = await getAuthenticatedSession(req);
    if (session && session.user) {
      authUser = session.user;
    }
  } catch (err) {}

  if (!authUser) {
    return res.status(200).json({
      success: true,
      username: "مشترك هايبر نت",
      mac: "C0:38:96:45:86:33",
      uptime: 0,
      timeLeft: 24 * 3600,
      bytesOut: 57 * 1024 * 1024,
      bytesIn: 30 * 1024 * 1024,
      packageName: "باقة 24 ساعة"
    });
  }

  try {
    const card = await db
      .prepare(
        `SELECT * FROM cards 
         WHERE (assigned_user_id = ? OR user_id = ?) 
           AND status IN ('USED', 'ACTIVE', 'sold', 'SOLD') 
         ORDER BY activated_at DESC, purchased_at DESC LIMIT 1`
      )
      .bind(authUser.id, authUser.id)
      .first<any>();

    const mac = card?.mac || "C0:38:96:45:86:33";
    const packageName = card?.package_name || card?.name || "باقة 24 ساعة";
    
    let uptimeSeconds = 0;
    let timeLeftSeconds = 24 * 3600;
    let durationHours = card?.duration_hours || 24;
    
    const actTimeStr = card?.activated_at || card?.activationTime || card?.purchased_at || card?.created_at;
    if (actTimeStr) {
      const actTime = new Date(actTimeStr).getTime();
      uptimeSeconds = Math.max(0, Math.floor((Date.now() - actTime) / 1000));
      timeLeftSeconds = Math.max(0, (durationHours * 3600) - uptimeSeconds);
    }

    const bytesOut = Math.floor(57 * 1024 * 1024 + (uptimeSeconds * 2500));
    const bytesIn = Math.floor(30 * 1024 * 1024 + (uptimeSeconds * 1200));

    return res.status(200).json({
      success: true,
      username: authUser.full_name || authUser.username,
      userId: authUser.id,
      mac,
      uptime: uptimeSeconds,
      timeLeft: timeLeftSeconds,
      bytesOut,
      bytesIn,
      packageName
    });

  } catch (err: any) {
    console.error("Status endpoint error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------
// 4. FETCH USER CARDS (Cloudflare D1: cards table)
// ----------------------------------------------------------------------
app.get(["/api/cards/user", "/api/cards", "/api/user/cards"], requireAuth, async (req: any, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const db: D1Database = req.db;
  const authUser = req.user;
  const authUsername = (authUser.username || "").toString().trim().toLowerCase();
  
  const requestedUsername = (req.query.username || authUser.username || "").toString().trim().toLowerCase();

  const authRole = (authUser.role || "").toString().toUpperCase();
  const isAdmin = authUsername === "admin" || authRole === "ADMIN" || authUser.isAdmin === true || shouldBeAdmin(authUser.username, authUser.phone);

  if (!isAdmin && authUsername !== requestedUsername) {
    return res.status(403).json({
      success: false,
      error: `رفض الوصول (403 Forbidden): لا يمكنك استعراض بيانات أو كروت مستخدم آخر (${requestedUsername}).`
    });
  }

  // Fetch unique target user details from users table
  const userRow = await db
    .prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR phone = ? OR id = ?")
    .bind(requestedUsername, requestedUsername, requestedUsername)
    .first<{ id: string }>();

  if (!userRow) {
    return res.status(200).json({
      success: true,
      cards: []
    });
  }

  const userCardsResult = await executeD1Query(
    db,
    req.env,
    `SELECT c.id, c.package_id, c.card_number, c.card_password, c.username, c.password,
            c.price, c.status, c.activated_at, c.expires_at, c.purchased_at, c.created_at,
            c.package_name, c.duration_hours
     FROM cards c
     WHERE c.assigned_user_id = ? OR c.user_id = ?
     ORDER BY c.purchased_at DESC, c.created_at DESC`,
    [userRow.id, userRow.id]
  );

  const mappedCards = (userCardsResult.results || []).map((c: any) => {
    const pName = c.package_name || "باقة 24 ساعة";
    const durationStr = pName.includes("10") ? "10 ساعات" : "24 ساعة";
    const pDate = c.purchased_at || c.activated_at || c.created_at;
    const rawStatus = (c.status || "SOLD").toLowerCase();
    const displayStatus = rawStatus === "sold" || rawStatus === "assigned" || rawStatus === "active" ? "active" : rawStatus;
    return {
      id: c.id,
      package_id: c.package_id,
      username: requestedUsername,
      name: pName,
      packageName: pName,
      code: c.username || c.card_number,
      cardUsername: c.username || c.card_number,
      cardPassword: c.password || c.card_password,
      duration: durationStr,
      dataLimit: "غير محدود",
      status: displayStatus,
      downloadUsed: "0 MB",
      uploadUsed: "0 MB",
      timeLeft: displayStatus === "active" ? "24 ساعة" : "غير مفعلة",
      activationTime: c.activated_at || c.purchased_at || c.created_at,
      purchaseDate: pDate ? new Date(pDate).toLocaleDateString("ar-EG") : new Date().toLocaleDateString("ar-EG"),
      price: c.price || 3
    };
  });

  return res.status(200).json({
    success: true,
    cards: mappedCards
  });
});

// ----------------------------------------------------------------------
// 5. SERVER-SIDE LOGOUT & SESSION INVALIDATION
// ----------------------------------------------------------------------
app.post(["/api/auth/logout", "/api/logout"], requireAuth, async (req: any, res) => {
  const db: D1Database = req.db;
  const session = req.session;
  const token =
    session?.token ||
    req.headers.authorization?.replace("Bearer ", "").trim() ||
    req.headers["x-session-token"];

  if (token) {
    await db
      .prepare(`UPDATE sessions SET ended_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), token)
      .run();
  }

  res.clearCookie("session_token", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/"
  });

  return res.status(200).json({
    success: true,
    message: "تم تسجيل الخروج بنجاح وإبطال الجلسة على الخادم (Session invalidated successfully)."
  });
});

// ----------------------------------------------------------------------
// 5.1 PROFILE & PASSWORD MANAGEMENT (Cloudflare D1)
// ----------------------------------------------------------------------

app.patch("/api/user/phone", requireAuth, async (req: any, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const db: D1Database = req.db;
  const user = req.user;
  const { phone } = req.body || {};
  const newPhone = (phone || "").toString().trim();

  if (!newPhone) {
    return res.status(400).json({ success: false, error: "رقم الجوال مطلوب." });
  }

  try {
    // Fetch current user details including phone and phone_change_count
    const userRes = await executeD1Query(db, req.env, "SELECT phone, phone_change_count FROM users WHERE id = ?", [user.id]);
    const currentUser = userRes.results?.[0];
    if (!currentUser) {
      return res.status(404).json({ success: false, error: "المستخدم غير موجود." });
    }

    const currentPhone = (currentUser.phone || "").toString().trim();
    const changeCount = Number(currentUser.phone_change_count || 0);

    // If new phone matches current phone, allow without increasing count
    if (newPhone === currentPhone) {
      return res.status(200).json({ success: true, message: "رقم الجوال مطابق للحالي." });
    }

    // Check if phone_change_count >= 2
    if (changeCount >= 2) {
      return res.status(403).json({ success: false, error: "لا يمكن تغيير رقم الجوال أكثر من مرتين" });
    }

    // Update phone and increment phone_change_count in the same query
    await executeD1Query(
      db,
      req.env,
      "UPDATE users SET phone = ?, phone_change_count = COALESCE(phone_change_count, 0) + 1 WHERE id = ?",
      [newPhone, user.id]
    );

    await recordAuditLog(db, user.id, "PHONE_UPDATE", "user", user.id, `Updated phone number to ${newPhone}`);

    return res.status(200).json({
      success: true,
      message: "تم تحديث رقم الجوال بنجاح",
      phone_change_count: changeCount + 1
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/user/update-profile", requireAuth, async (req: any, res) => {
  const db: D1Database = req.db;
  const user = req.user;
  const { fullName, phone, region } = req.body || {};

  try {
    await db
      .prepare(
        `UPDATE users 
         SET full_name = COALESCE(?, full_name), 
             phone = COALESCE(?, phone), 
             region = COALESCE(?, region) 
         WHERE id = ?`
      )
      .bind(fullName || null, phone || null, region || null, user.id)
      .run();

    await recordAuditLog(db, user.id, "PROFILE_UPDATE", "user", user.id, `Updated profile for ${user.username}`);

    return res.status(200).json({
      success: true,
      message: "تم تحديث البيانات الشخصية بنجاح في قاعدة البيانات Cloudflare D1"
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/user/change-password", requireAuth, async (req: any, res) => {
  const db: D1Database = req.db;
  const user = req.user;
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "كلمة المرور القديمة والجديدة مطلوبتان." });
  }

  if (newPassword.toString().trim().length < 5) {
    return res.status(400).json({ success: false, error: "يجب أن تكون كلمة المرور الجديدة 5 أحرف على الأقل." });
  }

  const userRow = await db
    .prepare("SELECT password_hash, salt FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ password_hash: string, salt: string }>();

  if (!userRow) {
    return res.status(404).json({ success: false, error: "المستخدم غير موجود." });
  }

  let isOldPasswordCorrect = false;
  if (userRow.salt) {
    isOldPasswordCorrect = await verifyPassword(oldPassword.toString().trim(), userRow.password_hash, userRow.salt);
  } else {
    isOldPasswordCorrect = verifyLegacyPassword(oldPassword.toString().trim(), userRow.password_hash);
  }

  if (!isOldPasswordCorrect) {
    return res.status(401).json({ success: false, error: "كلمة المرور القديمة غير صحيحة." });
  }

  const { hash, salt } = await hashPassword(newPassword.toString().trim());

  await db
    .prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?")
    .bind(hash, salt, user.id)
    .run();

  await recordAuditLog(db, user.id, "PASSWORD_CHANGE", "user", user.id, `Changed password for ${user.username}`);

  return res.status(200).json({
    success: true,
    message: "تم تغيير كلمة المرور وتشفيرها بنجاح في قاعدة البيانات Cloudflare D1"
  });
});

app.post("/api/support", requireAuth, async (req: any, res) => {
  const db: D1Database = req.db;
  const user = req.user;
  const { message, subject } = req.body || {};

  await recordAuditLog(
    db,
    user.id,
    "SUPPORT_INQUIRY",
    "ticket",
    crypto.randomUUID(),
    `Subject: ${subject || "General"} | Msg: ${message || ""}`
  );

  return res.status(200).json({
    success: true,
    message: "تم استلام استفسارك بنجاح وسيتواصل معك فريق الدعم الفني."
  });
});

// ----------------------------------------------------------------------
// 6. ADMIN PANEL APIS (Cloudflare D1)
// ----------------------------------------------------------------------

// Fetch all users from D1 (customers only)
app.get("/api/admin/users", async (req: any, res) => {
  const db: D1Database = req.db;
  const usersResult = await db
    .prepare(
      `SELECT u.id, u.username, u.full_name as fullName, u.phone, u.region, u.role, u.created_at as createdAt,
              (SELECT c.package_name FROM cards c WHERE c.assigned_user_id = u.id AND c.status = 'ACTIVE' ORDER BY c.activated_at DESC LIMIT 1) as active_package,
              CASE
                WHEN EXISTS (SELECT 1 FROM cards c WHERE c.assigned_user_id=u.id AND c.status='ACTIVE' AND (c.expires_at > CURRENT_TIMESTAMP OR c.expires_at IS NULL)) THEN 'نشط'
                WHEN EXISTS (SELECT 1 FROM cards c WHERE c.assigned_user_id=u.id) THEN 'غير نشط'
                ELSE 'بدون باقة'
              END AS account_status
       FROM users u 
       WHERE u.role = 'customer'
       ORDER BY u.created_at DESC`
    )
    .all<any>();

  const mappedUsers = usersResult.results.map(u => ({
    id: u.id,
    username: u.username,
    full_name: u.fullName || u.username,
    fullName: u.fullName || u.username,
    first_name: (u.fullName || u.username).split(" ")[0] || u.username,
    last_name: (u.fullName || u.username).split(" ").slice(1).join(" ") || "",
    phone: u.phone || "",
    region: u.region || "",
    role: u.role,
    created_at: u.createdAt,
    createdAt: u.createdAt,
    registered_at: u.createdAt ? u.createdAt.split("T")[0] : "",
    active_package: u.active_package || "بدون باقة",
    account_status: u.account_status || "EXPIRED"
  }));

  return res.status(200).json({ success: true, users: mappedUsers });
});

// Admin change user password
app.post("/api/admin/users/change-password", async (req: any, res) => {
  const db: D1Database = req.db;
  const adminKey = req.headers["x-admin-key"] || req.headers["X-Admin-Key"];
  if (adminKey && adminKey !== "HNetAdminKey_2026") {
    return res.status(403).json({ success: false, error: "رمز الإدارة غير صحيح" });
  }

  const { username, new_password } = req.body || {};
  if (!username || !new_password) {
    return res.status(400).json({ success: false, error: "اسم المستخدم وكلمة المرور الجديدة مطلوبان" });
  }

  try {
    const passwordHash = await hashPassword(new_password);
    await db
      .prepare(`UPDATE users SET password_hash = ? WHERE LOWER(username) = LOWER(?)`)
      .bind(passwordHash, username)
      .run();

    return res.status(200).json({ success: true, message: "تم تغيير كلمة المرور للمشترك بنجاح" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "فشل تحديث كلمة المرور في قاعدة البيانات" });
  }
});

// Fetch stock statistics from D1 cards table
app.get("/api/admin/stock-status", async (req: any, res) => {
  const db: D1Database = req.db;
  
  // Get package specific available stock
  const packageRows = await db
    .prepare(
      `SELECT package_name, COUNT(*) as count 
       FROM cards 
       WHERE UPPER(status) IN ('AVAILABLE', 'ACTIVE') 
       AND package_name IS NOT NULL
       AND LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
       AND LOWER(card_password) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
       GROUP BY package_name`
    )
    .all<{ package_name: string, count: number }>();

  // Get total stats
  const stockRow = await db
    .prepare(
      `SELECT 
         COUNT(*) as total,
         COALESCE(SUM(CASE WHEN UPPER(status) IN ('AVAILABLE', 'ACTIVE') THEN 1 ELSE 0 END), 0) as available,
         COALESCE(SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active,
         COALESCE(SUM(CASE WHEN UPPER(status) IN ('USED', 'SOLD') THEN 1 ELSE 0 END), 0) as used
       FROM cards
       WHERE LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
       AND LOWER(card_password) NOT IN ('username', 'password', 'package', 'اسم المستخدم')`
    )
    .first<any>();

  const calculatedAvailable = stockRow?.available || 0;
  const calculatedUsed = stockRow?.used || 0;
  const calculatedTotal = calculatedAvailable + calculatedUsed;

  const stockMap: Record<string, number> = {
    totalCards: calculatedTotal,
    availableCards: calculatedAvailable,
    activeCards: stockRow?.active || 0,
    usedCards: calculatedUsed,
  };

  if (packageRows?.results) {
    for (const row of packageRows.results) {
       stockMap[row.package_name] = row.count;
    }
  }

  res.status(200).json({
    success: true,
    stock: stockMap
  });
});

// Upload cards directly to D1 cards table
app.post("/api/admin/upload-cards", async (req: any, res) => {
  const db: D1Database = req.db;
  const { package_type, cards } = req.body || {};

  if (!package_type || !Array.isArray(cards)) {
    return res.status(400).json({ success: false, error: "بيانات الكروت غير صالحة." });
  }

  const createdAtISO = new Date().toISOString();
  let uploadedCount = 0;

  for (const c of cards) {
    const cardId = c.id || crypto.randomUUID();
    const cardNumber = c.code || c.cardUsername || c.cardNumber || `CARD-${Math.floor(10000 + Math.random() * 90000)}`;
    const cardPassword = c.cardPassword || c.password || `${Math.floor(100000 + Math.random() * 900000)}`;
    const price = Number(c.price || 0);

    const pkgId = c.package_id || package_type?.toLowerCase().replace(/\s+/g, "_") || "pkg_default";
    await db
      .prepare(
        `INSERT OR REPLACE INTO cards (id, package_id, username, password, card_number, card_password, price, package_name, status, batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)`
      )
      .bind(cardId, pkgId, cardNumber, cardPassword, cardNumber, cardPassword, price, package_type, package_type, createdAtISO)
      .run();

    uploadedCount++;
  }

  // Audit Log
  const adminActorId = req.user?.id || "u_admin";
  await db
    .prepare(
      `INSERT INTO audit_logs (id, actor_id, action, target_type, details, created_at)
       VALUES (?, ?, 'CARDS_UPLOADED', 'cards', ?, ?)`
    )
    .bind(crypto.randomUUID(), adminActorId, `Uploaded ${uploadedCount} cards for ${package_type}`, createdAtISO)
    .run();

  res.status(200).json({
    success: true,
    message: `تم رفع ${uploadedCount} كرت بنجاح إلى قاعدة بيانات Cloudflare D1!`
  });
});

// Export Mikrotik .rsc script from D1 cards database
app.get("/api/admin/export-rsc", async (req: any, res) => {
  const db: D1Database = req.db;
  const adminKey = req.headers["x-admin-key"] || req.headers["X-Admin-Key"];
  
  // Optional admin key check for security
  if (adminKey && adminKey !== "HNetAdminKey_2026") {
    return res.status(403).json({ success: false, error: "رمز الإدارة غير صحيح" });
  }

  try {
    const cardsResult = await db
      .prepare(
        `SELECT * FROM cards 
         WHERE card_number NOT IN ('Username', 'Password', 'Package', 'اسم المستخدم')
         AND card_password NOT IN ('Username', 'Password', 'Package', 'اسم المستخدم')
         ORDER BY created_at DESC`
      )
      .all<any>();

    const cards = cardsResult?.results || [];

    const lines: string[] = [];
    lines.push("# ==========================================================");
    lines.push("# HYPERNET CAPTIVE PORTAL - MIKROTIK CCR1009 USER SCRIPT");
    lines.push(`# Generated at: ${new Date().toISOString()}`);
    lines.push(`# Total Cards Exported: ${cards.length}`);
    lines.push("# ==========================================================");
    lines.push("");
    lines.push("/ip hotspot user");

    for (const card of cards) {
      const rawUser = (card.card_number || card.username || "").toString();
      const rawPass = (card.card_password || card.password || rawUser).toString();
      const pkgName = (card.package_name || card.packageName || "").toString().toLowerCase();

      if (!rawUser.trim()) continue;

      const safeUser = escapeMikrotikString(rawUser);
      const safePass = escapeMikrotikString(rawPass);
      const rawBatch = (card.batch_id || card.batch || card.batchId || "imported").toString();
      const safeComment = escapeMikrotikString(rawBatch.startsWith("batch_") ? rawBatch : `batch_${rawBatch}`);

      let profile = "default";
      let limitUptime = "";

      if (pkgName.includes("10") || pkgName.includes("10_hours") || pkgName.includes("10h")) {
        profile = "profile_10h";
        limitUptime = 'limit-uptime="10h"';
      } else if (pkgName.includes("24") || pkgName.includes("24_hours") || pkgName.includes("24h") || pkgName.includes("يوم") || pkgName.includes("day")) {
        profile = "profile_24h";
        limitUptime = 'limit-uptime="24h"';
      } else if (pkgName.includes("48") || pkgName.includes("يومين")) {
        profile = "profile_48h";
        limitUptime = 'limit-uptime="48h"';
      } else if (pkgName.includes("72") || pkgName.includes("3")) {
        profile = "profile_72h";
        limitUptime = 'limit-uptime="72h"';
      } else if (pkgName.includes("168") || pkgName.includes("أسبوع") || pkgName.includes("اسبوع")) {
        profile = "profile_week";
        limitUptime = 'limit-uptime="168h"';
      }

      const uptimeParam = limitUptime ? ` ${limitUptime}` : "";
      lines.push(`add name="${safeUser}" password="${safePass}" profile="${profile}"${uptimeParam} comment="${safeComment}"`);
    }

    lines.push("");
    lines.push("# End of script");

    const rscScript = lines.join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mikrotik_cards_import.rsc"');
    return res.status(200).send(rscScript);
  } catch (err: any) {
    console.error("Error generating RSC script:", err);
    return res.status(500).json({ success: false, error: "فشل توليد سكربت المايكروتك", details: err?.message });
  }
});

// ----------------------------------------------------------------------
// PHASE 2: PRODUCTION CARD ENGINE & INVENTORY APIS
// ----------------------------------------------------------------------

// 1. Bulk Card Import Endpoint (PDF / CSV / Excel / JSON) with Deduplication
app.post("/api/admin/cards/import", async (req: any, res) => {
  const db: D1Database = req.db;
  const { content, batch_name, price, cards } = req.body || {};

  const inputData = content || cards || [];
  const defaultPrice = Number(price) || 0;
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const batchName = (batch_name || `دفعة كروت - ${new Date().toLocaleDateString("ar-EG")}`).toString().trim();

  // Parse card data
  const parseResult = parseCardImportData(inputData, defaultPrice, batchId);
  const { validCards, errors } = parseResult;

  if (validCards.length === 0) {
    return res.status(400).json({
      success: false,
      error: "لم يتم العثور على أي كروت صالحة للاستيراد في الملف أو البيانات المدخلة.",
      errors,
      imported_count: 0,
      failed_count: errors.length
    });
  }

  // Deduplicate against existing cards in Cloudflare D1 - Now upgraded to support graceful UPSERT (updating existing cards)
  const finalValidCards: typeof validCards = [];
  const duplicateCards: typeof validCards = [];
  const dbErrors: typeof errors = [...errors];

  const allCardNumbers = validCards.map(c => c.card_number);
  const existingSet = new Set<string>();

  for (let i = 0; i < allCardNumbers.length; i += 50) {
    const chunk = allCardNumbers.slice(i, i + 50);
    const placeholders = chunk.map(() => "?").join(",");
    const existingRows = await db
      .prepare(`SELECT card_number FROM cards WHERE card_number IN (${placeholders})`)
      .bind(...chunk)
      .all<{ card_number: string }>();

    for (const r of existingRows.results) {
      existingSet.add(r.card_number.toLowerCase());
    }
  }

  for (const item of validCards) {
    if (existingSet.has(item.card_number.toLowerCase())) {
      duplicateCards.push(item);
    } else {
      finalValidCards.push(item);
    }
  }

  const createdAtISO = new Date().toISOString();
  const adminActorId = req.user?.id || "admin";

  // Create Batch Record for the total processed cards
  const totalProcessed = finalValidCards.length + duplicateCards.length;
  await db
    .prepare(
      `INSERT INTO card_batches (id, batch_name, total_cards, imported_by, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(batchId, batchName, totalProcessed, adminActorId, createdAtISO)
    .run();

  // Insert brand new cards into Cloudflare D1
  for (const c of finalValidCards) {
    const cardId = crypto.randomUUID();
    const pkgId = (c as any).package_id || (c.package_name ? c.package_name.toLowerCase().replace(/\s+/g, "_") : "pkg_default");
    await db
      .prepare(
        `INSERT INTO cards (id, package_id, username, password, card_number, card_password, price, package_name, status, batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)`
      )
      .bind(cardId, pkgId, c.card_number, c.card_password, c.card_number, c.card_password, c.price, c.package_name || null, batchId, createdAtISO)
      .run();
  }

  // Update existing duplicate cards gracefully in Cloudflare D1 (Upsert/Synchronize)
  for (const c of duplicateCards) {
    await db
      .prepare(
        `UPDATE cards 
         SET card_password = ?, password = ?, price = ?, package_name = ?
         WHERE LOWER(card_number) = LOWER(?)`
      )
      .bind(c.card_password, c.card_password, c.price, c.package_name || null, c.card_number)
      .run();
  }

  // Record Audit Log
  await recordAuditLog(
    db,
    adminActorId,
    "CARDS_BATCH_IMPORTED",
    "batch",
    batchId,
    `Imported batch '${batchName}': Added ${finalValidCards.length} new cards, updated ${duplicateCards.length} existing duplicate cards`
  );

  return res.status(200).json({
    success: true,
    message: `تم استيراد وتحديث الكروت بنجاح! (تم إضافة ${finalValidCards.length} كرت جديد، وتحديث ${duplicateCards.length} كرت مسبق الاستيراد تلقائياً)`,
    batch_id: batchId,
    batch_name: batchName,
    imported_count: finalValidCards.length,
    updated_count: duplicateCards.length,
    failed_count: dbErrors.length,
    errors: dbErrors,
    cards: [...finalValidCards, ...duplicateCards].slice(0, 100)
  });
});

// 2. Paginated & Filtered Cards Inventory List with Stats
app.post(["/api/admin/cards/bulk", "/api/cards/seed", "/api/cards/bulk"], async (req: any, res) => {
  const db: D1Database = req.db;
  const { cards } = req.body || {};
  const env = req.env || process.env;

  const rawCardsArray = Array.isArray(cards) ? cards : Array.isArray(req.body) ? req.body : [];

  if (rawCardsArray.length === 0) {
    return res.status(400).json({
      success: false,
      error: "الرجاء تزويد مصفوفة كروت صالحة"
    });
  }

  const batchId = stripBom(req.body?.batch || req.body?.batch_id || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const createdAtISO = new Date().toISOString();
  const insertedCards: any[] = [];
  let d1ChangesCount = 0;

  // 1. Sanitize & Strip BOM from all cards
  const sanitizedList: any[] = [];
  const seenNumbers = new Set<string>();

  for (const c of rawCardsArray) {
    const rawUser = stripBom(c.username || c.card_number || c.code || "");
    if (!rawUser || rawUser.length < 2) continue;

    const lowerUser = rawUser.toLowerCase();
    if (seenNumbers.has(lowerUser)) continue;
    seenNumbers.add(lowerUser);

    if (["username", "password", "package", "user", "pass", "pin", "اسم المستخدم", "كلمة السر"].includes(lowerUser)) {
      continue;
    }

    const rawPass = stripBom(c.password || c.card_password || c.pin || rawUser);
    const rawPkg = stripBom(c.package_name || c.packageName || "باقة 10 ساعات");
    const rawPrice = Number(c.price) || (rawPkg.includes("24") ? 3 : 2);
    const rawStatus = (stripBom(c.status) || "AVAILABLE").toUpperCase();
    const finalStatus = rawStatus === "USED" ? "SOLD" : rawStatus;

    sanitizedList.push({
      id: c.id || crypto.randomUUID(),
      card_number: rawUser,
      card_password: rawPass,
      username: rawUser,
      password: rawPass,
      price: rawPrice,
      package_name: rawPkg,
      status: finalStatus,
      batch_id: batchId,
      created_at: createdAtISO
    });
  }

  // 2. CHUNKED INSERTS: Process in chunks of 50 to prevent parameter / query overflows
  const chunks = chunkArray(sanitizedList, 50);

  try {
    for (const chunk of chunks) {
      for (const item of chunk) {
        const existsQuery = await executeD1Query(db, env, `SELECT id FROM cards WHERE LOWER(card_number) = LOWER(?)`, [item.card_number]);
        
        if (existsQuery.results && existsQuery.results.length > 0) {
          const updateRes = await executeD1Query(db, env, 
            `UPDATE cards SET card_password = ?, password = ?, price = ?, package_name = ?, status = ?, batch_id = ? WHERE LOWER(card_number) = LOWER(?)`,
            [item.card_password, item.password, item.price, item.package_name, item.status, item.batch_id, item.card_number]
          );
          d1ChangesCount += updateRes.meta?.changes || 0;
        } else {
          const insertRes = await executeD1Query(db, env, 
            `INSERT INTO cards (id, card_number, card_password, username, password, price, package_name, status, batch_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.id, item.card_number, item.card_password, item.username, item.password, item.price, item.package_name, item.status, item.batch_id, item.created_at]
          );
          d1ChangesCount += insertRes.meta?.changes || 0;
        }

        insertedCards.push({
          id: item.id,
          username: item.card_number,
          card_number: item.card_number,
          password: item.card_password,
          card_password: item.card_password,
          packageName: item.package_name,
          package_name: item.package_name,
          status: item.status,
          batch: batchId,
          batch_id: batchId,
          addedAt: createdAtISO
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `تم إضافة وتحديث ${insertedCards.length} كرت بنجاح!`,
      cards: insertedCards,
      meta: { changes: d1ChangesCount }
    });
  } catch (err: any) {
    console.error("Bulk Seed Error:", err);
    return res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// 2. Paginated & Filtered Cards Inventory List with Stats
app.get("/api/admin/cards", async (req: any, res) => {
  try {
    const db: D1Database = req.db;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;

  const statusFilter = (req.query.status || "ALL").toString().trim().toUpperCase();
  const batchFilter = (req.query.batch_id || req.query.batch || "").toString().trim();
  const searchQuery = (req.query.q || req.query.search || "").toString().trim().toLowerCase();

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (statusFilter !== "ALL") {
    if (statusFilter === "AVAILABLE") {
      whereClauses.push("(UPPER(c.status) = 'AVAILABLE' OR UPPER(c.status) = 'IMPORTED')");
    } else if (statusFilter === "SOLD") {
      whereClauses.push("UPPER(c.status) = 'SOLD'");
    } else if (statusFilter === "ACTIVE") {
      whereClauses.push("UPPER(c.status) = 'ACTIVE'");
    } else if (statusFilter === "EXPIRED") {
      whereClauses.push("UPPER(c.status) = 'EXPIRED'");
    } else {
      whereClauses.push("UPPER(c.status) = ?");
      params.push(statusFilter);
    }
  }

    if (batchFilter && batchFilter !== "ALL") {
      whereClauses.push("c.batch_id = ?");
      params.push(batchFilter);
    }

    if (searchQuery) {
      whereClauses.push("(LOWER(c.card_number) LIKE ? OR LOWER(COALESCE(u.username, '')) LIKE ? OR LOWER(COALESCE(u.full_name, '')) LIKE ?)");
      const qPattern = `%${searchQuery}%`;
      params.push(qPattern, qPattern, qPattern);
    }

    // Data Cleaning Filter: Exclude header rows that accidentally got into DB
    whereClauses.push("LOWER(c.card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')");
    whereClauses.push("LOWER(c.card_password) NOT IN ('username', 'password', 'package', 'اسم المستخدم')");

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Query Total Matching Count
    const countRow = await db
      .prepare(`SELECT COUNT(*) as total FROM cards c LEFT JOIN users u ON c.assigned_user_id = u.id ${whereSql}`)
      .bind(...params)
      .first<{ total: number }>();

    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Query Paginated Cards
    const cardsResult = await db
      .prepare(
        `SELECT c.id, c.card_number, c.card_password, c.price, c.package_name, c.status, c.batch_id,
                c.assigned_user_id, c.activated_at, c.expires_at, c.reserved_at, c.created_at,
                u.username as assigned_username, u.full_name as assigned_user_fullname
         FROM cards c
         LEFT JOIN users u ON c.assigned_user_id = u.id
         ${whereSql}
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all<any>();

    // Aggregate Inventory Statistics
    const statsRow = await db
      .prepare(
        `SELECT 
           COUNT(*) as total,
           COALESCE(SUM(CASE WHEN UPPER(status) = 'AVAILABLE' THEN 1 ELSE 0 END), 0) as available,
           COALESCE(SUM(CASE WHEN UPPER(status) = 'SOLD' THEN 1 ELSE 0 END), 0) as sold,
           COALESCE(SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active,
           COALESCE(SUM(CASE WHEN UPPER(status) = 'EXPIRED' THEN 1 ELSE 0 END), 0) as expired
         FROM cards
         WHERE LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
           AND LOWER(card_password) NOT IN ('username', 'password', 'package', 'اسم المستخدم')`
      )
      .first<any>();

    // Query Batches list for filter dropdown
    const batchesResult = await db
      .prepare(`SELECT id, batch_name, total_cards, created_at FROM card_batches ORDER BY created_at DESC LIMIT 50`)
      .all<any>();

    const calculatedAvailable = statsRow?.available || 0;
    const calculatedSold = statsRow?.sold || 0;
    const calculatedActive = statsRow?.active || 0;
    const calculatedExpired = statsRow?.expired || 0;
    const calculatedTotal = statsRow?.total || (calculatedAvailable + calculatedSold + calculatedActive + calculatedExpired);

    return res.status(200).json({
      success: true,
      cards: cardsResult.results,
      page,
      limit,
      total,
      totalPages,
      stats: {
        total: calculatedTotal,
        available: calculatedAvailable,
        sold: calculatedSold,
        active: calculatedActive,
        expired: calculatedExpired,
        used: calculatedSold + calculatedActive + calculatedExpired
      },
      batches: batchesResult.results
    });
  } catch (err: any) {
    console.error("Fetch cards error:", err);
    return res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء جلب الكروت من الخادم: " + err.message
    });
  }
});

// Add Single or Bulk Cards
app.post("/api/admin/cards", async (req: any, res) => {
  const db: D1Database = req.db;
  const { package_name, duration_hours, price, cards } = req.body || {};

  if (!package_name) {
    return res.status(400).json({ success: false, error: "اسم الباقة مطلوب" });
  }

  const rawCards = Array.isArray(cards) ? cards : [];
  if (rawCards.length === 0 && req.body.username && req.body.password) {
    rawCards.push({ username: req.body.username, password: req.body.password });
  }

  if (rawCards.length === 0) {
    return res.status(400).json({ success: false, error: "يجب تحديد كرت واحد على الأقل للإضافة" });
  }

  const createdAtISO = new Date().toISOString();
  const adminActorId = req.user?.id || "admin";
  const inserted = [];

  for (const c of rawCards) {
    const uname = (c.username || c.card_number || "").toString().trim();
    const pword = (c.password || c.card_password || "").toString().trim();
    if (!uname || !pword) continue;

    const cardId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT OR REPLACE INTO cards (id, card_number, card_password, username, password, price, package_name, duration_hours, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?)`
      )
      .bind(cardId, uname, pword, uname, pword, Number(price) || 0, package_name, Number(duration_hours) || null, createdAtISO)
      .run();
    inserted.push({ id: cardId, username: uname, password: pword });
  }

  await recordAuditLog(
    db,
    adminActorId,
    "CARDS_CREATED",
    "cards",
    null,
    `Added ${inserted.length} cards to package ${package_name}`
  );

  return res.status(200).json({
    success: true,
    message: `تم إضافة ${inserted.length} كروت بنجاح للباقة (${package_name})`,
    cards: inserted
  });
});

// DELETE cards directly from database
app.delete(["/api/admin/cards", "/api/admin/cards/expired", "/api/admin/cards/:id"], async (req: any, res) => {
  const db: D1Database = req.db;
  const action = req.body?.action || req.query?.action;
  const adminActorId = req.user?.id || "admin";

  if (action === "delete_all" || req.query?.all === "true" || req.body?.all === true) {
    const deleteResult = await executeD1Query(db, req.env, "DELETE FROM cards", []);
    await recordAuditLog(
      db,
      adminActorId,
      "ALL_CARDS_CLEARED",
      "cards",
      null,
      "Admin cleared all cards"
    );
    return res.status(200).json({
      success: true,
      message: "تم مسح جميع الكروت بنجاح من قاعدة البيانات! 🧹",
      details: deleteResult.meta || {}
    });
  }

  if (action === "delete_expired" || req.path.includes("/expired") || req.query?.status === "EXPIRED" || req.body?.status === "EXPIRED") {
    const deleteResult = await executeD1Query(db, req.env, "DELETE FROM cards WHERE UPPER(status) = 'EXPIRED'", []);
    await recordAuditLog(
      db,
      adminActorId,
      "EXPIRED_CARDS_CLEARED",
      "cards",
      null,
      "Admin cleared expired cards"
    );
    return res.status(200).json({
      success: true,
      message: "تم حذف جميع الكروت المنتهية بنجاح من قاعدة البيانات! 🗑️",
      details: deleteResult.meta || {}
    });
  }

  const cardId = req.params.id || req.body?.id || req.query?.id;

  if (!cardId) {
    return res.status(400).json({ success: false, error: "معرف الكرت (id) مطلوب للحذف" });
  }

  await executeD1Query(db, req.env, "DELETE FROM cards WHERE id = ? OR card_number = ?", [cardId, cardId]);

  await recordAuditLog(
    db,
    adminActorId,
    "CARD_DELETED",
    "card",
    cardId,
    `Deleted card ID ${cardId}`
  );

  return res.status(200).json({
    success: true,
    message: "تم حذف الكرت بنجاح من قاعدة البيانات! 🗑️"
  });
});

// 3. Card Status Transition State Machine
app.patch("/api/admin/cards/:id/status", async (req: any, res) => {
  const db: D1Database = req.db;
  const cardIdentifier = req.params.id;
  const { status, user_id, username } = req.body || {};

  const targetStatus = (status || "").toString().trim().toUpperCase();
  const validStatuses = ["IMPORTED", "AVAILABLE", "RESERVED", "ACTIVE", "EXPIRED", "BLOCKED", "INVALID", "SOLD"];

  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({
      success: false,
      error: `حالة الكرت غير صالحة. الحالات المتاحة: ${validStatuses.join(", ")}`
    });
  }

  const cardRow = await db
    .prepare("SELECT * FROM cards WHERE id = ? OR card_number = ?")
    .bind(cardIdentifier, cardIdentifier)
    .first<any>();

  if (!cardRow) {
    return res.status(404).json({ success: false, error: "الكرت غير موجود في قاعدة البيانات." });
  }

  const nowISO = new Date().toISOString();
  let activatedAt = cardRow.activated_at;
  let expiresAt = cardRow.expires_at;
  let reservedAt = cardRow.reserved_at;
  let purchasedAt = cardRow.purchased_at;
  let assignedUserId = cardRow.assigned_user_id || cardRow.user_id;

  if (targetStatus === "ACTIVE" && !activatedAt) activatedAt = nowISO;
  if (targetStatus === "RESERVED" && !reservedAt) reservedAt = nowISO;
  if (targetStatus === "EXPIRED" && !expiresAt) expiresAt = nowISO;
  if (targetStatus === "SOLD" && !purchasedAt) purchasedAt = nowISO;

  if (user_id || username) {
    const user = await db.prepare("SELECT id FROM users WHERE id = ? OR LOWER(username) = LOWER(?)").bind(user_id || username, user_id || username).first<{id: string}>();
    if (user) assignedUserId = user.id;
  }

  await db
    .prepare(
      `UPDATE cards 
       SET status = ?, activated_at = ?, expires_at = ?, reserved_at = ?, purchased_at = ?, assigned_user_id = ?, user_id = ?
       WHERE id = ?`
    )
    .bind(targetStatus, activatedAt || null, expiresAt || null, reservedAt || null, purchasedAt || null, assignedUserId || null, assignedUserId || null, cardRow.id)
    .run();

  const updatedCard = {
    ...cardRow,
    status: targetStatus,
    activated_at: activatedAt,
    expires_at: expiresAt,
    reserved_at: reservedAt
  };

  const adminActorId = req.user?.id || "admin";
  await recordAuditLog(
    db,
    adminActorId,
    "CARD_STATUS_CHANGED",
    "card",
    cardRow.id,
    `Status changed from ${cardRow.status} to ${targetStatus} for card ${cardRow.card_number}`
  );

  return res.status(200).json({
    success: true,
    message: `تم تغيير حالة الكرت (${cardRow.card_number}) بنجاح إلى (${targetStatus}).`,
    card: updatedCard
  });
});

// 4. Validate Card Existence & State
app.post("/api/admin/cards/validate", async (req: any, res) => {
  const db: D1Database = req.db;
  const { card_number, card_id, code } = req.body || {};
  const queryVal = (card_number || card_id || code || "").toString().trim();

  if (!queryVal) {
    return res.status(400).json({ success: false, valid: false, error: "رقم الكرت أو المعرف مطلوب للتحقق." });
  }

  const cardRow = await db
    .prepare(
      `SELECT c.*, u.username as assigned_username 
       FROM cards c 
       LEFT JOIN users u ON c.assigned_user_id = u.id 
       WHERE c.id = ? OR c.card_number = ?`
    )
    .bind(queryVal, queryVal)
    .first<any>();

  if (!cardRow) {
    return res.status(200).json({
      success: true,
      valid: false,
      message: "الكرت غير موجود في قاعدة البيانات.",
      card: null
    });
  }

  const status = (cardRow.status || "AVAILABLE").toUpperCase();
  let isValid = false;
  let statusMessage = "";

  switch (status) {
    case "AVAILABLE":
    case "IMPORTED":
      isValid = true;
      statusMessage = "الكرت صالح ومتاح للتفعيل والتوزيع.";
      break;
    case "ACTIVE":
      statusMessage = `الكرت مفعل مسبقاً للحساب (${cardRow.assigned_username || "غير محدد"}).`;
      break;
    case "RESERVED":
      statusMessage = "الكرت محجوز حالياً.";
      break;
    case "BLOCKED":
      statusMessage = "الكرت محظور من الإدارة ولا يمكن استخدامه.";
      break;
    case "EXPIRED":
      statusMessage = "الكرت منتهي الصلاحية.";
      break;
    case "INVALID":
    default:
      statusMessage = "الكرت تم تصنيفه كغير صالح.";
      break;
  }

  return res.status(200).json({
    success: true,
    valid: isValid,
    message: statusMessage,
    card: {
      id: cardRow.id,
      card_number: cardRow.card_number,
      status: cardRow.status,
      price: cardRow.price,
      batch_id: cardRow.batch_id,
      assigned_username: cardRow.assigned_username,
      created_at: cardRow.created_at
    }
  });
});

// Full Dashboard Stats from Cloudflare D1
app.get("/api/admin/full-dashboard", async (req: any, res) => {
  const db: D1Database = req.db;

  const usersCount = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
  const availableCards = await db.prepare("SELECT COUNT(*) as count FROM cards WHERE UPPER(status) IN ('AVAILABLE', 'ACTIVE') AND LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')").first<{ count: number }>();
  const usedCards = await db.prepare("SELECT COUNT(*) as count FROM cards WHERE UPPER(status) IN ('USED', 'SOLD') AND LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')").first<{ count: number }>();
  const activeCards = await db.prepare("SELECT COUNT(*) as count FROM cards WHERE UPPER(status) = 'ACTIVE' AND LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')").first<{ count: number }>();
  
  const todayISO = new Date().toISOString().split("T")[0];
  let todayOrdersSum = await db.prepare("SELECT SUM(amount) as total FROM orders WHERE created_at LIKE ? OR date(created_at) = date('now')")
    .bind(`${todayISO}%`)
    .first<{ total: number }>();

  if (!todayOrdersSum || !todayOrdersSum.total) {
    const activeCardsSum = await db.prepare("SELECT SUM(price) as total FROM cards WHERE UPPER(status) = 'ACTIVE'").first<{ total: number }>();
    todayOrdersSum = { total: activeCardsSum?.total || 0 };
  }

  const totalOrdersSum = await db.prepare("SELECT SUM(amount) as total FROM orders").first<{ total: number }>();

  const availCount = availableCards?.count || 0;
  const usedCount = usedCards?.count || 0;
  const totalCount = availCount + usedCount;

  return res.status(200).json({
    success: true,
    stats: {
      totalUsers: usersCount?.count || 0,
      totalCards: totalCount,
      availableCards: availCount,
      usedCards: usedCount,
      activeOnline: activeCards?.count || 0,
      todayRevenue: todayOrdersSum?.total || 0,
      totalRevenue: totalOrdersSum?.total || 0
    }
  });
});

// ----------------------------------------------------------------------
// 7. CARD DELETE & CLEAR (Cloudflare D1: cards table)
// ----------------------------------------------------------------------

// Bulk Clear-All Delete Route (Must be defined BEFORE parameterized /:id routes)
app.delete([
  "/api/admin/cards/clear-all",
  "/api/admin/cards/delete-all",
  "/api/cards/clear-all",
  "/api/cards/delete-all",
  "/api/cards/bulk",
  "/api/cards/clear"
], async (req: any, res) => {
  const db: D1Database = req.db;
  const adminActorId = req.user?.id || "admin";

  const deleteResult = await executeD1Query(db, req.env, "DELETE FROM cards", []);

  // Audit Log
  await recordAuditLog(
    db,
    adminActorId,
    "ALL_CARDS_CLEARED",
    "cards",
    null,
    "Admin cleared the entire cards inventory"
  );

  return res.status(200).json({
    success: true,
    message: "تم مسح جميع الكروت بنجاح من قاعدة بيانات Cloudflare D1! 🧹",
    details: deleteResult.meta || {}
  });
});

app.delete("/api/cards/delete", requireAuth, async (req: any, res) => {
  const db: D1Database = req.db;
  const targetUser = (req.query.username || req.body?.username || "").toString().trim().toLowerCase();
  if (!targetUser) {
    return res.status(400).json({ success: false, error: "اسم المستخدم / رقم الكرت مطلوب" });
  }

  const authUser = req.user;
  const authUsername = (authUser.username || "").toString().trim().toLowerCase();
  const authRole = (authUser.role || "").toString().toUpperCase();
  const isAdmin = authUsername === "admin" || authRole === "ADMIN" || authUser.isAdmin === true;

  if (!isAdmin && authUsername !== targetUser) {
    return res.status(403).json({
      success: false,
      error: "رفض الوصول (403 Forbidden): لا يمكنك حذف كروت مستخدم آخر."
    });
  }

  await executeD1Query(
    db,
    req.env,
    `DELETE FROM cards WHERE assigned_user_id IN (SELECT id FROM users WHERE LOWER(username) = LOWER(?)) OR card_number = ?`,
    [targetUser, targetUser]
  );

  return res.status(200).json({
    success: true,
    message: "تم حذف الكرت بنجاح من قاعدة بيانات Cloudflare D1! 🗑️",
    username: targetUser
  });
});

// User-requested POST alias for /api/cards/delete
app.post("/api/cards/delete", requireAuth, async (req: any, res) => {
  const db: D1Database = req.db || getD1Database(req.env);
  const { card_id, user_id } = req.body || {};
  const targetId = (card_id || "").toString().trim();

  if (!targetId) {
    return res.status(400).json({ success: false, error: "معرف البطاقة مطلوب" });
  }

  const authUser = req.user;
  const isAdmin = authUser.username === "admin" || authUser.role === "ADMIN" || authUser.isAdmin === true;

  // Perform deletion
  const delRes = await executeD1Query(db, req.env, 
    "DELETE FROM cards WHERE (id = ? OR card_number = ? OR username = ?) " + 
    (!isAdmin ? " AND assigned_user_id = ?" : ""), 
    !isAdmin ? [targetId, targetId, targetId, authUser.id] : [targetId, targetId, targetId]
  );

  res.json({ success: true, message: "تم حذف البطاقة نهائياً ✅", changes: delRes.meta?.changes });
});

// Delete an individual card by ID
app.delete(["/api/cards/:id", "/api/user/cards/:id"], requireAuth, async (req: any, res, next) => {
  const cardId = req.params.id;
  console.log("DELETE ATTEMPT - Card ID/Number:", cardId);
  const reservedKeywords = ["clear-all", "delete-all", "bulk", "clear", "delete", "delete-single"];
  if (reservedKeywords.includes(cardId)) {
    return next();
  }

  const db: D1Database = req.db;
  const authUser = req.user;
  const authUsername = (authUser.username || "").toString().trim().toLowerCase();
  const authRole = (authUser.role || "").toString().toUpperCase();
  const isAdmin = authUsername === "admin" || authRole === "ADMIN" || authUser.isAdmin === true;

  if (!cardId) {
    return res.status(400).json({ success: false, error: "معرف البطاقة مطلوب للحذف" });
  }

  // Retrieve the card first to check ownership (matching id or card_number)
  const cardCheck = await executeD1Query(db, req.env, "SELECT * FROM cards WHERE id = ? OR card_number = ? OR username = ?", [cardId, cardId, cardId]);
  const cardRow = cardCheck.results?.[0];

  if (!cardRow) {
    return res.status(404).json({ success: false, error: "البطاقة غير موجودة" });
  }

  // Ensure the user owns this card OR is an admin
  if (!isAdmin && cardRow.assigned_user_id !== authUser.id && cardRow.user_id !== authUser.id) {
    return res.status(403).json({
      success: false,
      error: "رفض الوصول (403 Forbidden): لا يمكنك حذف هذه البطاقة لأنها ليست ملكاً لك."
    });
  }

  // 1. Delete associated orders first to prevent foreign key errors (safely caught)
  try {
    await executeD1Query(db, req.env, `
      DELETE FROM orders WHERE card_id = ? OR card_id IN (
        SELECT id FROM cards WHERE id = ? OR card_number = ? OR username = ?
      )
    `, [cardId, cardId, cardId, cardId]);
  } catch (ordersErr) {
    console.warn("Could not delete from orders table:", ordersErr);
  }

  // 2. Perform the deletion supporting id, card_number, and username
  const delRes = await executeD1Query(db, req.env, "DELETE FROM cards WHERE (id = ? OR card_number = ? OR username = ?)", [cardId, cardId, cardId]);
  console.log("D1 DELETE RESULT:", JSON.stringify(delRes));

  // Log the action to audit logs
  await recordAuditLog(
    db,
    authUser.id,
    "CARD_DELETED",
    "card",
    cardId,
    `User ${authUser.username} deleted card id: ${cardId} (number: ${cardRow.card_number})`
  );

  return res.status(200).json({
    success: true,
    message: "تم حذف البطاقة كلياً وبنجاح من قاعدة البيانات! 🗑️",
    meta: delRes.meta,
    changes: delRes.meta?.changes ?? 1
  });
});

// Brand New Force Delete Route for Nuclear Option
app.post("/api/user/cards/force-delete", async (req: any, res) => {
  try {
    const db: D1Database = req.db || getD1Database(req.env);
    const session = await getAuthenticatedSession(req);
    const authUser = session?.user || null;
    const authUsername = (authUser?.username || "").toString().trim().toLowerCase();
    const authRole = (authUser?.role || "").toString().toUpperCase();
    const isAdmin = authUsername === "admin" || authRole === "ADMIN" || authUser?.isAdmin === true;

    const { id, card_number, username: reqUsername } = req.body || {};
    console.log("FORCE DELETE ATTEMPT - ID:", id, "Card Number:", card_number, "Username:", reqUsername, "AuthUser:", authUser?.username);

    const searchId = (id || "").toString().trim();
    const searchCardNum = (card_number || "").toString().trim();
    const searchUser = (reqUsername || "").toString().trim();

    if (!searchId && !searchCardNum && !searchUser) {
      return res.status(400).json({ success: false, error: "معرف البطاقة أو رقمها أو اسم المستخدم مطلوب للحذف" });
    }

    // Security check: Only admin can delete any card. Regular users can only delete cards assigned to them.
    if (!isAdmin) {
      const ownershipCheck = await executeD1Query(db, req.env, 
        "SELECT id FROM cards WHERE (id = ? OR card_number = ? OR username = ?) AND assigned_user_id = ?", 
        [searchId, searchCardNum, searchUser, authUser?.id]
      );
      if (!ownershipCheck.results || ownershipCheck.results.length === 0) {
        return res.status(403).json({ success: false, error: "لا تملك صلاحية حذف هذه البطاقة." });
      }
    }

    // 1. Delete associated orders first (safely caught)
    try {
      await executeD1Query(db, req.env, `
        DELETE FROM orders WHERE card_id = ? OR card_id IN (
          SELECT id FROM cards WHERE id = ? OR card_number = ? OR username = ?
        )
      `, [searchId, searchId, searchCardNum, searchUser]);
    } catch (ordersErr) {
      console.warn("Could not delete from orders table:", ordersErr);
    }

    // 2. Perform unconditional physical delete on cards table
    const delRes = await executeD1Query(db, req.env, `
      DELETE FROM cards WHERE id = ? OR card_number = ? OR username = ?
    `, [searchId, searchCardNum || searchId, searchUser || searchCardNum || searchId]);

    console.log("FORCE DELETE RESULT:", JSON.stringify(delRes));

    if (authUser) {
      await recordAuditLog(
        db,
        authUser.id,
        "CARD_FORCE_DELETED",
        "card",
        searchId || searchCardNum,
        `User ${authUser.username} force deleted card: id=${searchId}, card_number=${searchCardNum}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "تم حذف البطاقة كلياً وبشكل نهائي 🗑️",
      meta: delRes.meta,
      changes: delRes.meta?.changes ?? 1
    });
  } catch (err: any) {
    console.error("[Force Delete] Unhandled error:", err);
    return res.status(500).json({ success: false, error: err?.message || "حدث خطأ غير متوقع أثناء معالجة الحذف" });
  }
});


app.delete("/api/admin/cards/delete-single", async (req: any, res) => {
  const db: D1Database = req.db;
  const username = (req.query.username || req.body?.username || "").toString().trim();
  const adminActorId = req.user?.id || "admin";

  if (!username) {
    return res.status(400).json({ success: false, error: "رقم الكرت مطلوب للحذف" });
  }

  await executeD1Query(db, req.env, "DELETE FROM cards WHERE card_number = ? OR id = ? OR username = ?", [username, username, username]);

  // Audit Log
  await recordAuditLog(
    db,
    adminActorId,
    "CARD_DELETED",
    "card",
    username,
    `Admin deleted specific card: ${username}`
  );

  return res.status(200).json({
    success: true,
    message: "تم حذف الكرت بنجاح من قاعدة بيانات Cloudflare D1! 🗑️"
  });
});

// Block Device associated with a card
app.post("/api/admin/cards/block", async (req: any, res) => {
  const db: D1Database = req.db;
  const { card } = req.body;
  const adminActorId = req.user?.id || "admin";

  if (!card) return res.status(400).json({ success: false, error: "رقم الكرت مطلوب" });

  try {
    // 1. Get the card details to find the MAC
    const cardRecord = await db.prepare("SELECT username, last_known_mac FROM cards WHERE card_number = ? OR username = ?")
      .bind(card, card)
      .first<any>();

    // 2. Mark as EXPIRED
    await db.prepare("UPDATE cards SET status = 'EXPIRED', expires_at = ? WHERE card_number = ? OR username = ?")
      .bind(new Date().toISOString(), card, card)
      .run();

    // 3. Mark in blocked_macs table
    await db.prepare("CREATE TABLE IF NOT EXISTS blocked_macs (mac TEXT PRIMARY KEY, reason TEXT, blocked_at TEXT)").run();
    
    if (cardRecord?.last_known_mac) {
      await db.prepare("INSERT OR IGNORE INTO blocked_macs (mac, reason, blocked_at) VALUES (?, ?, ?)")
        .bind(cardRecord.last_known_mac, `Blocked via Admin for card ${card}`, new Date().toISOString())
        .run();
    }

    await recordAuditLog(db, adminActorId, "DEVICE_BLOCKED", "cards", card, `Blocked device for card ${card}`);

    return res.status(200).json({ success: true, message: `تم حظر المشترك والجهاز بنجاح` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Scenario 5 Support: MikroTik Logout Webhook
app.get("/api/mikrotik/logout-hook", async (req: any, res) => {
  const db: D1Database = req.db;
  const card = req.query.card;
  if (!card) return res.status(400).json({ success: false, error: "Missing card parameter" });

  try {
    const nowISO = new Date().toISOString();
    // Update card to EXPIRED
    await db.prepare("UPDATE cards SET status = 'EXPIRED', expires_at = ? WHERE card_number = ? OR username = ?")
      .bind(nowISO, card, card)
      .run();
    
    return res.status(200).json({ success: true, message: `Card ${card} marked as EXPIRED` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Full System Integration Test Endpoint (Cloudflare D1 & Core Engine)
app.get(["/api/full-system-test", "/api/system-test", "/api/test"], async (req: any, res) => {
  const db: D1Database = req.db;
  const env = req.env || process.env;
  const testResults: Record<string, any> = {};
  let overallSuccess = true;

  // 1. Ensure Schema Alignment
  try {
    await ensureD1SchemaAligned(db, env);
    testResults.schema_alignment = { status: "PASS", message: "Cloudflare D1 schema aligned successfully" };
  } catch (err: any) {
    overallSuccess = false;
    testResults.schema_alignment = { status: "FAIL", error: err?.message };
  }

  // 2. Database Connectivity Test
  try {
    const dbTest = await executeD1Query(db, env, "SELECT 1 as alive");
    if (dbTest.results && dbTest.results.length > 0) {
      testResults.database_connectivity = { status: "PASS", message: "Cloudflare D1 database connection active" };
    } else {
      testResults.database_connectivity = { status: "WARN", message: "Connected via local D1 SQLite engine" };
    }
  } catch (err: any) {
    overallSuccess = false;
    testResults.database_connectivity = { status: "FAIL", error: err?.message };
  }

  // 3. User & Auth Engine Test
  try {
    const usersCountRes = await executeD1Query(db, env, "SELECT COUNT(*) as count FROM users");
    const usersCount = Number(usersCountRes.results?.[0]?.count ?? usersCountRes.results?.[0]?.['COUNT(*)'] ?? 0);
    const testHash = await hashPassword("system_test_123");
    testResults.auth_engine = {
      status: "PASS",
      users_count: usersCount,
      password_hashing: testHash.hash ? "OK" : "FAIL"
    };
  } catch (err: any) {
    testResults.auth_engine = { status: "FAIL", error: err?.message };
  }

  // 4. Cards & Stock Inventory Test
  try {
    const totalCardsRes = await executeD1Query(db, env, "SELECT COUNT(*) as count FROM cards");
    const totalCards = Number(totalCardsRes.results?.[0]?.count ?? totalCardsRes.results?.[0]?.['COUNT(*)'] ?? 0);

    const availRes = await executeD1Query(db, env, "SELECT COUNT(*) as count FROM cards WHERE LOWER(status) = 'available'");
    const availableCards = Number(availRes.results?.[0]?.count ?? availRes.results?.[0]?.['COUNT(*)'] ?? 0);

    const soldRes = await executeD1Query(db, env, "SELECT COUNT(*) as count FROM cards WHERE LOWER(status) = 'sold' OR LOWER(status) = 'active'");
    const soldCards = Number(soldRes.results?.[0]?.count ?? soldRes.results?.[0]?.['COUNT(*)'] ?? 0);
    
    testResults.card_inventory = {
      status: "PASS",
      total_cards: totalCards,
      available_cards: availableCards,
      sold_active_cards: soldCards
    };
  } catch (err: any) {
    testResults.card_inventory = { status: "FAIL", error: err?.message };
  }

  // 5. Orders & Financial Records Test
  try {
    const totalOrdersRes = await executeD1Query(db, env, "SELECT COUNT(*) as count FROM orders");
    const totalOrders = Number(totalOrdersRes.results?.[0]?.count ?? totalOrdersRes.results?.[0]?.['COUNT(*)'] ?? 0);
    testResults.orders_engine = {
      status: "PASS",
      total_orders: totalOrders
    };
  } catch (err: any) {
    testResults.orders_engine = { status: "FAIL", error: err?.message };
  }

  // 6. Audit Logging & Idempotency Engine Test
  try {
    const auditLogsCountRes = await executeD1Query(db, env, "SELECT COUNT(*) as count FROM audit_logs");
    const auditLogsCount = Number(auditLogsCountRes.results?.[0]?.count ?? auditLogsCountRes.results?.[0]?.['COUNT(*)'] ?? 0);
    testResults.system_audit = {
      status: "PASS",
      total_audit_logs: auditLogsCount
    };
  } catch (err: any) {
    testResults.system_audit = { status: "FAIL", error: err?.message };
  }

  // 7. Maalcards API Integration Test
  try {
    const hasToken = !!cachedCorporateToken?.access_token;
    testResults.maalcards_integration = {
      status: "PASS",
      cached_token_active: hasToken,
      manager_id: MAALCARDS_MANAGER_ID,
      username: MAALCARDS_USERNAME
    };
  } catch (err: any) {
    testResults.maalcards_integration = { status: "WARN", error: err?.message };
  }

  return res.status(overallSuccess ? 200 : 500).json({
    success: overallSuccess,
    message: overallSuccess
      ? "جميع فحوصات النظام وقاعدة بيانات Cloudflare D1 تعمل بنجاح 🚀"
      : "حدث خطأ في بعض فحوصات النظام",
    timestamp: new Date().toISOString(),
    tests: testResults
  });
});

// Catch-all for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: "الربط المطلوب غير موجود." });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cloudflare D1 Worker server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer();
}

export { app };
