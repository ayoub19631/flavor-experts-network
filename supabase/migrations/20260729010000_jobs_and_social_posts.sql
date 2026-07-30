-- Jobs board + professional social feed

-- ── Helpers ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_company_account()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT account_type = 'company'
      FROM public.user_profiles
      WHERE id = auth.uid()
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_company_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_account() TO authenticated;

-- ── job_listings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text,
  description text NOT NULL,
  description_ar text,
  company_name text NOT NULL DEFAULT '',
  location text,
  employment_type text NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time','part_time','contract','remote','internship')),
  experience_level text NOT NULL DEFAULT 'mid'
    CHECK (experience_level IN ('entry','mid','senior','lead','executive')),
  salary_range text,
  apply_url text,
  skills text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_job_listings_published
  ON public.job_listings (created_at DESC)
  WHERE is_published = true AND status = 'open';

CREATE INDEX IF NOT EXISTS idx_job_listings_company
  ON public.job_listings (company_id, created_at DESC);

-- ── job_applications ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text,
  resume_url text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewed','rejected','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON public.job_applications (applicant_id);

-- ── social_posts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  image_url text,
  is_published boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_feed
  ON public.social_posts (created_at DESC)
  WHERE is_published = true AND is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_social_posts_author
  ON public.social_posts (author_id, created_at DESC);

-- ── social_post_likes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_post_likes (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Keep likes_count in sync
CREATE OR REPLACE FUNCTION public.touch_social_post_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_post_likes ON public.social_post_likes;
CREATE TRIGGER trg_social_post_likes
  AFTER INSERT OR DELETE ON public.social_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.touch_social_post_likes();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;

-- Jobs: premium members can read open published jobs; owners always read own
DROP POLICY IF EXISTS jobs_select ON public.job_listings;
CREATE POLICY jobs_select ON public.job_listings
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR company_id = auth.uid()
    OR (is_published = true AND status = 'open' AND public.has_active_subscription())
  );

DROP POLICY IF EXISTS jobs_insert ON public.job_listings;
CREATE POLICY jobs_insert ON public.job_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = auth.uid()
    AND public.is_company_account()
    AND public.has_active_subscription()
  );

DROP POLICY IF EXISTS jobs_update ON public.job_listings;
CREATE POLICY jobs_update ON public.job_listings
  FOR UPDATE TO authenticated
  USING (company_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (company_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS jobs_delete ON public.job_listings;
CREATE POLICY jobs_delete ON public.job_listings
  FOR DELETE TO authenticated
  USING (company_id = auth.uid() OR public.is_platform_admin());

-- Applications
DROP POLICY IF EXISTS job_apps_select ON public.job_applications;
CREATE POLICY job_apps_select ON public.job_applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_listings j
      WHERE j.id = job_id AND j.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS job_apps_insert ON public.job_applications;
CREATE POLICY job_apps_insert ON public.job_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND public.has_active_subscription()
  );

DROP POLICY IF EXISTS job_apps_update ON public.job_applications;
CREATE POLICY job_apps_update ON public.job_applications
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.job_listings j
      WHERE j.id = job_id AND j.company_id = auth.uid()
    )
  );

-- Social posts: all authenticated can read published; verified can write
DROP POLICY IF EXISTS social_posts_select ON public.social_posts;
CREATE POLICY social_posts_select ON public.social_posts
  FOR SELECT TO authenticated, anon
  USING (
    (is_published = true AND is_hidden = false)
    OR author_id = auth.uid()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS social_posts_insert ON public.social_posts;
CREATE POLICY social_posts_insert ON public.social_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS social_posts_update ON public.social_posts;
CREATE POLICY social_posts_update ON public.social_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS social_posts_delete ON public.social_posts;
CREATE POLICY social_posts_delete ON public.social_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS social_likes_select ON public.social_post_likes;
CREATE POLICY social_likes_select ON public.social_post_likes
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS social_likes_insert ON public.social_post_likes;
CREATE POLICY social_likes_insert ON public.social_post_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS social_likes_delete ON public.social_post_likes;
CREATE POLICY social_likes_delete ON public.social_post_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
