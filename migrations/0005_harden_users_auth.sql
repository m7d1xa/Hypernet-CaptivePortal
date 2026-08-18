-- Migration: 0005_harden_users_auth.sql
-- Harden users table for PBKDF2 hashing and brute-force protection

ALTER TABLE users ADD COLUMN salt TEXT;
ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lockout_until TEXT;

-- Update existing sessions table for expiration if needed
-- (The existing sessions table has started_at and ended_at, we can use started_at for expiration logic)
