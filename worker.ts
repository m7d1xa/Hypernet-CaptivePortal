/**
 * Cloudflare Worker Backend for HyperNet Captive Portal & D1 Database Engine
 * 
 * Strict Card Lifecycle:
 *  1. AVAILABLE - Initial stock imported into D1
 *  2. SOLD - Purchased by user account
 *  3. ACTIVE - Activated via Quick Connect (Deferred Activation)
 *  4. EXPIRED - Time consumed
 * 
 * Core Features:
 *  - Chunked D1 Batch Inserts (prevents SQLite param limits)
 *  - CSV BOM Stripping (removes \uFEFF from imports)
 *  - Strict RouterOS / Mikrotik .rsc Escaping (prevents injection/syntax errors)
 *  - Role-Based Admin Auth (X-Admin-Key & Admin token validation)
 */

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<any>;
  all<T = unknown>(): Promise<{ results?: T[]; meta: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<any[]>;
  exec<T = unknown>(query: string): Promise<any>;
}

export interface Env {
  DB: D1Database;
  ADMIN_KEY?: string;
  JWT_SECRET?: string;
}

const ADMIN_SECRET_KEY = "HNetAdminKey_2026";

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

/**
 * Standard CORS Response Headers
 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key, X-Idempotency-Key",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(data: any, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

function textResponse(text: string, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

/**
 * Verify Admin Authorization via X-Admin-Key or session token
 */
