# Supabase

Supabase provides authentication, database storage, and realtime updates for Olkartan.

- `venues`: bars with stable IDs, names, and map coordinates.
- `reports`: user-submitted prices and beer details linked to a bar.
- `votes` and `reviews`: feedback linked to individual reports.

Users sign in through Supabase Auth. Row Level Security must restrict report
editing and deletion to the report owner. Enable Realtime on all four tables
so changes appear for other users without reloading.

The frontend connects through `frontend/src/lib/supabase.ts`, using
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `frontend/.env`.

The database is hosted in Supabase; this folder contains documentation only.
