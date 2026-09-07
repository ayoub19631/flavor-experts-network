-- Phase 6G — migration-chain hardening (corrective, additive).
-- Does not drop tables, rows, or storage objects. Does not edit 6A–6F files.
-- Closes Phase 6 advisor findings that this release introduced:
--   1) mutable search_path on helper functions
--   2) PUBLIC/anon EXECUTE leftover on author/staff SECURITY DEFINER RPCs
--   3) unindexed Phase 6 foreign keys
-- RLS helper functions used in policies stay executable by anon.

ALTER FUNCTION public.publication_is_public_status(text) SET search_path = public;
ALTER FUNCTION public.publication_setting_int(text, integer) SET search_path = public;
ALTER FUNCTION public.assert_publication_upload(text, text, text, bigint) SET search_path = public;
ALTER FUNCTION public.safe_publication_path(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.safe_doi_url(text, text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.archive_own_publication(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_publication_revision(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publish_publication(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_publication(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_publication_version(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_reading_progress(uuid, uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_review_publication(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assert_publication_upload(text, text, text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.safe_publication_path(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publication_setting_int(text, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.archive_own_publication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_publication_revision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_publication(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_publication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_publication_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_reading_progress(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_publication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_publication_upload(text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_publication_path(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publication_setting_int(text, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS publication_authors_profile_id_idx
  ON public.publication_authors (profile_id);
CREATE INDEX IF NOT EXISTS publication_bookmarks_chapter_id_idx
  ON public.publication_bookmarks (chapter_id);
CREATE INDEX IF NOT EXISTS publication_bookmarks_publication_id_idx
  ON public.publication_bookmarks (publication_id);
CREATE INDEX IF NOT EXISTS publication_bookmarks_user_id_idx
  ON public.publication_bookmarks (user_id);
CREATE INDEX IF NOT EXISTS publication_category_map_category_id_idx
  ON public.publication_category_map (category_id);
CREATE INDEX IF NOT EXISTS publication_contributors_profile_id_idx
  ON public.publication_contributors (profile_id);
CREATE INDEX IF NOT EXISTS publication_events_file_id_idx
  ON public.publication_events (file_id);
CREATE INDEX IF NOT EXISTS publication_files_uploaded_by_idx
  ON public.publication_files (uploaded_by);
CREATE INDEX IF NOT EXISTS publication_review_actions_actor_id_idx
  ON public.publication_review_actions (actor_id);
CREATE INDEX IF NOT EXISTS publication_review_assignments_reviewer_id_idx
  ON public.publication_review_assignments (reviewer_id);
CREATE INDEX IF NOT EXISTS publication_staff_created_by_idx
  ON public.publication_staff (created_by);
CREATE INDEX IF NOT EXISTS publication_tag_map_tag_id_idx
  ON public.publication_tag_map (tag_id);
CREATE INDEX IF NOT EXISTS publication_versions_created_by_idx
  ON public.publication_versions (created_by);
CREATE INDEX IF NOT EXISTS publications_published_by_idx
  ON public.publications (published_by);
CREATE INDEX IF NOT EXISTS reading_progress_publication_id_idx
  ON public.reading_progress (publication_id);
