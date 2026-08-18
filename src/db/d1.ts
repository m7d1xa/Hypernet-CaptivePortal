import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    duration?: number;
    changes?: number;
    last_row_id?: number;
    served_by?: string;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

class NodeD1PreparedStatement implements D1PreparedStatement {
  private dbContainer: NodeD1Database;
  private query: string;
  private params: any[] = [];

  constructor(dbContainer: NodeD1Database, query: string, params: any[] = []) {
    this.dbContainer = dbContainer;
    this.query = query;
    this.params = params;
  }

  bind(...values: any[]): D1PreparedStatement {
    const sanitizedValues = values.map(v => (v === undefined ? null : v));
    return new NodeD1PreparedStatement(this.dbContainer, this.query, sanitizedValues);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const db = this.dbContainer.getRawDb();
      const stmt = db.prepare(this.query);
      const row = stmt.get(...this.params) as Record<string, any> | undefined;
      if (!row) return null;
      if (colName) return (row[colName] ?? null) as T;
      return row as T;
    } catch (err: any) {
      if (this.dbContainer.isCorruptionError(err)) {
        console.warn("[D1 Adapter] Detected corruption in first(), auto-recovering...", err?.message);
        this.dbContainer.recoverAndReset(err?.message);
        const freshDb = this.dbContainer.getRawDb();
        const retryStmt = freshDb.prepare(this.query);
        const row = retryStmt.get(...this.params) as Record<string, any> | undefined;
        if (!row) return null;
        if (colName) return (row[colName] ?? null) as T;
        return row as T;
      }
      console.error("[D1 Adapter] Query error in first():", err, "Query:", this.query, "Params:", this.params);
      throw err;
    }
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    try {
      const db = this.dbContainer.getRawDb();
      const stmt = db.prepare(this.query);
      const rows = stmt.all(...this.params) as T[];
      return {
        results: rows || [],
        success: true,
        meta: { changes: 0, duration: 0 }
      };
    } catch (err: any) {
      if (this.dbContainer.isCorruptionError(err)) {
        console.warn("[D1 Adapter] Detected corruption in all(), auto-recovering...", err?.message);
        this.dbContainer.recoverAndReset(err?.message);
        const freshDb = this.dbContainer.getRawDb();
        const retryStmt = freshDb.prepare(this.query);
        const rows = retryStmt.all(...this.params) as T[];
        return {
          results: rows || [],
          success: true,
          meta: { changes: 0, duration: 0 }
        };
      }
      console.error("[D1 Adapter] Query error in all():", err, "Query:", this.query, "Params:", this.params);
      throw err;
    }
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    try {
      const db = this.dbContainer.getRawDb();
      const stmt = db.prepare(this.query);
      const info = stmt.run(...this.params);
      return {
        results: [],
        success: true,
        meta: {
          changes: typeof info.changes === 'bigint' ? Number(info.changes) : (info.changes ?? 0),
          last_row_id: typeof info.lastInsertRowid === 'bigint' ? Number(info.lastInsertRowid) : (info.lastInsertRowid ?? 0),
          duration: 0
        }
      };
    } catch (err: any) {
      if (this.dbContainer.isCorruptionError(err)) {
        console.warn("[D1 Adapter] Detected corruption in run(), auto-recovering...", err?.message);
        this.dbContainer.recoverAndReset(err?.message);
        const freshDb = this.dbContainer.getRawDb();
        const retryStmt = freshDb.prepare(this.query);
        const info = retryStmt.run(...this.params);
        return {
          results: [],
          success: true,
          meta: {
            changes: typeof info.changes === 'bigint' ? Number(info.changes) : (info.changes ?? 0),
            last_row_id: typeof info.lastInsertRowid === 'bigint' ? Number(info.lastInsertRowid) : (info.lastInsertRowid ?? 0),
            duration: 0
          }
        };
      }
      console.error("[D1 Adapter] Query error in run():", err, "Query:", this.query, "Params:", this.params);
      throw err;
    }
  }

  async raw<T = unknown>(): Promise<T[]> {
    const res = await this.all<T>();
    return res.results;
  }
}

