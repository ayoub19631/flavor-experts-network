-- Phase 4D — account controls, analytics, search expansion, missing RLS
-- Local/staging only. No destructive drops. No production apply from this branch.

ALTER TABLE public.consultation_experts
  ADD COLUMN IF NOT EXISTS headline text;

ALTER TABLE public.company_invitations
  ADD COLUMN IF NOT EXISTS invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_review', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON public.analytics_events(event_name, created_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_deletion_own ON public.account_deletion_requests;
CREATE POLICY account_deletion_own ON public.account_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY account_deletion_read ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS analytics_insert_own ON public.analytics_events;
CREATE POLICY analytics_insert_own ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));
CREATE POLICY analytics_admin_read ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS company_invitations_own ON public.company_invitations;
CREATE POLICY company_invitations_own ON public.company_invitations
  FOR ALL TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR invited_user_id = (SELECT auth.uid())
    OR company_id = (SELECT auth.uid())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    OR company_id = (SELECT auth.uid())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS job_apps_update ON public.job_applications;
CREATE POLICY job_apps_update ON public.job_applications
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR applicant_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.job_listings j
      WHERE j.id = job_applications.job_id AND j.company_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_listings j
      WHERE j.id = job_applications.job_id AND j.company_id = (SELECT auth.uid())
    )
    OR (
      applicant_id = (SELECT auth.uid())
      AND status = 'withdrawn'
    )
  );

CREATE OR REPLACE FUNCTION public.unified_search(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE (entity_type text, entity_id text, title text, href text, rank real)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  q tsquery;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;
  BEGIN
    q := websearch_to_tsquery('simple', trim(p_query));
  EXCEPTION WHEN others THEN
    q := plainto_tsquery('simple', trim(p_query));
  END;

  RETURN QUERY
  (
    SELECT 'member'::text, d.profile_id::text, d.full_name, '/members/' || coalesce(d.profile_id::text, d.id::text), 0.8::real
    FROM public.member_directory d
    WHERE d.full_name ILIKE '%' || trim(p_query) || '%'
       OR coalesce(d.company, '') ILIKE '%' || trim(p_query) || '%'
    LIMIT 6
  )
  UNION ALL
  (
    SELECT 'post', p.id::text, left(p.body, 120), '/community#post-' || p.id::text, ts_rank(p.search_vector, q)
    FROM public.social_posts p
    WHERE p.deleted_at IS NULL AND p.is_published AND NOT p.is_hidden AND p.search_vector @@ q
    ORDER BY 5 DESC LIMIT LEAST(p_limit, 8)
  )
  UNION ALL
  (
    SELECT 'forum', t.id::text, t.title, '/forum/t/' || t.id::text, ts_rank(t.search_vector, q)
    FROM public.forum_topics t
    WHERE t.deleted_at IS NULL AND t.search_vector @@ q
    ORDER BY 5 DESC LIMIT LEAST(p_limit, 8)
  )
  UNION ALL
  (
    SELECT 'job', j.id::text, j.title, '/jobs/' || coalesce(j.slug, j.id::text), ts_rank(j.search_vector, q)
    FROM public.job_listings j
    WHERE j.deleted_at IS NULL AND j.is_published AND j.status IN ('open', 'published') AND j.search_vector @@ q
    ORDER BY 5 DESC LIMIT LEAST(p_limit, 8)
  )
  UNION ALL
  (
    SELECT 'publication', pub.id::text, pub.title, CASE WHEN pub.type = 'book' THEN '/books/' ELSE '/research/' END || pub.slug, 0.7::real
    FROM public.publications pub
    WHERE pub.status = 'published' AND pub.visibility = 'public'
      AND (pub.search_vector @@ q OR pub.title ILIKE '%' || trim(p_query) || '%')
    LIMIT 6
  )
  UNION ALL
  (
    SELECT 'event', e.id::text, e.title, '/events/' || e.slug, 0.6::real
    FROM public.events e
    WHERE e.status = 'published' AND e.deleted_at IS NULL
      AND (e.title ILIKE '%' || trim(p_query) || '%' OR coalesce(e.description, '') ILIKE '%' || trim(p_query) || '%')
    LIMIT 4
  )
  UNION ALL
  (
    SELECT 'market', m.id::text, m.name, '/market#' || m.slug, 0.5::real
    FROM public.market_materials m
    WHERE m.name ILIKE '%' || trim(p_query) || '%' OR m.slug ILIKE '%' || trim(p_query) || '%'
    LIMIT 4
  );
END;
$$;

-- Private storage: owners and authorized company/admin only. Never public.
DROP POLICY IF EXISTS application_docs_owner ON storage.objects;
CREATE POLICY application_docs_owner ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'application-docs'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_platform_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'application-docs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
