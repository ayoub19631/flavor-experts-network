-- Phase 7E — grants, revoke PUBLIC, keep search history owner-only.
SET LOCAL statement_timeout = '15s';

REVOKE ALL ON FUNCTION public.normalize_search_text(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_search_text(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.search_rank(text, text, text, real, real, boolean, real, real) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_rank(text, text, text, real, real, boolean, real, real) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.member_is_verified(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_is_verified(uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.search_viewer_hidden_author(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_viewer_hidden_author(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.search_query_is_sensitive(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_query_is_sensitive(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.search_parse_tsquery(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_parse_tsquery(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.global_search(text, text[], int, text, text, text, text, text, timestamptz, timestamptz, real, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_search(text, text[], int, text, text, text, text, text, timestamptz, timestamptz, real, timestamptz, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.global_search_suggest(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_search_suggest(text, int) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.unified_search(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unified_search(text, int) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.record_search_event(text, boolean, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_search_event(text, boolean, int, text, boolean) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.clear_my_search_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_my_search_history() TO authenticated;

REVOKE ALL ON FUNCTION public.discover_feed(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discover_feed(text, int) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.touch_member_directory_search() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_events_search() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_market_materials_search() FROM PUBLIC;

COMMENT ON FUNCTION public.global_search IS
  'Public discovery search. Drafts, private publications, hidden posts, blocked authors, and sensitive queries are excluded.';
COMMENT ON TABLE public.search_analytics IS
  'Privacy-preserving search metrics. Stores query hashes, never raw sensitive terms. Owner-only reads.';
