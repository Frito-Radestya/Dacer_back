-- Migration: add store_id to customers and promotions
-- Date: 2025-12-10

-- Add store_id column to customers, referencing stores(id)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL;

-- Add store_id column to promotions, referencing stores(id)
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL;

-- Optionally, set store_id for existing rows here if needed, for example:
-- UPDATE customers SET store_id = 1 WHERE store_id IS NULL;
-- UPDATE promotions SET store_id = 1 WHERE store_id IS NULL;
