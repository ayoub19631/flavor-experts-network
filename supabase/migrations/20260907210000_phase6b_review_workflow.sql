-- Phase 6B — author and review workflow RPCs.
-- Additive. No hard deletes. Authors cannot approve their own work.

CREATE OR REPLACE FUNCTION public.has_capability(p_capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_capability
    WHEN 'admin' THEN public.is_platform_admin()
    WHEN 'moderate_community' THEN public.is_platform_admin() OR public.has_platform_role('community_moderator')
    WHEN 'moderate_jobs' THEN public.is_platform_admin() OR public.has_platform_role('jobs_moderator')
    WHEN 'edit_content' THEN public.is_platform_admin() OR public.has_platform_role('content_editor') OR public.has_platform_role('research_editor')
    WHEN 'support' THEN public.is_platform_admin() OR public.has_platform_role('support_agent')
    WHEN 'grant_admin' THEN public.is_super_admin()
    WHEN 'review_verification' THEN public.is_platform_admin()
    WHEN 'review_publications' THEN
      public.is_platform_admin()
      OR public.is_publication_editor()
      OR public.is_publication_reviewer()
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_review_publication(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_capability('review_publications')
    AND EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = p_id
        AND p.created_by IS DISTINCT FROM (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.review_publication(
  p_id uuid,
  p_action text,
  p_reason text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
  next_status text;
  reason text := NULLIF(trim(coalesce(p_reason, '')), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_action NOT IN ('start_review', 'approve', 'request_revision', 'reject', 'schedule', 'archive', 'restore') THEN
    RAISE EXCEPTION 'Unsupported review action.';
  END IF;

  SELECT * INTO rec FROM public.publications WHERE id = p_id FOR UPDATE;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF rec.created_by = (SELECT auth.uid()) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'You cannot review or approve your own publication.';
  END IF;
  IF NOT public.has_capability('review_publications') THEN
    RAISE EXCEPTION 'Not allowed to review publications.';
  END IF;
  IF p_action IN ('request_revision', 'reject') AND reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;

  next_status := CASE p_action
    WHEN 'start_review' THEN 'under_review'
    WHEN 'approve' THEN 'approved'
    WHEN 'request_revision' THEN 'revision_requested'
    WHEN 'reject' THEN 'rejected'
    WHEN 'schedule' THEN 'scheduled'
    WHEN 'archive' THEN 'archived'
    WHEN 'restore' THEN CASE WHEN rec.status = 'archived' THEN 'approved' ELSE rec.status END
  END;

  IF p_action = 'schedule' AND p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'A schedule time is required.';
  END IF;

  PERFORM set_config('publications.allow_published_edit', 'on', true);
  UPDATE public.publications
  SET
    status = next_status,
    decision_reason = CASE WHEN p_action IN ('request_revision', 'reject') THEN reason ELSE decision_reason END,
    scheduled_at = CASE WHEN p_action = 'schedule' THEN p_scheduled_at ELSE scheduled_at END,
    published_at = CASE WHEN p_action = 'approve' THEN coalesce(published_at, now()) ELSE published_at END,
    published_by = CASE WHEN p_action = 'approve' THEN coalesce(published_by, (SELECT auth.uid())) ELSE published_by END
  WHERE id = p_id
  RETURNING * INTO rec;

  IF p_action = 'approve' THEN
    UPDATE public.publications
    SET status = 'published', decision_reason = NULL
    WHERE id = p_id
    RETURNING * INTO rec;
    INSERT INTO public.publication_versions (
      publication_id, version_number, status, change_notes, snapshot_data, created_by, published_at
    )
    SELECT
      rec.id,
      COALESCE((SELECT MAX(version_number) FROM public.publication_versions WHERE publication_id = rec.id), 0) + 1,
      rec.status,
      coalesce(reason, 'Approved'),
      jsonb_build_object('title', rec.title, 'status', rec.status, 'version_number', rec.version_number),
      (SELECT auth.uid()),
      rec.published_at;
  END IF;

  INSERT INTO public.publication_review_actions (publication_id, actor_id, action, reason)
  VALUES (p_id, (SELECT auth.uid()), p_action, reason);

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values, reason)
  VALUES (
    (SELECT auth.uid()),
    'publication_' || p_action,
    'publication',
    p_id::text,
    jsonb_build_object('status', rec.status),
    reason
  );

  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_publication_review_queue(
  p_status text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.publications
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_capability('review_publications') THEN
    RAISE EXCEPTION 'Not allowed to view the publication review queue.';
  END IF;
  RETURN QUERY
  SELECT p.*
  FROM public.publications p
  WHERE p.status IN (
      'submitted', 'editorial_check', 'under_review', 'revision_required',
      'revision_requested', 'revised', 'accepted', 'approved', 'scheduled', 'rejected'
    )
    AND (p_status IS NULL OR p.status = p_status)
    AND (p_type IS NULL OR p.type = p_type)
    AND (p_language IS NULL OR p.primary_language = p_language)
    AND (p_from IS NULL OR p.updated_at >= p_from)
    AND (p_to IS NULL OR p.updated_at <= p_to)
    AND p.created_by IS DISTINCT FROM (SELECT auth.uid())
  ORDER BY p.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_own_publication(p_id uuid)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
BEGIN
  SELECT * INTO rec FROM public.publications WHERE id = p_id FOR UPDATE;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF rec.created_by IS DISTINCT FROM (SELECT auth.uid()) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not allowed to archive this publication.';
  END IF;
  UPDATE public.publications SET status = 'archived' WHERE id = p_id RETURNING * INTO rec;
  INSERT INTO public.publication_review_actions (publication_id, actor_id, action, reason)
  VALUES (p_id, (SELECT auth.uid()), 'archive', 'owner_archive');
  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_publication_revision(p_id uuid, p_notes text DEFAULT NULL)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
  copy public.publications;
BEGIN
  SELECT * INTO rec FROM public.publications WHERE id = p_id;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF rec.created_by IS DISTINCT FROM (SELECT auth.uid())
     AND NOT public.is_platform_admin()
     AND NOT public.is_publication_editor() THEN
    RAISE EXCEPTION 'Not allowed to create a revision.';
  END IF;
  IF rec.status NOT IN ('published', 'corrected', 'approved') THEN
    RAISE EXCEPTION 'Only a published work can start a new version.';
  END IF;

  INSERT INTO public.publication_versions (
    publication_id, version_number, status, change_notes, snapshot_data, created_by, published_at
  )
  SELECT
    rec.id,
    COALESCE((SELECT MAX(version_number) FROM public.publication_versions WHERE publication_id = rec.id), 0) + 1,
    rec.status,
    coalesce(p_notes, 'New working version'),
    jsonb_build_object('title', rec.title, 'status', rec.status, 'version_number', rec.version_number),
    (SELECT auth.uid()),
    rec.published_at;

  INSERT INTO public.publications (
    type, slug, status, visibility, primary_language, title, subtitle, abstract, description,
    cover_image_path, license, doi, isbn, version_number, audience_level, application_area,
    regulatory_scope, keywords, publisher, institution, doi_url, edition, page_count,
    reading_minutes, created_by
  ) VALUES (
    rec.type,
    rec.slug || '-v' || (rec.version_number + 1)::text || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    'draft',
    rec.visibility,
    rec.primary_language,
    rec.title,
    rec.subtitle,
    rec.abstract,
    rec.description,
    rec.cover_image_path,
    rec.license,
    rec.doi,
    rec.isbn,
    rec.version_number + 1,
    rec.audience_level,
    rec.application_area,
    rec.regulatory_scope,
    rec.keywords,
    rec.publisher,
    rec.institution,
    rec.doi_url,
    rec.edition,
    rec.page_count,
    rec.reading_minutes,
    rec.created_by
  )
  RETURNING * INTO copy;

  INSERT INTO public.publication_authors (
    publication_id, profile_id, full_name, affiliation, country, orcid, email, author_order, is_corresponding, contribution
  )
  SELECT copy.id, profile_id, full_name, affiliation, country, orcid, email, author_order, is_corresponding, contribution
  FROM public.publication_authors WHERE publication_id = p_id;

  RETURN copy;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_publication(p_id uuid)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
BEGIN
  SELECT * INTO rec FROM public.publications WHERE id = p_id;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF rec.created_by IS DISTINCT FROM auth.uid()
     AND NOT public.is_platform_admin()
     AND NOT public.is_publication_editor() THEN
    RAISE EXCEPTION 'Not allowed to submit this publication.';
  END IF;
  IF rec.status NOT IN ('draft', 'revision_required', 'revision_requested', 'revised', 'rejected') THEN
    RAISE EXCEPTION 'Publication cannot be submitted from the current status.';
  END IF;
  UPDATE public.publications
  SET status = 'submitted', decision_reason = NULL
  WHERE id = p_id
  RETURNING * INTO rec;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_capability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_publication_reviewer() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_publication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_publication(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_publication_review_queue(text, text, text, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_own_publication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_publication_revision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_publication(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.review_publication(uuid, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_publication_review_queue(text, text, text, timestamptz, timestamptz, int, int) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.publication_row_readable(
  p_status text,
  p_visibility text,
  p_created_by uuid,
  p_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR public.is_publication_reviewer()
    OR p_created_by = (SELECT auth.uid())
    OR public.publication_is_assigned_reviewer(p_id)
    OR (
      p_status IN ('published', 'corrected', 'retracted')
      AND (
        p_visibility = 'public'
        OR (p_visibility = 'members' AND (SELECT auth.uid()) IS NOT NULL)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.publications_guard_workflow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allow text;
  is_admin boolean := public.is_platform_admin();
  is_editor boolean := public.is_publication_editor();
  is_reviewer boolean := public.has_capability('review_publications');
BEGIN
  allow := current_setting('publications.allow_published_edit', true);

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' AND NOT is_admin AND NOT is_editor THEN
      RAISE EXCEPTION 'Authors may only create draft publications.';
    END IF;
    IF NEW.status IN ('published', 'corrected', 'retracted') AND NOT is_admin THEN
      RAISE EXCEPTION 'Only admins can insert a published publication.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('published', 'corrected')
     AND COALESCE(allow, '') <> 'on'
     AND (
       NEW.title IS DISTINCT FROM OLD.title
       OR NEW.subtitle IS DISTINCT FROM OLD.subtitle
       OR NEW.abstract IS DISTINCT FROM OLD.abstract
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.doi IS DISTINCT FROM OLD.doi
       OR NEW.isbn IS DISTINCT FROM OLD.isbn
     )
  THEN
    RAISE EXCEPTION 'Published publications cannot be edited directly. Create a correction or new version.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('published', 'corrected', 'retracted')
       AND NOT is_admin
       AND NOT (is_reviewer AND COALESCE(allow, '') = 'on') THEN
      RAISE EXCEPTION 'Only authorized reviewers can publish, correct, or retract.';
    END IF;
    IF NEW.status = 'archived'
       AND NOT is_admin
       AND NOT (is_reviewer AND COALESCE(allow, '') = 'on')
       AND OLD.created_by IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Only the owner or a reviewer can archive.';
    END IF;
    IF NEW.status IN (
         'accepted', 'approved', 'scheduled', 'editorial_check', 'under_review',
         'revision_required', 'revision_requested', 'rejected'
       )
       AND NOT is_admin AND NOT is_editor AND NOT is_reviewer THEN
      RAISE EXCEPTION 'Only editors or reviewers can advance editorial workflow.';
    END IF;
    IF NEW.status IN ('submitted', 'revised')
       AND NOT is_admin
       AND NOT is_editor
       AND OLD.created_by IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Only the author can submit or mark a revision.';
    END IF;
    IF NEW.status IN ('published', 'approved') AND NEW.created_by = (SELECT auth.uid()) AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'You cannot approve or publish your own publication.';
    END IF;
    IF NEW.status = 'published' THEN
      NEW.published_at := COALESCE(NEW.published_at, now());
      NEW.published_by := COALESCE(NEW.published_by, (SELECT auth.uid()));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS publications_update ON public.publications;
CREATE POLICY publications_update ON public.publications
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR public.has_capability('review_publications')
    OR (
      created_by = (SELECT auth.uid())
      AND status IN ('draft', 'submitted', 'revision_required', 'revision_requested', 'revised', 'rejected')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR public.has_capability('review_publications')
    OR (
      created_by = (SELECT auth.uid())
      AND status IN ('draft', 'submitted', 'revision_required', 'revision_requested', 'revised', 'rejected')
    )
  );

CREATE OR REPLACE FUNCTION public.publish_publication(p_id uuid, p_notes text DEFAULT NULL)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
  author_count int;
  chapter_count int;
  category_count int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only admins can publish publications.';
  END IF;
  SELECT * INTO rec FROM public.publications WHERE id = p_id FOR UPDATE;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF rec.created_by = (SELECT auth.uid()) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'You cannot approve or publish your own publication.';
  END IF;
  IF length(trim(rec.title)) < 3 OR rec.slug IS NULL OR rec.type IS NULL OR rec.primary_language IS NULL THEN
    RAISE EXCEPTION 'Title, slug, type, and language are required before publishing.';
  END IF;
  IF coalesce(rec.abstract, rec.description, '') = '' THEN
    RAISE EXCEPTION 'Abstract or description is required before publishing.';
  END IF;
  SELECT count(*) INTO author_count FROM public.publication_authors WHERE publication_id = p_id;
  IF author_count < 1 THEN
    RAISE EXCEPTION 'At least one author is required before publishing.';
  END IF;
  SELECT count(*) INTO category_count FROM public.publication_category_map WHERE publication_id = p_id;
  IF category_count < 1 THEN
    RAISE EXCEPTION 'At least one category is required before publishing.';
  END IF;
  IF rec.type = 'book' THEN
    IF rec.cover_image_path IS NULL OR rec.cover_image_path = '' THEN
      RAISE EXCEPTION 'A cover image is required before publishing a book.';
    END IF;
    SELECT count(*) INTO chapter_count
    FROM public.book_chapters
    WHERE publication_id = p_id;
    IF chapter_count < 1 THEN
      RAISE EXCEPTION 'At least one chapter is required for books.';
    END IF;
  END IF;

  INSERT INTO public.publication_versions (
    publication_id, version_number, status, change_notes, snapshot_data, created_by, published_at
  )
  SELECT
    rec.id,
    COALESCE((SELECT MAX(version_number) FROM public.publication_versions WHERE publication_id = rec.id), 0) + 1,
    rec.status,
    coalesce(p_notes, 'Published'),
    jsonb_build_object('title', rec.title, 'status', rec.status, 'version_number', rec.version_number),
    (SELECT auth.uid()),
    now();

  PERFORM set_config('publications.allow_published_edit', 'on', true);
  UPDATE public.publications
  SET
    status = 'published',
    decision_reason = NULL,
    published_at = coalesce(published_at, now()),
    published_by = (SELECT auth.uid())
  WHERE id = p_id
  RETURNING * INTO rec;
  RETURN rec;
END;
$$;
