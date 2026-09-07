-- Phase 7F — widen search_rank numeric types, pin helper search_path, revoke leftover anon grants.
-- Corrective after 20260908150000. Additive. No hard deletes. No user-data changes.
SET LOCAL statement_timeout = '15s';

DROP FUNCTION IF EXISTS public.search_rank(text, text, text, real, real, boolean, real, real);

CREATE FUNCTION public.search_rank(
  p_norm_query text,
  p_norm_title text,
  p_norm_haystack text,
  p_fts double precision,
  p_trgm double precision,
  p_verified boolean,
  p_quality double precision,
  p_fresh double precision
) RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT
    (CASE WHEN p_norm_title IS NOT NULL AND p_norm_title = p_norm_query THEN 1000 ELSE 0 END)::real
    + (CASE
        WHEN p_norm_title IS NOT NULL AND p_norm_query IS NOT NULL
          AND p_norm_title LIKE p_norm_query || '%'
          AND p_norm_title <> p_norm_query
        THEN 600 ELSE 0
      END)::real
    + (CASE
        WHEN p_norm_haystack IS NOT NULL AND p_norm_query IS NOT NULL
          AND p_norm_haystack LIKE '%' || p_norm_query || '%'
          AND p_norm_title IS DISTINCT FROM p_norm_query
        THEN 300 ELSE 0
      END)::real
    + LEAST(COALESCE(p_fts, 0) * 80.0, 200.0)
    + LEAST(COALESCE(p_trgm, 0) * 50.0, 40.0)
    + (CASE WHEN COALESCE(p_verified, false) THEN 40 ELSE 0 END)::real
    + (LEAST(GREATEST(COALESCE(p_quality, 0), 0), 1) * 30.0)
    + (LEAST(GREATEST(COALESCE(p_fresh, 0), 0), 1) * 15.0);
$$;

REVOKE ALL ON FUNCTION public.search_rank(text, text, text, double precision, double precision, boolean, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_rank(text, text, text, double precision, double precision, boolean, double precision, double precision) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.normalize_search_text(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT lower(
    translate(
      regexp_replace(coalesce(p_input, ''), '[ـًٌٍَُِّْ]', '', 'g'),
      'أإآٱىةؤئ',
      'اااايهوي'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.normalize_search_text(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_search_text(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_query_is_sensitive(p_query text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT
    coalesce(p_query, '') ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    OR coalesce(p_query, '') ~ '\d{6,}';
$$;

REVOKE ALL ON FUNCTION public.search_query_is_sensitive(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_query_is_sensitive(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.clear_my_search_history() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_my_search_history() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_my_search_history() TO authenticated;

REVOKE ALL ON FUNCTION public.touch_member_directory_search() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_member_directory_search() FROM anon;
REVOKE ALL ON FUNCTION public.touch_member_directory_search() FROM authenticated;

REVOKE ALL ON FUNCTION public.touch_events_search() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_events_search() FROM anon;
REVOKE ALL ON FUNCTION public.touch_events_search() FROM authenticated;

REVOKE ALL ON FUNCTION public.touch_market_materials_search() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_market_materials_search() FROM anon;
REVOKE ALL ON FUNCTION public.touch_market_materials_search() FROM authenticated;
