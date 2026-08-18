import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../server.js";
import { Server } from "http";
import { parseCardImportData } from "../src/utils/cardParser.js";

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;
let server: Server;
let adminToken = "";
const runId = Date.now();

describe("Phase 2: Card Engine & Inventory Management Test Suite", () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, "0.0.0.0", () => {
        resolve();
      });
    });

    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin" })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe("1. File Parser Logic (CSV / TXT / JSON / PDF)", () => {
    it("should parse CSV lines correctly with price and passwords", () => {
      const csvData = `card_number,card_password,price
888001,pass888001,15
888002,pass888002,20
888003,pass888003,15`;

      const result = parseCardImportData(csvData, 10, "batch_test_1");
      expect(result.validCards).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.validCards[0].card_number).toBe("888001");
      expect(result.validCards[0].price).toBe(15);
    });

    it("should automatically map package and price from package column (10 ساعات -> 2 NIS, 24 ساعة -> 3 NIS)", () => {
      const csvDataWithPackages = `card_number,card_password,package
777001,pass777001,10 ساعات
777002,pass777002,24 ساعة
777003,pass777003,10`;

      const result = parseCardImportData(csvDataWithPackages, 0, "batch_pkg_test");
      expect(result.validCards).toHaveLength(3);
      expect(result.validCards[0].package_name).toBe("10 ساعات");
      expect(result.validCards[0].price).toBe(2);

      expect(result.validCards[1].package_name).toBe("24 ساعة");
      expect(result.validCards[1].price).toBe(3);

      expect(result.validCards[2].package_name).toBe("10 ساعات");
      expect(result.validCards[2].price).toBe(2);
    });

    it("should handle JSON array import and detect intra-batch duplicates", () => {
      const jsonCards = [
        { card_number: "999001", card_password: "p1", package: "10 ساعات" },
        { card_number: "999002", card_password: "p2", package: "24 ساعة" },
        { card_number: "999001", card_password: "p1_dup", package: "10 ساعات" }
      ];

      const result = parseCardImportData(jsonCards, 0, "batch_test_2");
      expect(result.validCards).toHaveLength(2);
      expect(result.validCards[0].price).toBe(2);
      expect(result.validCards[1].price).toBe(3);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain("مكرر");
    });
  });

  describe("2. Bulk Import API (/api/admin/cards/import)", () => {
    it("should bulk import cards and reject database duplicates gracefully", async () => {
      const c1 = `CARD_TEST_${runId}_101`;
      const c2 = `CARD_TEST_${runId}_102`;
      const c3 = `CARD_TEST_${runId}_103`;
      const c4 = `CARD_TEST_${runId}_104`;

      const importPayload = {
        batch_name: "دفعة كروت تجريبية A",
        content: `card_number,card_password,package
${c1},PASS_101,10 ساعات
${c2},PASS_102,24 ساعة
${c3},PASS_103,10 ساعات`
      };

      const res1 = await fetch(`${BASE_URL}/api/admin/cards/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(importPayload)
      });

      const body1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(body1.success).toBe(true);
      expect(body1.imported_count).toBe(3);
      expect(body1.batch_id).toBeDefined();

      const duplicatePayload = {
        batch_name: "دفعة كروت مكررة B",
        content: `card_number,card_password,package
${c2},PASS_102,24 ساعة
${c4},PASS_104,10 ساعات`
      };

      const res2 = await fetch(`${BASE_URL}/api/admin/cards/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(duplicatePayload)
      });

      const body2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(body2.success).toBe(true);
      expect(body2.imported_count).toBe(1);
      expect(body2.failed_count).toBe(1);
      expect(body2.errors[0].reason).toContain("موجود مسبقاً");
    });
  });

  describe("3. Card Status Lifecycle Transition (/api/admin/cards/:id/status)", () => {
    it("should safely transition card status and track timestamps", async () => {
      const cState = `CARD_STATE_${runId}_001`;
      await fetch(`${BASE_URL}/api/admin/cards/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          batch_name: "دفعة اختبار الحالة",
          content: `${cState},PASS_STATE,10 ساعات`
        })
      });

      const blockRes = await fetch(`${BASE_URL}/api/admin/cards/${cState}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: "BLOCKED" })
      });

      const blockBody = await blockRes.json();
      expect(blockRes.status).toBe(200);
      expect(blockBody.success).toBe(true);
      expect(blockBody.card.status).toBe("BLOCKED");

      const unblockRes = await fetch(`${BASE_URL}/api/admin/cards/${cState}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: "AVAILABLE" })
      });

      const unblockBody = await unblockRes.json();
      expect(unblockRes.status).toBe(200);
      expect(unblockBody.card.status).toBe("AVAILABLE");
    });
  });

  describe("4. Card Engine Admin Listing & Validation", () => {
    it("should return paginated list and accurate inventory stats", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/cards?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.cards)).toBe(true);
      expect(body.stats).toBeDefined();
      expect(body.stats.total).toBeGreaterThan(0);
    });

    it("should validate card existence and readiness", async () => {
      const valRes = await fetch(`${BASE_URL}/api/admin/cards/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ card_number: `CARD_TEST_${runId}_101` })
      });

      const valBody = await valRes.json();
      expect(valRes.status).toBe(200);
      expect(valBody.success).toBe(true);
      expect(valBody.valid).toBe(true);
      expect(valBody.card.card_number).toBe(`CARD_TEST_${runId}_101`);
    });
  });
});
