-- ============================================================================
-- Full platform hardening consolidation (2026-07-31)
--  1. Close anonymous INSERT on contact/enterprise (edge function only)
--  2. Public member directory WITHOUT emails (view + profile link)
--  3. Social posts: verified-email inserts + moderation column protection
--  4. Storage: drop permissive leftover policies
--  5. URL safety CHECK constraints (https only)
--  6. account_type privilege lock
--  7. market_briefings schema versioning (was missing from migrations)
--  8. Index hygiene: FK indexes + drop duplicate indexes
--  9. RLS initplan optimization ((select auth.uid()))
-- ============================================================================

-- ── 1. Public form inserts happen ONLY via submit-public-form (service_role) ─
DROP POLICY IF EXISTS messages_insert ON public.contact_messages;
DROP POLICY IF EXISTS enterprise_insert ON public.enterprise_requests;

-- ── 2. Members: link to profiles, hide emails from the public directory ──────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL;

UPDATE public.members m
SET profile_id = up.id
FROM public.user_profiles up
WHERE lower(btrim(m.email)) = lower(btrim(up.email))
  AND m.profile_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_profile_id_key
  ON public.members(profile_id) WHERE profile_id IS NOT NULL;

-- No more table-level public SELECT (it exposed the email column).
DROP POLICY IF EXISTS members_public_select ON public.members;
DROP POLICY IF EXISTS members_select ON public.members;

-- Admins keep full table access (AdminPage manages members incl. email).
CREATE POLICY members_admin_select ON public.members
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Public directory: every column EXCEPT email, keyed to the owning profile.
CREATE OR REPLACE VIEW public.member_directory AS
SELECT
  id, full_name, role, specialty, linkedin_url, joined_at, avatar_url,
  is_featured, title, company, location, bio, member_type,
  years_experience, website, profile_id
FROM public.members;

GRANT SELECT ON public.member_directory TO anon, authenticated;

-- Keep profile_id in sync with user_profiles.
CREATE OR REPLACE FUNCTION public.sync_member_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_email text;
BEGIN
  IF NEW.email IS NULL OR length(btrim(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  member_email := lower(btrim(NEW.email));

  IF COALESCE(NEW.is_active, true) = false THEN
    DELETE FROM public.members WHERE lower(btrim(email)) = member_email;
    RETURN NEW;
  END IF;

  INSERT INTO public.members (
    full_name, email, role, specialty, linkedin_url, avatar_url, is_featured,
    title, company, location, bio, member_type, website, joined_at, profile_id
  ) VALUES (
    COALESCE(NULLIF(btrim(NEW.full_name), ''), split_part(member_email, '@', 1)),
    member_email,
    COALESCE(NULLIF(btrim(NEW.role), ''), 'Member'),
    NULL,
    NULLIF(btrim(COALESCE(NEW.linkedin_url, '')), ''),
    NULLIF(btrim(COALESCE(NEW.avatar_url, '')), ''),
    COALESCE(NEW.is_admin, false),
    NULLIF(btrim(COALESCE(NEW.role, '')), ''),
    NULLIF(btrim(COALESCE(NEW.company, '')), ''),
    NULLIF(btrim(COALESCE(NEW.location, '')), ''),
    NULLIF(btrim(COALESCE(NEW.bio, '')), ''),
    CASE WHEN NEW.account_type = 'company' THEN 'company' ELSE 'individual' END,
    NULLIF(btrim(COALESCE(NEW.website_url, '')), ''),
    COALESCE(NEW.created_at, now()),
    NEW.id
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    linkedin_url = EXCLUDED.linkedin_url,
    avatar_url = EXCLUDED.avatar_url,
    is_featured = EXCLUDED.is_featured,
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    bio = EXCLUDED.bio,
    member_type = EXCLUDED.member_type,
    website = EXCLUDED.website,
    profile_id = EXCLUDED.profile_id;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN undefined_column THEN
    RETURN NEW;
END;
$$;

-- ── 3. Social posts + forum hardening ────────────────────────────────────────
-- Posting requires a verified email (forum already enforced this).
DROP POLICY IF EXISTS social_posts_insert ON public.social_posts;
CREATE POLICY social_posts_insert ON public.social_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (select auth.uid())
    AND (public.is_email_verified() OR public.is_platform_admin())
  );

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_body_length
  CHECK (length(btrim(body)) BETWEEN 3 AND 5000) NOT VALID;

-- Non-admin authors must not rewrite moderation counters/flags.
CREATE OR REPLACE FUNCTION public.protect_post_moderation_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    NEW.likes_count := OLD.likes_count;
    NEW.is_hidden := OLD.is_hidden;
    NEW.is_published := OLD.is_published;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_post_moderation ON public.social_posts;
CREATE TRIGGER protect_post_moderation
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_moderation_columns();

CREATE OR REPLACE FUNCTION public.protect_topic_moderation_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    NEW.is_pinned := OLD.is_pinned;
    NEW.is_locked := OLD.is_locked;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_topic_moderation ON public.forum_topics;
CREATE TRIGGER protect_topic_moderation
  BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.protect_topic_moderation_columns();

-- Replies readable only for topics inside published categories (admins bypass).
DROP POLICY IF EXISTS forum_replies_read ON public.forum_replies;
CREATE POLICY forum_replies_read ON public.forum_replies
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.forum_topics t
      JOIN public.forum_categories c ON c.id = t.category_id
      WHERE t.id = forum_replies.topic_id
        AND (c.is_published = true OR public.is_platform_admin())
    )
  );

