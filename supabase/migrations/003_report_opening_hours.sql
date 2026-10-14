-- Run after migrations 001 and 002 to retain the opening-hours feature.
-- Existing opening_hours values survive the table rename in migration 001.
BEGIN;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS opening_hours jsonb;

CREATE OR REPLACE FUNCTION public.create_venue_with_report(
  venue_name text,
  venue_lat double precision,
  venue_lng double precision,
  report_data jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  new_venue_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to add a venue';
  END IF;
  IF COALESCE((report_data->>'price')::numeric, 0) <= 0
    OR COALESCE((report_data->>'volym')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'Price and volume must be greater than zero';
  END IF;

  INSERT INTO public.venues (name, lat, lng, user_id)
  VALUES (btrim(venue_name), venue_lat, venue_lng, auth.uid())
  RETURNING id INTO new_venue_id;

  INSERT INTO public.reports (
    venue_id, price, volym, "kannaPrice", guinness, "beerType", temperature, rating, user_id, opening_hours
  ) VALUES (
    new_venue_id,
    (report_data->>'price')::numeric,
    (report_data->>'volym')::numeric,
    COALESCE((report_data->>'kannaPrice')::numeric, 0),
    COALESCE((report_data->>'guinness')::boolean, false),
    COALESCE(report_data->>'beerType', ''),
    (report_data->>'temperature')::integer,
    (report_data->>'rating')::integer,
    auth.uid(),
    NULLIF(report_data->'opening_hours', 'null'::jsonb)
  );
  RETURN new_venue_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
