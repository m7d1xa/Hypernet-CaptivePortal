-- Migration: 0004_add_package_name_to_cards.sql
-- Add package_name column to cards table for automatic package mapping

ALTER TABLE cards ADD COLUMN package_name TEXT;
