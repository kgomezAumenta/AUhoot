-- 1. Add admin_password to settings table (Default: 'admin123')
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'admin123';

-- 2. Add game_status to game_control table (Values: 'OPEN', 'CLOSED')
ALTER TABLE game_control ADD COLUMN IF NOT EXISTS game_status TEXT DEFAULT 'CLOSED';

-- 3. Initialize default values if rows already exist
UPDATE settings SET admin_password = 'admin123' WHERE id = 1;
UPDATE game_control SET game_status = 'CLOSED' WHERE id = 1;
