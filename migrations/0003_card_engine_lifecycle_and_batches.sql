-- Migration: 0003_card_engine_lifecycle_and_batches.sql
-- Card Engine Lifecycle, Batches, and Performance Indexing

-- 1. Create Card Batches Table for Grouped Imports and Auditing
CREATE TABLE IF NOT EXISTS card_batches (
  id TEXT PRIMARY KEY,
  batch_name TEXT NOT NULL,
  total_cards INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add reserved_at timestamp to cards table
ALTER TABLE cards ADD COLUMN reserved_at TEXT;

-- 3. Indexes for Card Lifecycle Filtering and Search Acceleration
CREATE INDEX IF NOT EXISTS idx_cards_status_batch ON cards(status, batch_id);
CREATE INDEX IF NOT EXISTS idx_cards_created ON cards(created_at);
CREATE INDEX IF NOT EXISTS idx_card_batches_created ON card_batches(created_at);
