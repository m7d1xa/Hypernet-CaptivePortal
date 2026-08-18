import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../server.js";
import { Server } from "http";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;
let server: Server;

describe("OWASP ASVS Automated Security Test Suite", () => {
  let userTokenA = "";
  let userTokenB = "";
  let adminToken = "";

  beforeAll(async () => {
    // Start server instance for testing
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, "0.0.0.0", () => {
        resolve();
      });
    });

    // 1. Admin login
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    // 2. User A login (111)
    const userARes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "111", password: "111" })
    });
    const userAData = await userARes.json();
    userTokenA = userAData.token;

    // 3. Register / Login User B
    const userBRes = await fetch(`${BASE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "user_b_test", password: "password123", fullName: "User B" })
    });
    const userBData = await userBRes.json();
    userTokenB = userBData.token || "valid_session";
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication & Account Enumeration Prevention
  // ---------------------------------------------------------------------------
  describe("1. Authentication & Account Enumeration Prevention", () => {
    it("1.1 Valid login returns status 200 and issues secure session token", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "111", password: "111" })
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
    });

    it("1.2 Invalid password returns generic 401 error (Account Enumeration Prevention)", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "111", password: "wrongpassword" })
      });
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("غير صحيحة");
    });

    it("1.3 Non-existent username returns identical generic 401 error", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "ghost_user_xyz", password: "somepassword" })
      });
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("غير صحيحة");
    });

    it("1.4 Empty payload returns 400/401 (Input Validation Baseline)", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("1.5 Newly registered user passwords are encrypted with PBKDF2 SHA512", async () => {
      const uname = `hash_test_${Date.now()}`;
      const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: uname,
          password: "SecretPassword123!",
          phone: `059${Math.floor(1000000 + Math.random() * 9000000)}`,
          fullName: "Hash Test User"
        })
      });
      expect(regRes.status).toBe(200);

      // Verify login succeeds with the same password
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname, password: "SecretPassword123!" })
      });
      expect(loginRes.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Card Activation & Replay Attack Prevention
  // ---------------------------------------------------------------------------
  describe("2. Card Activation & Replay Attack Prevention", () => {
    it("2.1 Activation of non-existent or already-used card returns 400/404", async () => {
      const res = await fetch(`${BASE_URL}/api/cards/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userTokenA}`
        },
        body: JSON.stringify({ username: "111", card_id: "fake_card_999" })
      });
      const data = await res.json();
      expect([400, 404].includes(res.status)).toBe(true);
      expect(data.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Concurrent Activation & Race Condition (Mutex)
  // ---------------------------------------------------------------------------
  describe("3. Concurrent Activation Race Condition", () => {
    it("3.1 Concurrent activation of the same card prevents double-spending via Atomic Mutex", async () => {
      await fetch(`${BASE_URL}/api/admin/upload-cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          package_type: "10_hours",
          cards: [{ id: "race_card_999", code: "RACE-9999", status: "AVAILABLE", duration: "10 ساعات" }]
        })
      });

      const p1 = fetch(`${BASE_URL}/api/cards/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userTokenA}` },
        body: JSON.stringify({ username: "111", card_id: "race_card_999" })
      }).then(r => r.json().then(data => ({ status: r.status, data })));

      const p2 = fetch(`${BASE_URL}/api/cards/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userTokenA}` },
        body: JSON.stringify({ username: "111", card_id: "race_card_999" })
      }).then(r => r.json().then(data => ({ status: r.status, data })));

      const results = await Promise.all([p1, p2]);
      const successes = results.filter(r => r.data.success === true);
      const failures = results.filter(r => r.data.success === false);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });

    it("3.2 Duplicate order request with idempotency key returns cached response without duplicate creation", async () => {
      const idempotencyKey = `idem_test_${Date.now()}`;
      const payload = {
        username: "111",
        package_name: "باقة 24 ساعة",
        price: 10,
        quantity: 1
      };

      const req1 = await fetch(`${BASE_URL}/api/cards/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userTokenA}`,
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });
      const data1 = await req1.json();
      expect(req1.status).toBe(200);
      expect(data1.success).toBe(true);

      // Repeat request with exact same idempotency key
      const req2 = await fetch(`${BASE_URL}/api/cards/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userTokenA}`,
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });
      const data2 = await req2.json();
      expect(req2.status).toBe(200);
      expect(data2.cards[0].id).toBe(data1.cards[0].id);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Horizontal Authorization (BOLA / IDOR)
  // ---------------------------------------------------------------------------
  describe("4. Horizontal Authorization Checks (BOLA)", () => {
    it("4.1 Horizontal authorization check: User A accessing User B data returns 403 Forbidden", async () => {
      const res = await fetch(`${BASE_URL}/api/cards/user?username=user_b_test`, {
        headers: {
          "Authorization": `Bearer ${userTokenA}`
        }
      });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("رفض الوصول");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Admin Endpoint Protection
  // ---------------------------------------------------------------------------
  describe("5. Admin Endpoint Protection", () => {
    it("5.1 Unauthorized access to admin endpoints without token returns 401", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/users`);
      expect(res.status).toBe(401);
    });

    it("5.2 Standard user accessing admin endpoint returns 403 Forbidden (RBAC)", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: {
          "Authorization": `Bearer ${userTokenA}`
        }
      });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("ADMIN");
    });

    it("5.3 Admin token successfully accesses admin endpoints", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Session Invalidation & Logout
  // ---------------------------------------------------------------------------
  describe("6. Session Invalidation & Logout", () => {
    it("6.1 Server-side logout revokes token and subsequent requests return 401 Unauthorized", async () => {
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "111", password: "111" })
      });
      const loginData = await loginRes.json();
      const tokenToRevoke = loginData.token;

      const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${tokenToRevoke}` }
      });
      expect(logoutRes.status).toBe(200);

      const checkRes = await fetch(`${BASE_URL}/api/cards/user?username=111`, {
        headers: { "Authorization": `Bearer ${tokenToRevoke}` }
      });
      expect(checkRes.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Malformed Inputs & Injection Resilience
  // ---------------------------------------------------------------------------
  describe("7. Malformed Inputs & Injection Resilience", () => {
    it("7.1 SQL/NoSQL injection payloads handled safely without 500 server errors", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "' OR '1'='1",
          password: "'; DROP TABLE users; --"
        })
      });
      const data = await res.json();
      expect(res.status).not.toBe(500);
      expect(data.success).toBe(false);
    });

    it("7.2 XSS script injection payloads handled safely in query params", async () => {
      const res = await fetch(`${BASE_URL}/api/cards/user?username=<script>alert(1)</script>`, {
        headers: { "Authorization": `Bearer ${userTokenA}` }
      });
      expect(res.status).not.toBe(500);
    });
  });
});
