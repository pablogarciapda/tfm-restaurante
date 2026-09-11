-- Add reservas to the supabase_realtime publication so a local POS agent
-- can listen for INSERTs (new web reservations) and print tickets.
-- Idempotent: skips if already a member.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reservas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservas;
  END IF;
END $$;
