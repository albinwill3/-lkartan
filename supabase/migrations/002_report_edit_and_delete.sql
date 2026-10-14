-- Run after migration 001. Safe to rerun.
BEGIN;

GRANT UPDATE, DELETE ON public.reports TO authenticated;

-- Migration 001 already restricts these operations to the report owner.
-- Restrictive policies also protect against any other permissive policies.
DROP POLICY IF EXISTS reports_update_owner_guard ON public.reports;
CREATE POLICY reports_update_owner_guard ON public.reports AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS reports_delete_owner_guard ON public.reports;
CREATE POLICY reports_delete_owner_guard ON public.reports AS RESTRICTIVE
FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Cascades delete dependent rows atomically, including other users' votes and
-- reviews, without allowing the report owner to delete those rows directly.
DO $$
DECLARE
  existing_constraint record;
BEGIN
  FOR existing_constraint IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'f' AND confrelid = 'public.reports'::regclass
      AND conrelid IN ('public.votes'::regclass, 'public.reviews'::regclass)
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = conrelid AND attname = 'report_id')
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', existing_constraint.table_name, existing_constraint.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.votes ADD CONSTRAINT votes_report_id_fkey
FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_report_id_fkey
FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;

COMMIT;
