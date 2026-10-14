# Venue identity migration

For editing and deleting your own reports, also run
`migrations/002_report_edit_and_delete.sql` after migration 001.
It grants authenticated update/delete access under owner-only RLS and makes
report deletion cascade to its votes and reviews. The bar itself is retained.
Editing keeps existing votes and reviews. Migration 002 is safe to rerun.

The updated frontend needs `migrations/001_separate_venues_and_reports.sql`.
Run the entire file once in Supabase SQL Editor, then reload the frontend.
Do not run it against an already migrated database.

The migration runs in a transaction. It renames the existing `venues` table
to `reports`, preserving IDs, rows, and the foreign keys used by reviews/votes.
Their `venue_id` columns become `report_id`. A new `venues` table stores stable
bar identities and canonical coordinates; each report references it through
`reports.venue_id`. Legacy name/coordinate columns remain as snapshots.

Each existing report initially gets a separate venue. Existing rows cannot be
reliably matched automatically. After verifying that two entries are the same
physical bar, link their reports explicitly in SQL Editor (replace the IDs):

```sql
UPDATE public.reports SET venue_id = 123 WHERE venue_id = 456;
DELETE FROM public.venues WHERE id = 456
  AND NOT EXISTS (SELECT 1 FROM public.reports WHERE venue_id = 456);
```

This preserves report IDs, votes, and reviews. Never merge entries just because
their names match. The retained venue's coordinates remain unchanged.

New reports use the existing bar's "Rapportera nytt pris" button. Creating a
new bar uses `create_venue_with_report`, an atomic, authenticated RPC that obeys
row-level security. The migration replaces report policies with public reads
and owner-only writes, and adds public reads/authenticated owner inserts for
venues. Existing vote/review policies are retained. Any custom SQL functions
outside this repository that refer to the old table/columns need updating.

The migration enables Realtime for venues, reports, reviews, and votes. Old
reports without timestamps keep an unknown date; new reports get `created_at`.

## Verification

1. Check that report, review, and vote counts are unchanged after migration.
2. Add two bars with the same name at different locations; they remain separate.
3. Open one bar and submit a new price; it shares the existing marker and bar ID.
4. Keep the bar panel open in a second browser session. New reports and votes
   should appear without reloading, and the marker must not move.
5. Confirm existing reviews and votes still belong to the original reports.

Run `npm.cmd run build` and `npm.cmd test` from the `frontend` directory (Node 24).
The tests check stable identities and run the migration against local PostgreSQL
via the development-only PGlite dependency. They do not modify Supabase.
