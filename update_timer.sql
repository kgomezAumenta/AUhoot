-- Add question_timer column to settings table (Default: 20 seconds)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS question_timer INT DEFAULT 20;
