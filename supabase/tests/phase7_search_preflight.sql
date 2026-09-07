-- Phase 7 read-only preflight. No writes. No migration history changes.
SELECT
  to_regprocedure('public.global_search(text,text[],int,text,text,text,text,text,timestamptz,timestamptz,real,timestamptz,text,text)') IS NOT NULL AS global_search,
  to_regprocedure('public.global_search_suggest(text,int)') IS NOT NULL AS suggest,
  to_regprocedure('public.discover_feed(text,int)') IS NOT NULL AS discover,
  to_regprocedure('public.normalize_search_text(text)') IS NOT NULL AS normalize,
  to_regclass('public.search_analytics') IS NOT NULL AS analytics,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'member_directory_data_search_vec_idx'
  ) AS member_fts_index;
