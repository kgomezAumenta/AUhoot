-- Ensure the publication exists (standard in Supabase)
-- (We cannot create it if it exists, but we can alter it)

-- 1. Force Enable Replication for the tables
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.game_control REPLICA IDENTITY FULL;

-- 2. Add tables to the publication
-- We use drop and add to ensure it's clean, or just add. 
-- 'supabase_realtime' is the default publication name for client-side listening.

-- Try to add (ignore if already added, but standard SQL throws error)
-- Interactive safe way:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'game_control') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_control;
  END IF;
END
$$;
