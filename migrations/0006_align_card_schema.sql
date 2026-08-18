-- Migration: 0006_align_card_schema.sql
-- Explicitly align the cards table with the requested schema columns

ALTER TABLE cards ADD COLUMN username TEXT;
ALTER TABLE cards ADD COLUMN password TEXT;
ALTER TABLE cards ADD COLUMN duration_hours INTEGER;
ALTER TABLE cards ADD COLUMN user_id TEXT;
ALTER TABLE cards ADD COLUMN purchased_at TEXT;
