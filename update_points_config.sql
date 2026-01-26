-- Add points configuration columns (Default: Base 1000, Factor 10)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS points_base INT DEFAULT 1000;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS points_factor INT DEFAULT 10;
