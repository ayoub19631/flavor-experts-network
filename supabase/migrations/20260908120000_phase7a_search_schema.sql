-- Phase 7A — search helpers, normalized text, indexes, private analytics.
-- Apply after 20260907250000. Additive only. No hard deletes.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.is_hidden_test_member(p_name text, p_company text DEFAULT NULL, p_bio text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(p_name, '') ~* '(\+companyqa|ayobe895\+|qaautomation|companyqa[0-9]{6,}|\btest account\b)'
      OR coalesce(p_company, '') ~* '(qa automation|\+companyqa)'
      OR coalesce(p_bio, '') ~* '(\+companyqa|synthetic test account)';
$$;

CREATE OR REPLACE FUNCTION public.member_is_publicly_listed(p_member_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (NOT COALESCE(p.is_test_account, false))
         AND COALESCE(p.is_active, true)
         AND NOT COALESCE(p.hide_from_directory, false)
      FROM public.user_profiles p
      WHERE p.id = COALESCE(p_profile_id, p_member_id)
      LIMIT 1
    ),
    true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_pair(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_blocks
    WHERE (blocker_id = p_a AND blocked_id = p_b)
       OR (blocker_id = p_b AND blocked_id = p_a)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_muted_by(p_viewer uuid, p_author uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_mutes
    WHERE muter_id = p_viewer AND muted_id = p_author
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_hidden_test_member(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_is_publicly_listed(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_muted_by(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.normalize_search_text(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(
    translate(
      regexp_replace(coalesce(p_input, ''), '[ـًٌٍَُِّْ]', '', 'g'),
      'أإآٱىةؤئ',
      'اااايهوي'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.search_rank(
  p_norm_query text,
  p_norm_title text,
  p_norm_haystack text,
  p_fts real,
  p_trgm real,
  p_verified boolean,
  p_quality real,
  p_fresh real
) RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
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

CREATE OR REPLACE FUNCTION public.member_is_verified(p_member_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.is_verified
      FROM public.user_profiles p
      WHERE p.id = COALESCE(p_profile_id, p_member_id)
      LIMIT 1
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.search_viewer_hidden_author(p_author uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL OR p_author IS NULL THEN false
    ELSE public.is_blocked_pair((SELECT auth.uid()), p_author)
      OR public.is_muted_by((SELECT auth.uid()), p_author)
  END;
$$;

CREATE OR REPLACE FUNCTION public.search_query_is_sensitive(p_query text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    coalesce(p_query, '') ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    OR coalesce(p_query, '') ~ '\d{6,}';
$$;

ALTER TABLE public.member_directory_data
  ADD COLUMN IF NOT EXISTS search_norm text,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS search_norm text,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE public.market_materials
  ADD COLUMN IF NOT EXISTS search_norm text,
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.touch_member_directory_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_norm := public.normalize_search_text(
    concat_ws(' ', NEW.full_name, NEW.company, NEW.title, NEW.role, NEW.specialty, NEW.location, NEW.bio, array_to_string(NEW.skills, ' '))
  );
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.full_name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(NEW.company, '')), 'B')
    || setweight(to_tsvector('simple', concat_ws(' ', NEW.title, NEW.role, NEW.specialty, array_to_string(NEW.skills, ' '))), 'B')
    || setweight(to_tsvector('simple', concat_ws(' ', NEW.bio, NEW.location)), 'C');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_events_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_norm := public.normalize_search_text(concat_ws(' ', NEW.title, NEW.description, NEW.organizer, NEW.location, NEW.event_type));
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A')
    || setweight(to_tsvector('simple', concat_ws(' ', NEW.organizer, NEW.event_type, NEW.location)), 'B')
    || setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_market_materials_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_norm := public.normalize_search_text(concat_ws(' ', NEW.name, NEW.slug, NEW.category));
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A')
    || setweight(to_tsvector('simple', concat_ws(' ', NEW.slug, NEW.category)), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_directory_search ON public.member_directory_data;
CREATE TRIGGER trg_member_directory_search
  BEFORE INSERT OR UPDATE OF full_name, company, title, role, specialty, location, bio, skills
  ON public.member_directory_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_member_directory_search();

DROP TRIGGER IF EXISTS trg_events_search ON public.events;
CREATE TRIGGER trg_events_search
  BEFORE INSERT OR UPDATE OF title, description, organizer, location, event_type
  ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_events_search();

DROP TRIGGER IF EXISTS trg_market_materials_search ON public.market_materials;
CREATE TRIGGER trg_market_materials_search
  BEFORE INSERT OR UPDATE OF name, slug, category
  ON public.market_materials
  FOR EACH ROW EXECUTE FUNCTION public.touch_market_materials_search();

UPDATE public.member_directory_data
SET full_name = full_name
WHERE search_vector IS NULL;

UPDATE public.events
SET title = title
WHERE search_vector IS NULL;

UPDATE public.market_materials
SET name = name
WHERE search_vector IS NULL;

-- Indexes chosen for global_search predicates: FTS match, prefix/trigram names, published filters.
CREATE INDEX IF NOT EXISTS member_directory_data_search_vec_idx
  ON public.member_directory_data USING gin (search_vector);
CREATE INDEX IF NOT EXISTS member_directory_data_search_trgm_idx
  ON public.member_directory_data USING gin (search_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS events_search_vec_idx
  ON public.events USING gin (search_vector);
CREATE INDEX IF NOT EXISTS events_search_trgm_idx
  ON public.events USING gin (search_norm gin_trgm_ops)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS market_materials_search_vec_idx
  ON public.market_materials USING gin (search_vector);
CREATE INDEX IF NOT EXISTS market_materials_search_trgm_idx
  ON public.market_materials USING gin (search_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS job_listings_title_trgm_idx
  ON public.job_listings USING gin (title gin_trgm_ops)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS forum_topics_title_trgm_idx
  ON public.forum_topics USING gin (title gin_trgm_ops)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS publications_title_trgm_idx
  ON public.publications USING gin (title gin_trgm_ops)
  WHERE status IN ('published', 'corrected', 'retracted');

CREATE TABLE IF NOT EXISTS public.search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query_hash text NOT NULL,
  query_len int NOT NULL DEFAULT 0,
  entity_type text,
  has_results boolean,
  clicked boolean NOT NULL DEFAULT false,
  latency_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_analytics_user_idx
  ON public.search_analytics (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS search_analytics_created_idx
  ON public.search_analytics (created_at DESC);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_analytics_own ON public.search_analytics;
CREATE POLICY search_analytics_own ON public.search_analytics
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS search_analytics_insert ON public.search_analytics;
CREATE POLICY search_analytics_insert ON public.search_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS search_analytics_delete ON public.search_analytics;
CREATE POLICY search_analytics_delete ON public.search_analytics
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.search_analytics FROM PUBLIC;
GRANT SELECT, DELETE ON TABLE public.search_analytics TO authenticated;
GRANT INSERT ON TABLE public.search_analytics TO anon, authenticated;

DROP POLICY IF EXISTS market_sources_read ON public.market_sources;
CREATE POLICY market_sources_read ON public.market_sources
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE VIEW public.member_directory
  WITH (security_invoker = true)
AS
SELECT
  d.id, d.full_name, d.role, d.specialty, d.linkedin_url, d.joined_at, d.avatar_url, d.cover_url,
  d.is_featured, d.title, d.company, d.location, d.bio, d.member_type, d.years_experience,
  d.website, d.profile_id, d.skills, d.education, d.work_experience, d.projects,
  public.member_is_verified(d.id, d.profile_id) AS is_verified,
  d.search_norm
FROM public.member_directory_data d
WHERE NOT public.is_hidden_test_member(d.full_name, d.company, d.bio)
  AND public.member_is_publicly_listed(d.id, d.profile_id)
  AND NULLIF(btrim(COALESCE(d.full_name, '')), '') IS NOT NULL
  AND lower(btrim(d.full_name)) NOT IN ('user', 'test', 'admin', 'member');

GRANT SELECT ON public.member_directory TO anon, authenticated;