class NodeD1Database implements D1Database {
  private db!: DatabaseSync;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.initDatabase();
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }

  public isCorruptionError(err: any): boolean {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    const str = (err.errstr || "").toLowerCase();
    return (
      msg.includes("malformed") ||
      msg.includes("corrupt") ||
      msg.includes("disk image") ||
      msg.includes("not a database") ||
      str.includes("malformed") ||
      str.includes("corrupt") ||
      err.code === "ERR_SQLITE_ERROR"
    );
  }

  private initDatabase() {
    try {
      this.db = new DatabaseSync(this.dbPath);
      // Optimize pragmas for crash resilience
      try {
        this.db.exec("PRAGMA journal_mode = WAL;");
        this.db.exec("PRAGMA busy_timeout = 5000;");
        this.db.exec("PRAGMA synchronous = NORMAL;");
      } catch (_) {}

      // Verify integrity on startup
      try {
        const checkStmt = this.db.prepare("PRAGMA quick_check;");
        const checkResult = checkStmt.get() as any;
        const checkVal = checkResult ? Object.values(checkResult)[0] : "ok";
        if (checkVal !== "ok") {
          throw new Error(`Integrity check failed: ${checkVal}`);
        }
      } catch (checkErr: any) {
        if (this.isCorruptionError(checkErr)) {
          throw checkErr;
        }
      }

      this.initSchema();
    } catch (err: any) {
      if (this.isCorruptionError(err)) {
        console.warn("[D1 Adapter] Resetting malformed database file:", this.dbPath);
        this.recoverAndReset(err.message);
      } else {
        throw err;
      }
    }
  }

  public recoverAndReset(reason?: string) {
    console.warn(`[D1 Adapter] Performing clean database recovery. Reason: ${reason || "Corrupted image"}`);
    try {
      try {
        this.db?.close?.();
      } catch (_) {}

      if (fs.existsSync(this.dbPath)) fs.unlinkSync(this.dbPath);
      if (fs.existsSync(this.dbPath + "-shm")) fs.unlinkSync(this.dbPath + "-shm");
      if (fs.existsSync(this.dbPath + "-wal")) fs.unlinkSync(this.dbPath + "-wal");
      if (fs.existsSync(this.dbPath + "-journal")) fs.unlinkSync(this.dbPath + "-journal");
    } catch (cleanErr) {
      console.error("[D1 Adapter] Error cleaning files during reset:", cleanErr);
    }

    try {
      this.db = new DatabaseSync(this.dbPath);
      try {
        this.db.exec("PRAGMA journal_mode = WAL;");
        this.db.exec("PRAGMA busy_timeout = 5000;");
        this.db.exec("PRAGMA synchronous = NORMAL;");
      } catch (_) {}
      this.initSchema();
      console.log("[D1 Adapter] Database cleanly recovered and initialized.");
    } catch (recreateErr) {
      console.error("[D1 Adapter] Fatal error during database recreation:", recreateErr);
    }
  }

  private initSchema() {
    const migrationsDir = path.join(process.cwd(), "migrations");
    if (fs.existsSync(migrationsDir)) {
      try {
        const files = fs.readdirSync(migrationsDir)
          .filter(f => f.endsWith(".sql"))
          .sort();
        for (const file of files) {
          const sqlPath = path.join(migrationsDir, file);
          const sql = fs.readFileSync(sqlPath, "utf8");
          const statements = sql
            .split(";")
            .map(s => s.trim())
            .filter(Boolean);
          for (const stmt of statements) {
            try {
              this.db.exec(stmt);
            } catch (err: any) {
              if (!err.message?.includes("duplicate column name") && !err.message?.includes("already exists")) {
                console.error("[D1 Adapter] Migration statement error:", err.message, "in statement:", stmt);
              }
            }
          }
        }
      } catch (err) {
        console.error("[D1 Adapter] Migration execution error:", err);
      }
    } else {
      console.warn("[D1 Adapter] Migrations directory not found at:", migrationsDir);
    }

    // Seed default test card 111 / 111
    try {
      this.db.exec(`
        INSERT INTO cards (id, package_id, username, password, card_number, card_password, status, created_at)
        VALUES ('test-card-111', 'demo-package', '111', '111', '111', '111', 'AVAILABLE', CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO NOTHING;
      `);
    } catch (_) {}
  }

  prepare(query: string): D1PreparedStatement {
    return new NodeD1PreparedStatement(this, query);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      const res = await stmt.run<T>();
      results.push(res);
    }
    return results;
  }

  async exec(query: string): Promise<D1ExecResult> {
    const start = Date.now();
    try {
      this.db.exec(query);
      return {
        count: 1,
        duration: Date.now() - start
      };
    } catch (err: any) {
      if (this.isCorruptionError(err)) {
        console.warn("[D1 Adapter] Detected corruption in exec(), auto-recovering...", err?.message);
        this.recoverAndReset(err?.message);
        this.db.exec(query);
        return {
          count: 1,
          duration: Date.now() - start
        };
      }
      throw err;
    }
  }
}

const localDbPath = path.join(process.cwd(), ".kv_storage", "hypernet.sqlite");
let localD1Instance: D1Database | null = null;

export function getD1Database(env?: any): D1Database {
  if (env && env.DB && typeof env.DB.prepare === "function") {
    return env.DB as D1Database;
  }
  if (env && env.D1 && typeof env.D1.prepare === "function") {
    return env.D1 as D1Database;
  }
  if (!localD1Instance) {
    localD1Instance = new NodeD1Database(localDbPath);
  }
  return localD1Instance;
}