-- ── 4. Storage: remove permissive leftovers, one hardened delete path ────────
DROP POLICY IF EXISTS uploads_insert ON storage.objects;
DROP POLICY IF EXISTS uploads_update ON storage.objects;
DROP POLICY IF EXISTS uploads_delete ON storage.objects;

CREATE POLICY storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (owner = (select auth.uid()) AND (storage.foldername(name))[1] = 'avatars')
    )
  );

-- ── 5. URL safety: https only for user-controlled links ──────────────────────
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_linkedin_https
    CHECK (linkedin_url IS NULL OR btrim(linkedin_url) = '' OR linkedin_url ~* '^https://') NOT VALID,
  ADD CONSTRAINT user_profiles_website_https
    CHECK (website_url IS NULL OR btrim(website_url) = '' OR website_url ~* '^https://') NOT VALID;

ALTER TABLE public.job_listings
  ADD CONSTRAINT job_listings_apply_url_https
    CHECK (apply_url IS NULL OR btrim(apply_url) = '' OR apply_url ~* '^https://') NOT VALID;

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_image_https
    CHECK (image_url IS NULL OR btrim(image_url) = '' OR image_url ~* '^https://') NOT VALID;

-- Normalize existing http:// profile links to https://
UPDATE public.user_profiles SET linkedin_url = regexp_replace(linkedin_url, '^http://', 'https://') WHERE linkedin_url ~* '^http://';
UPDATE public.user_profiles SET website_url = regexp_replace(website_url, '^http://', 'https://') WHERE website_url ~* '^http://';

-- ── 6. account_type: chosen at signup, frozen afterwards ─────────────────────
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_platform_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.is_admin := false;
      NEW.platform_preview_access := false;
      NEW.subscription_active := true;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.is_admin := OLD.is_admin;
      NEW.platform_preview_access := OLD.platform_preview_access;
      NEW.subscription_active := OLD.subscription_active;
      NEW.account_type := OLD.account_type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 7. market_briefings: version the live schema (was console-created) ───────
CREATE TABLE IF NOT EXISTS public.market_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date date NOT NULL UNIQUE,
  title text NOT NULL,
  title_ar text,
  summary text NOT NULL,
  summary_ar text,
  body_en text NOT NULL,
  body_ar text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  commodities jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  generated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_briefings_admin_all ON public.market_briefings;
CREATE POLICY market_briefings_admin_all ON public.market_briefings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS market_briefings_public_read ON public.market_briefings;
CREATE POLICY market_briefings_public_read ON public.market_briefings
  FOR SELECT TO public
  USING (is_published = true OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.get_latest_market_briefing()
RETURNS TABLE(
  briefing_date date, title text, title_ar text,
  summary text, summary_ar text, body_en text, body_ar text,
  highlights jsonb, commodities jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    mb.briefing_date, mb.title, mb.title_ar,
    mb.summary, mb.summary_ar, mb.body_en, mb.body_ar,
    mb.highlights, mb.commodities
  FROM public.market_briefings mb
  WHERE mb.is_published = true
  ORDER BY mb.briefing_date DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_latest_market_briefing() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_latest_market_briefing() TO authenticated, service_role;

-- ── 8. Index hygiene ─────────────────────────────────────────────────────────
-- Missing FK covering indexes
CREATE INDEX IF NOT EXISTS consultation_requests_user_id_idx ON public.consultation_requests(user_id);
CREATE INDEX IF NOT EXISTS enterprise_requests_user_id_idx ON public.enterprise_requests(user_id);
CREATE INDEX IF NOT EXISTS forum_replies_author_id_idx ON public.forum_replies(author_id);
CREATE INDEX IF NOT EXISTS forum_topics_author_id_idx ON public.forum_topics(author_id);
CREATE INDEX IF NOT EXISTS social_post_likes_user_id_idx ON public.social_post_likes(user_id);

-- Drop duplicate indexes (skip any backing a constraint)
DO $$
DECLARE
  idx text;
BEGIN
  FOREACH idx IN ARRAY ARRAY[
    'idx_messages_created_at', 'idx_msg_created',
    'idx_messages_status', 'idx_msg_status',
    'idx_res_category', 'idx_resources_category',
    'idx_res_is_pub',
    'idx_res_premium',
    'idx_res_type',
    'idx_ent_created',
    'idx_ent_status',
    'idx_news_category',
    'idx_news_is_pub',
    'idx_news_published', 'idx_news_published_at',
    'idx_members_email',
    'idx_members_specialty',
    'idx_up_email'
  ]
  LOOP
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', idx);
    EXCEPTION
      WHEN dependent_objects_still_exist THEN
        RAISE NOTICE 'Skipping % — backs a constraint', idx;
      WHEN undefined_table THEN
        NULL;
    END;
  END LOOP;
END $$;

-- ── 9. RLS initplan optimization ─────────────────────────────────────────────
-- Helper functions: evaluate auth.uid() once per query instead of per row.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (select auth.uid()) AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = (select auth.uid())),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT subscription_tier IN ('professional', 'enterprise')
        AND COALESCE(subscription_active, true)
      FROM public.user_profiles
      WHERE id = (select auth.uid())
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_account()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT account_type = 'company'
      FROM public.user_profiles
      WHERE id = (select auth.uid())
    ),
    false
  );
