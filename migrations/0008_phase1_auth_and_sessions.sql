-- Migration: 0008_phase1_auth_and_sessions.sql
-- Phase 1: Auth & Sessions Schema Hardening

-- 1. Ensure columns exist on users table
ALTER TABLE users ADD COLUMN last_known_mac TEXT;
ALTER TABLE users ADD COLUMN last_known_ip TEXT;
ALTER TABLE users ADD COLUMN phone_change_count INTEGER DEFAULT 0;

-- 2. Clean up seed duplicate phone numbers if any existed
UPDATE users SET phone = '0592360836' WHERE username = 'admin' AND (phone = '0590000000' OR phone IS NULL);
UPDATE users SET phone = '0591111111' WHERE username = '111' AND (phone = '0590000000' OR phone IS NULL);

-- 3. Ensure UNIQUE index on users.phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone);

-- 4. Ensure sessions columns exist
ALTER TABLE sessions ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sessions ADD COLUMN expires_at TEXT;

-- 5. Create indexes on sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

