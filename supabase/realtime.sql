-- Run in the Supabase SQL Editor to enable shared live updates.
-- Safe to rerun: tables already in the publication are skipped.
-- Existing row-level security policies still control which rows users can read.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['venues', 'reports', 'reviews', 'votes']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables AS published
      WHERE published.pubname = 'supabase_realtime'
        AND published.schemaname = 'public'
        AND published.tablename = table_name
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END $$;