$$;

-- Hot-path policies with direct auth.uid() calls.
DROP POLICY IF EXISTS profile_insert ON public.user_profiles;
CREATE POLICY profile_insert ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS profile_select ON public.user_profiles;
CREATE POLICY profile_select ON public.user_profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id OR public.is_platform_admin());

DROP POLICY IF EXISTS profile_update ON public.user_profiles;
CREATE POLICY profile_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id OR public.is_platform_admin());

DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS notifications_own_update ON public.notifications;
CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS consultation_insert_auth ON public.consultation_requests;
CREATE POLICY consultation_insert_auth ON public.consultation_requests
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (user_id IS NULL OR user_id = (select auth.uid())));

DROP POLICY IF EXISTS consultation_own_read ON public.consultation_requests;
CREATE POLICY consultation_own_read ON public.consultation_requests
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS social_likes_insert ON public.social_post_likes;
CREATE POLICY social_likes_insert ON public.social_post_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS social_likes_delete ON public.social_post_likes;
CREATE POLICY social_likes_delete ON public.social_post_likes
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS social_posts_update ON public.social_posts;
CREATE POLICY social_posts_update ON public.social_posts
  FOR UPDATE TO authenticated
  USING (author_id = (select auth.uid()) OR public.is_platform_admin())
  WITH CHECK (author_id = (select auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS social_posts_delete ON public.social_posts;
CREATE POLICY social_posts_delete ON public.social_posts
  FOR DELETE TO authenticated
  USING (author_id = (select auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_topics_insert ON public.forum_topics;
CREATE POLICY forum_topics_insert ON public.forum_topics
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = author_id
    AND (select auth.uid()) IS NOT NULL
    AND public.is_email_verified()
  );

DROP POLICY IF EXISTS forum_topics_update_own ON public.forum_topics;
CREATE POLICY forum_topics_update_own ON public.forum_topics
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = author_id OR public.is_platform_admin())
  WITH CHECK ((select auth.uid()) = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_topics_delete ON public.forum_topics;
CREATE POLICY forum_topics_delete ON public.forum_topics
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_replies_insert ON public.forum_replies;
CREATE POLICY forum_replies_insert ON public.forum_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = author_id
    AND (select auth.uid()) IS NOT NULL
    AND public.is_email_verified()
    AND NOT EXISTS (
      SELECT 1 FROM public.forum_topics t
      WHERE t.id = forum_replies.topic_id AND t.is_locked = true
    )
  );

DROP POLICY IF EXISTS forum_replies_update ON public.forum_replies;
CREATE POLICY forum_replies_update ON public.forum_replies
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = author_id OR public.is_platform_admin())
  WITH CHECK ((select auth.uid()) = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_replies_delete ON public.forum_replies;
CREATE POLICY forum_replies_delete ON public.forum_replies
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS jobs_select ON public.job_listings;
CREATE POLICY jobs_select ON public.job_listings
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR company_id = (select auth.uid())
    OR (is_published = true AND status = 'open' AND public.has_active_subscription())
  );

DROP POLICY IF EXISTS jobs_insert ON public.job_listings;
CREATE POLICY jobs_insert ON public.job_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (select auth.uid())
    AND public.is_company_account()
    AND public.has_active_subscription()
  );

DROP POLICY IF EXISTS jobs_update ON public.job_listings;
CREATE POLICY jobs_update ON public.job_listings
  FOR UPDATE TO authenticated
  USING (company_id = (select auth.uid()) OR public.is_platform_admin())
  WITH CHECK (company_id = (select auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS jobs_delete ON public.job_listings;
CREATE POLICY jobs_delete ON public.job_listings
  FOR DELETE TO authenticated
  USING (company_id = (select auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS job_apps_select ON public.job_applications;
CREATE POLICY job_apps_select ON public.job_applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = (select auth.uid())
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_listings j
      WHERE j.id = job_applications.job_id AND j.company_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS job_apps_insert ON public.job_applications;
CREATE POLICY job_apps_insert ON public.job_applications
  FOR INSERT TO authenticated
  WITH CHECK (applicant_id = (select auth.uid()) AND public.has_active_subscription());

DROP POLICY IF EXISTS job_apps_update ON public.job_applications;
CREATE POLICY job_apps_update ON public.job_applications
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_listings j
      WHERE j.id = job_applications.job_id AND j.company_id = (select auth.uid())
    )
  );
