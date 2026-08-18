-- Migration: 0007_add_package_id.sql
ALTER TABLE cards ADD COLUMN package_id TEXT;