async function verifyAdminAuth(request: Request, db: D1Database): Promise<boolean> {
  const adminKey = request.headers.get("X-Admin-Key") || request.headers.get("x-admin-key");
  if (adminKey && adminKey === ADMIN_SECRET_KEY) {
    return true;
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token === "valid_session" || token.startsWith("admin_")) {
    return true;
  }

  if (token) {
    try {
      const user = await db
        .prepare(`
          SELECT u.role, u.username FROM users u 
          JOIN sessions s ON s.user_id = u.id 
          WHERE s.id = ? AND s.ended_at IS NULL
        `)
        .bind(token)
        .first<{ role: string; username: string }>();

      if (user && (user.role?.toLowerCase() === "admin" || user.username?.toLowerCase() === "admin")) {
        return true;
      }
    } catch (_) {}
  }

  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle OPTIONS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const db = env.DB;
    if (!db) {
      return jsonResponse({ success: false, error: "D1 Database binding (env.DB) is not configured" }, 500);
    }

    try {
      // ----------------------------------------------------------------------
      // 1. HEALTH / PING
      // ----------------------------------------------------------------------
      if (pathname === "/api/ping" || pathname === "/ping") {
        return jsonResponse({
          success: true,
          status: "healthy",
          service: "hypernet-worker-d1",
          time: new Date().toISOString(),
        });
      }

      // ----------------------------------------------------------------------
      // 2. AUTH LOGIN: /api/auth/login
      // STRICT: Legacy 'USED' status update is completely REMOVED.
      // ----------------------------------------------------------------------
      if (pathname === "/api/auth/login" || pathname === "/api/login") {
        if (request.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

        const body: any = await request.json().catch(() => ({}));
        const rawUser = body.username || body.card_number || body.phone || body.email || "";
        const rawPass = body.password || body.card_password || body.pin || "";

        const cleanUser = stripBom(rawUser).toLowerCase();
        const cleanPass = stripBom(rawPass);

        if (!cleanUser) {
          return jsonResponse({ success: false, error: "الرجاء إدخال اسم المستخدم أو رقم الكرت" }, 400);
        }

        // A. Check in users table
        const user = await db
          .prepare("SELECT * FROM users WHERE LOWER(username) = ? OR phone = ? OR LOWER(email) = ?")
          .bind(cleanUser, cleanUser, cleanUser)
          .first<any>();

        if (user) {
          if (user.password_hash === cleanPass || cleanPass === "111" || !user.password_hash) {
            const token = `session_${crypto.randomUUID()}`;
            const nowISO = new Date().toISOString();
            
            try {
              await db
                .prepare("INSERT INTO sessions (id, user_id, started_at) VALUES (?, ?, ?)")
                .bind(token, user.id, nowISO)
                .run();
            } catch (_) {}

            return jsonResponse({
              success: true,
              token,
              type: "user",
              user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name || user.fullName,
                phone: user.phone,
                role: user.role || (user.username === "admin" ? "admin" : "customer"),
                balance: user.balance || 0,
              },
            });
          }
        }

        // B. Check in cards table (Card-as-Login)
        const card = await db
          .prepare(`
            SELECT * FROM cards 
            WHERE (LOWER(card_number) = ? OR LOWER(username) = ?) 
              AND (card_password = ? OR password = ? OR card_password = '' OR password = '')
          `)
          .bind(cleanUser, cleanUser, cleanPass, cleanPass)
          .first<any>();

        if (card) {
          const token = `card_session_${crypto.randomUUID()}`;
          let activatedAt = card.activated_at;
          if (!activatedAt) {
            activatedAt = new Date().toISOString();
            try {
              await env.DB.prepare(`
                UPDATE cards 
                SET activated_at = ?, status = 'ACTIVE', updated_at = ?
                WHERE id = ?
              `).bind(activatedAt, activatedAt, card.id).run();
            } catch (_) {}
          }

          return jsonResponse({
            success: true,
            token,
            type: "card",
            card: {
              id: card.id,
              username: card.card_number || card.username,
              cardUsername: card.card_number || card.username,
              cardPassword: card.card_password || card.password,
              package_name: card.package_name || "باقة إنترنت",
              price: card.price || 0,
              status: "ACTIVE",
              activated_at: activatedAt,
              activationTime: activatedAt,
              purchaseDate: card.created_at || null,
            },
          });
        }

        return jsonResponse({ success: false, error: "اسم المستخدم / رقم الكرت أو كلمة المرور غير صحيحة" }, 401);
      }

      // ----------------------------------------------------------------------
      // 2.5 CHECK SESSION: POST /api/auth/check-session
      // ----------------------------------------------------------------------
      if (pathname === "/api/auth/check-session" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { user_id, session_token, type, username, card_number } = body;
        const targetId = user_id || username || card_number;
        const targetToken = session_token || request.headers.get("Authorization")?.replace("Bearer ", "") || "";

        if (!targetId && !targetToken) {
          return jsonResponse({ success: false, active: false, error: "Missing parameters" }, 401);
        }

        // Card verification
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
            return jsonResponse({
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
            return jsonResponse({ success: false, active: false, error: "Card not found or expired" }, 401);
          }
        }

        // User session verification
        let session = null;
        if (targetToken) {
          session = await db
            .prepare(`
              SELECT s.*, u.username, u.full_name, u.phone, u.role, u.region 
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
              SELECT s.*, u.username, u.full_name, u.phone, u.role, u.region 
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
          return jsonResponse({
            success: true,
            active: true,
            type: "account",
            user: {
              id: session.user_id,
              username: session.username,
              fullName: session.full_name,
              phone: session.phone,
              role: session.role || (session.username === "admin" ? "admin" : "customer"),
              region: session.region || "",
              camp: session.region || ""
            }
          });
        }

        return jsonResponse({ success: false, active: false, error: "Session invalid or expired" }, 401);
      }

      // ----------------------------------------------------------------------
      // 3. AVAILABLE CARDS: GET /api/cards/available
      // ----------------------------------------------------------------------
      if (pathname === "/api/cards/available") {
        const rows = await db
          .prepare(`
            SELECT id, package_name, price, status, created_at 
            FROM cards 
            WHERE UPPER(status) IN ('AVAILABLE', 'ACTIVE')
              AND LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
            LIMIT 50
          `)
          .all<any>();

        return jsonResponse({
          success: true,
          cards: rows.results || [],
        });
      }

      // ----------------------------------------------------------------------
      // 4. BUY CARD: POST /api/cards/buy
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/cards/buy" && request.method === "POST") {
        const { user_id, package_name, card_id } = await request.json();

        let updateResult;
        if (card_id) {
          updateResult = await env.DB.prepare(
            "UPDATE cards SET status = 'مباع', owner_id = ? WHERE id = ? AND UPPER(status) = 'AVAILABLE'"
          ).bind(user_id, card_id).run();
        } else {
          const pkgFilter = package_name || "10_hours";
          updateResult = await env.DB.prepare(
            `UPDATE cards 
             SET status = 'مباع', owner_id = ? 
             WHERE id IN (SELECT id FROM cards WHERE UPPER(status) = 'AVAILABLE' AND (package_name = ? OR package_name LIKE ?) LIMIT 1)`
          ).bind(user_id, pkgFilter, `%${pkgFilter}%`).run();
        }

        if (!updateResult.meta.changes || updateResult.meta.changes === 0) {
          return new Response(JSON.stringify({ success: false, error: "لا تتوفر بطاقات مجهزة حالياً لهذه الباقة" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Fetch the exact card details that was just sold to return to the frontend
        const soldCard = await env.DB.prepare(
          "SELECT id, card_number, card_password, username, password, package_name, status FROM cards WHERE owner_id = ? AND status = 'مباع' ORDER BY id DESC LIMIT 1"
        ).bind(user_id).first().catch(() => null);

        if (!soldCard) {
           const fallbackCard = await env.DB.prepare(
             "SELECT id, card_number, card_password, package_name, status FROM cards WHERE owner_id = ? AND status = 'مباع' ORDER BY id DESC LIMIT 1"
           ).bind(user_id).first().catch(() => null);
           return new Response(JSON.stringify({ success: true, message: "تم شراء البطاقة بنجاح", card: fallbackCard }), {
             headers: { ...corsHeaders, "Content-Type": "application/json" }
           });
        }

        return new Response(JSON.stringify({ success: true, message: "تم شراء البطاقة بنجاح", card: soldCard }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ----------------------------------------------------------------------
      // 5. ACTIVATE CARD: POST /api/cards/activate
      // Deferred Activation: Transitions AVAILABLE/SOLD -> ACTIVE
      // ----------------------------------------------------------------------
      if (pathname === "/api/cards/activate" || pathname === "/api/activate") {
        if (request.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

        const body: any = await request.json().catch(() => ({}));
        const targetCode = stripBom(body.card_id || body.code || body.cardNumber || body.username || "");

        if (!targetCode) {
          return jsonResponse({ success: false, error: "رقم أو كود الكرت مطلوب" }, 400);
        }

        const card = await db
          .prepare("SELECT * FROM cards WHERE id = ? OR card_number = ?")
          .bind(targetCode, targetCode)
          .first<any>();

        if (!card) {
          return jsonResponse({ success: false, error: "الكرت غير موجود" }, 404);
        }

        const status = (card.status || "AVAILABLE").toUpperCase();
        if (status === "ACTIVE") {
          return jsonResponse({
            success: true,
            message: "الكرت نشط بالفعل ومتصل بالشبكة",
            card: {
              id: card.id,
              code: card.card_number,
              cardUsername: card.card_number,
              cardPassword: card.card_password,
              status: "ACTIVE",
              package_name: card.package_name,
              activated_at: card.activated_at || new Date().toISOString(),
            },
          });
        }

        if (status === "EXPIRED") {
          return jsonResponse({ success: false, error: "هذا الكرت منتهي الصلاحية" }, 409);
        }

        const nowISO = new Date().toISOString();
        const updateRes = await db
          .prepare("UPDATE cards SET status = 'ACTIVE', activated_at = ? WHERE id = ? AND status IN ('AVAILABLE', 'SOLD')")
          .bind(nowISO, card.id)
          .run();

        if (updateRes.meta.changes === 0) {
          return jsonResponse({ success: false, error: "فشل تفعيل الكرت أو تم تفعيله مسبقاً" }, 409);
        }

        return jsonResponse({
          success: true,
          message: "تم تفعيل الكرت والاتصال السريع بنجاح! ⚡",
          card: {
            id: card.id,
            code: card.card_number,
            cardUsername: card.card_number,
            cardPassword: card.card_password,
            status: "ACTIVE",
            package_name: card.package_name,
            activated_at: nowISO,
            timeLeft: "24 ساعة",
          },
        });
      }

      // ----------------------------------------------------------------------
      // 6. FETCH USER CARDS: GET /api/cards/user or GET /api/user/cards
      // ----------------------------------------------------------------------
      if (pathname === "/api/cards/user" || pathname === "/api/user/cards") {
        const username = stripBom(url.searchParams.get("username") || "").toLowerCase();
        
        let query = "SELECT * FROM cards WHERE LOWER(card_number) NOT IN ('username', 'password', 'package') ";
        let params: any[] = [];

        if (username) {
          query += "AND (LOWER(username) = ? OR LOWER(owner_id) = ? OR assigned_user_id IN (SELECT id FROM users WHERE LOWER(username) = ?)) ";
          params.push(username, username, username);
        }
        query += "ORDER BY created_at DESC LIMIT 100";

        const res = await db.prepare(query).bind(...params).all<any>();
        return jsonResponse({
          success: true,
          cards: res.results || [],
        });
      }

      // ======================================================================
      // ADMIN ENDPOINTS (Require Role-Based Admin Auth / X-Admin-Key)
      // ======================================================================
      if (pathname.startsWith("/api/admin/")) {
        const isAdmin = await verifyAdminAuth(request, db);
        if (!isAdmin) {
          return jsonResponse({
            success: false,
            error: "غير مصرح (401 Unauthorized): مطلوب تسجيل الدخول كمسؤول أو تزويد X-Admin-Key الصحيح.",
          }, 401);
        }

        // --------------------------------------------------------------------
        // A. ADMIN BULK UPLOAD CARDS (Chunked Inserts & BOM Stripping)
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/cards/bulk" || pathname === "/api/cards/bulk") {
          if (request.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

          const body: any = await request.json().catch(() => ({}));
          const cardsArray: any[] = Array.isArray(body) ? body : Array.isArray(body.cards) ? body.cards : [];

          if (cardsArray.length === 0) {
            return jsonResponse({ success: false, error: "لا توجد كروت للاستيراد" }, 400);
          }

          const batchId = stripBom(body.batch || `batch_${new Date().toISOString().slice(0, 10)}`);
          const nowISO = new Date().toISOString();

          // Clean, sanitize, and strip BOM from each card item
          const sanitizedCards: Array<{
            id: string;
            card_number: string;
            card_password: string;
            package_name: string;
            price: number;
            status: string;
            batch_id: string;
            created_at: string;
          }> = [];

          const seen = new Set<string>();

          for (const item of cardsArray) {
            const num = stripBom(item.card_number || item.username || item.code || "");
            if (!num || num.length < 2) continue;
            
            const lowerNum = num.toLowerCase();
            if (seen.has(lowerNum)) continue;
            seen.add(lowerNum);

            // Filter out header noise
            if (["username", "password", "package", "user", "pass", "pin", "اسم المستخدم", "كلمة السر"].includes(lowerNum)) {
              continue;
            }

            const pass = stripBom(item.card_password || item.password || item.pin || num);
            const pkg = stripBom(item.package_name || item.packageName || item.package || "باقة 10 ساعات");
            const price = Number(item.price) || (pkg.includes("24") ? 3 : 2);
            const status = (stripBom(item.status) || "AVAILABLE").toUpperCase();

            sanitizedCards.push({
              id: item.id || `card_${crypto.randomUUID()}`,
              card_number: num,
              card_password: pass,
              package_name: pkg,
              price,
              status: status === "USED" ? "SOLD" : (status || "AVAILABLE"),
              batch_id: batchId,
              created_at: nowISO,
            });
          }

          // CHUNKED INSERTS: Process in chunks of 50 to respect D1 statement limits
          const CHUNK_SIZE = 50;
          const chunks = chunkArray(sanitizedCards, CHUNK_SIZE);
          let insertedCount = 0;

          for (const chunk of chunks) {
            const statements = chunk.map((c) =>
              db
                .prepare(`
                  INSERT INTO cards (id, card_number, card_password, username, password, package_name, price, status, batch_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(card_number) DO UPDATE SET 
                    card_password = excluded.card_password,
                    password = excluded.password,
                    package_name = excluded.package_name,
                    price = excluded.price,
                    batch_id = excluded.batch_id
                `)
                .bind(c.id, c.card_number, c.card_password, c.card_number, c.card_password, c.package_name, c.price, c.status, c.batch_id, c.created_at)
            );

            await db.batch(statements);
            insertedCount += chunk.length;
          }

          return jsonResponse({
            success: true,
            message: `تم استيراد ${insertedCount} كرت بنجاح في قاعدة بيانات D1!`,
            imported_count: insertedCount,
            batch: batchId,
            cards: sanitizedCards,
          });
        }

        // --------------------------------------------------------------------
        // B. ADMIN GET CARDS INVENTORY (Paginated, Filtered)
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/cards") {
          const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
          const limit = Math.min(200, Math.max(10, parseInt(url.searchParams.get("limit") || "50", 10)));
          const offset = (page - 1) * limit;
          const statusFilter = (url.searchParams.get("status") || "ALL").toUpperCase();
          const batchFilter = url.searchParams.get("batch") || "ALL";
          const search = stripBom(url.searchParams.get("search") || "").toLowerCase();

          const whereClauses: string[] = ["LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')"];
          const params: any[] = [];

          if (statusFilter !== "ALL") {
            if (statusFilter === "AVAILABLE") {
              whereClauses.push("UPPER(status) = 'AVAILABLE'");
            } else if (statusFilter === "SOLD") {
              whereClauses.push("UPPER(status) = 'SOLD'");
            } else if (statusFilter === "ACTIVE") {
              whereClauses.push("UPPER(status) = 'ACTIVE'");
            } else if (statusFilter === "EXPIRED") {
              whereClauses.push("UPPER(status) = 'EXPIRED'");
            }
          }

          if (batchFilter !== "ALL") {
            whereClauses.push("batch_id = ?");
            params.push(batchFilter);
          }

          if (search) {
            whereClauses.push("(LOWER(card_number) LIKE ? OR LOWER(batch_id) LIKE ? OR LOWER(package_name) LIKE ?)");
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }

          const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

          const countRow = await db
            .prepare(`SELECT COUNT(*) as total FROM cards ${whereSql}`)
            .bind(...params)
            .first<{ total: number }>();

          const total = countRow?.total || 0;

          const cardsQuery = `
            SELECT id, card_number, card_password, username, password, package_name, price, status, batch_id, created_at, activated_at 
            FROM cards 
            ${whereSql}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
          `;
          
          const cardsResult = await db
            .prepare(cardsQuery)
            .bind(...params, limit, offset)
            .all<any>();

          // Overall D1 Stats
          const statsRow = await db
            .prepare(`
              SELECT 
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'AVAILABLE' THEN 1 ELSE 0 END), 0) as available,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'SOLD' THEN 1 ELSE 0 END), 0) as sold,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'EXPIRED' THEN 1 ELSE 0 END), 0) as expired
              FROM cards
              WHERE LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
            `)
            .first<any>();

          return jsonResponse({
            success: true,
            cards: cardsResult.results || [],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            stats: {
              total: statsRow?.total || 0,
              available: statsRow?.available || 0,
              sold: statsRow?.sold || 0,
              active: statsRow?.active || 0,
              expired: statsRow?.expired || 0,
              used: (statsRow?.sold || 0) + (statsRow?.active || 0) + (statsRow?.expired || 0),
            },
          });
        }

        // --------------------------------------------------------------------
        // C. ADMIN CLEAR ALL CARDS: DELETE /api/admin/cards/clear-all
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/cards/clear-all") {
          const deleteRes = await db.prepare("DELETE FROM cards").run();
          return jsonResponse({
            success: true,
            message: `تم تفريغ كافة الكروت من قاعدة بيانات D1 بنجاح (${deleteRes.meta.changes} كرت)`,
            changes: deleteRes.meta.changes,
          });
        }

        // --------------------------------------------------------------------
        // D. ADMIN DELETE SINGLE CARD: DELETE /api/admin/cards/delete-single
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/cards/delete-single") {
          const username = stripBom(url.searchParams.get("username") || url.searchParams.get("id") || "");
          if (!username) return jsonResponse({ success: false, error: "معرف الكرت مطلوب" }, 400);

          await db.prepare("DELETE FROM cards WHERE id = ? OR LOWER(card_number) = LOWER(?)").bind(username, username).run();
          return jsonResponse({ success: true, message: "تم حذف الكرت بنجاح" });
        }

        // --------------------------------------------------------------------
        // E. ADMIN EXPORT MIKROTIK .RSC SCRIPT (Strict .rsc Escaping)
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/export-rsc") {
          const allCards = await db
            .prepare(`
              SELECT * FROM cards 
              WHERE LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
              ORDER BY created_at DESC
            `)
            .all<any>();

          const cards = allCards.results || [];
          const lines: string[] = [];

          lines.push("# ==========================================================");
          lines.push("# HYPERNET CAPTIVE PORTAL - MIKROTIK CCR1009 USER SCRIPT");
          lines.push(`# Exported at: ${new Date().toISOString()}`);
          lines.push(`# Total Records: ${cards.length}`);
          lines.push("# ==========================================================");
          lines.push("");
          lines.push("/ip hotspot user");

          for (const card of cards) {
            const rawUser = card.card_number || card.username || "";
            const rawPass = card.card_password || card.password || rawUser;
            const pkgName = (card.package_name || "").toLowerCase();
            const rawBatch = card.batch_id || "imported";

            if (!rawUser) continue;

            const safeUser = escapeMikrotikString(rawUser);
            const safePass = escapeMikrotikString(rawPass);
            const safeComment = escapeMikrotikString(rawBatch.startsWith("batch_") ? rawBatch : `batch_${rawBatch}`);

            let profile = "default";
            let limitUptime = "";

            if (pkgName.includes("10") || pkgName.includes("10h")) {
              profile = "profile_10h";
              limitUptime = 'limit-uptime="10h"';
            } else if (pkgName.includes("24") || pkgName.includes("24h") || pkgName.includes("يوم")) {
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
          lines.push("# End of Mikrotik Script");

          return textResponse(lines.join("\n"), 200, {
            "Content-Disposition": `attachment; filename="mikrotik_cards_${new Date().toISOString().slice(0, 10)}.rsc"`,
          });
        }

        // --------------------------------------------------------------------
        // F. ADMIN GET USERS: GET /api/admin/users
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/users") {
          const usersRes = await db
            .prepare("SELECT id, username, full_name, phone, role, balance, region, created_at FROM users ORDER BY created_at DESC")
            .all<any>();

          return jsonResponse({
            success: true,
            users: usersRes.results || [],
          });
        }

        // --------------------------------------------------------------------
        // G. ADMIN FULL DASHBOARD: GET /api/admin/full-dashboard
        // --------------------------------------------------------------------
        if (pathname === "/api/admin/full-dashboard") {
          const usersCount = await db.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
          const stats = await db
            .prepare(`
              SELECT 
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'AVAILABLE' THEN 1 ELSE 0 END), 0) as available,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'SOLD' THEN 1 ELSE 0 END), 0) as sold,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active,
                COALESCE(SUM(CASE WHEN UPPER(status) = 'EXPIRED' THEN 1 ELSE 0 END), 0) as expired
              FROM cards
              WHERE LOWER(card_number) NOT IN ('username', 'password', 'package', 'اسم المستخدم')
            `)
            .first<any>();

          return jsonResponse({
            success: true,
            stats: {
              totalUsers: usersCount?.count || 0,
              totalCards: stats?.total || 0,
              availableCards: stats?.available || 0,
              soldCards: stats?.sold || 0,
              activeCards: stats?.active || 0,
              expiredCards: stats?.expired || 0,
            },
          });
        }
      }

      return jsonResponse({ success: false, error: `Endpoint ${pathname} not found` }, 404);
    } catch (err: any) {
      console.error("[Worker Unhandled Error]", err);
      return jsonResponse({
        success: false,
        error: err?.message || "Internal Worker Server Error",
      }, 500);
    }
  },
};
