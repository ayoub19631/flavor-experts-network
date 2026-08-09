-- =============================================================================
-- Fix Supabase Advisor: Security Definer Views
-- Replace SECURITY DEFINER directory/author views with invoker-safe public
-- tables (no email / sensitive columns) + security_invoker = true views.
-- Also revoke overly broad table grants on members/user_profiles.
-- =============================================================================

-- ── 1. Public member directory data (no email) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_directory_data (
  id uuid PRIMARY KEY,
  full_name text,
  role text,
  specialty text,
  linkedin_url text,
  joined_at timestamptz,
  avatar_url text,
  cover_url text,
  is_featured boolean NOT NULL DEFAULT false,
  title text,
  company text,
  location text,
  bio text,
  member_type text,
  years_experience integer,
  website text,
  profile_id uuid,
  skills text[] NOT NULL DEFAULT '{}'::text[],
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  work_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_directory_data_featured_idx
  ON public.member_directory_data (is_featured DESC, joined_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS member_directory_data_profile_idx
  ON public.member_directory_data (profile_id)
  WHERE profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_member_directory_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.member_directory_data WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.member_directory_data AS d (
    id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, cover_url,
    is_featured, title, company, location, bio, member_type, years_experience,
    website, profile_id, skills, education, work_experience, projects, updated_at
  ) VALUES (
    NEW.id, NEW.full_name, NEW.role, NEW.specialty, NEW.linkedin_url, NEW.joined_at,
    NEW.avatar_url, NEW.cover_url, COALESCE(NEW.is_featured, false), NEW.title,
    NEW.company, NEW.location, NEW.bio, NEW.member_type, NEW.years_experience,
    NEW.website, NEW.profile_id,
    COALESCE(NEW.skills, '{}'::text[]),
    COALESCE(NEW.education, '[]'::jsonb),
    COALESCE(NEW.work_experience, '[]'::jsonb),
    COALESCE(NEW.projects, '[]'::jsonb),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    specialty = EXCLUDED.specialty,
    linkedin_url = EXCLUDED.linkedin_url,
    joined_at = EXCLUDED.joined_at,
    avatar_url = EXCLUDED.avatar_url,
    cover_url = EXCLUDED.cover_url,
    is_featured = EXCLUDED.is_featured,
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    bio = EXCLUDED.bio,
    member_type = EXCLUDED.member_type,
    years_experience = EXCLUDED.years_experience,
    website = EXCLUDED.website,
    profile_id = EXCLUDED.profile_id,
    skills = EXCLUDED.skills,
    education = EXCLUDED.education,
    work_experience = EXCLUDED.work_experience,
    projects = EXCLUDED.projects,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_directory_data ON public.members;
CREATE TRIGGER trg_sync_member_directory_data
  AFTER INSERT OR UPDATE OR DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_member_directory_data();

-- Backfill
INSERT INTO public.member_directory_data (
  id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, cover_url,
  is_featured, title, company, location, bio, member_type, years_experience,
  website, profile_id, skills, education, work_experience, projects, updated_at
)
SELECT
  id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, cover_url,
  COALESCE(is_featured, false), title, company, location, bio, member_type,
  years_experience, website, profile_id,
  COALESCE(skills, '{}'::text[]),
  COALESCE(education, '[]'::jsonb),
  COALESCE(work_experience, '[]'::jsonb),
  COALESCE(projects, '[]'::jsonb),
  now()
FROM public.members
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialty = EXCLUDED.specialty,
  linkedin_url = EXCLUDED.linkedin_url,
  joined_at = EXCLUDED.joined_at,
  avatar_url = EXCLUDED.avatar_url,
  cover_url = EXCLUDED.cover_url,
  is_featured = EXCLUDED.is_featured,
  title = EXCLUDED.title,
  company = EXCLUDED.company,
  location = EXCLUDED.location,
  bio = EXCLUDED.bio,
  member_type = EXCLUDED.member_type,
  years_experience = EXCLUDED.years_experience,
  website = EXCLUDED.website,
  profile_id = EXCLUDED.profile_id,
  skills = EXCLUDED.skills,
  education = EXCLUDED.education,
  work_experience = EXCLUDED.work_experience,
  projects = EXCLUDED.projects,
  updated_at = now();

ALTER TABLE public.member_directory_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_directory_data_select ON public.member_directory_data;
CREATE POLICY member_directory_data_select ON public.member_directory_data
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS member_directory_data_admin ON public.member_directory_data;
CREATE POLICY member_directory_data_admin ON public.member_directory_data
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

REVOKE ALL ON TABLE public.member_directory_data FROM PUBLIC;
GRANT SELECT ON TABLE public.member_directory_data TO anon, authenticated;

-- Recreate view as SECURITY INVOKER over public-safe table
DROP VIEW IF EXISTS public.member_directory;
CREATE VIEW public.member_directory
  WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  role,
  specialty,
  linkedin_url,
  joined_at,
  avatar_url,
  cover_url,
  is_featured,
  title,
  company,
  location,
  bio,
  member_type,
  years_experience,
  website,
  profile_id,
  skills,
  education,
  work_experience,
  projects
FROM public.member_directory_data;

GRANT SELECT ON public.member_directory TO anon, authenticated;
COMMENT ON VIEW public.member_directory IS
  'Public member directory (security_invoker). Reads member_directory_data — no email column.';

-- ── 2. Public author profiles data (no email / admin / tier) ──────────────────
CREATE TABLE IF NOT EXISTS public.author_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role text,
  company text,
  account_type text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.sync_author_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.author_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF COALESCE(NEW.is_active, true) = false THEN
    DELETE FROM public.author_profiles WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.author_profiles AS a (
    id, full_name, avatar_url, role, company, account_type, is_active, updated_at
  ) VALUES (
    NEW.id,
    NEW.full_name,
    NEW.avatar_url,
    NEW.role,
    NEW.company,
    NEW.account_type,
    COALESCE(NEW.is_active, true),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    company = EXCLUDED.company,
    account_type = EXCLUDED.account_type,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_author_profiles ON public.user_profiles;
CREATE TRIGGER trg_sync_author_profiles
  AFTER INSERT OR DELETE OR UPDATE OF full_name, avatar_url, role, company, account_type, is_active
  ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_author_profiles();

INSERT INTO public.author_profiles (
  id, full_name, avatar_url, role, company, account_type, is_active, updated_at
)
SELECT
  id, full_name, avatar_url, role, company, account_type,
  COALESCE(is_active, true), now()
FROM public.user_profiles
WHERE COALESCE(is_active, true) = true
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  company = EXCLUDED.company,
  account_type = EXCLUDED.account_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();

ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS author_profiles_select ON public.author_profiles;
CREATE POLICY author_profiles_select ON public.author_profiles
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS author_profiles_admin ON public.author_profiles;
CREATE POLICY author_profiles_admin ON public.author_profiles
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

REVOKE ALL ON TABLE public.author_profiles FROM PUBLIC;
GRANT SELECT ON TABLE public.author_profiles TO anon, authenticated;

-- public_author_profiles → invoker view (keeps existing frontend name)
DROP VIEW IF EXISTS public.public_author_profiles;
CREATE VIEW public.public_author_profiles
  WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  company,
  account_type
FROM public.author_profiles
WHERE is_active = true;

GRANT SELECT ON public.public_author_profiles TO anon, authenticated;
COMMENT ON VIEW public.public_author_profiles IS
  'Public author fields (security_invoker) over author_profiles — no email/PII.';

-- Optional alias view name some advisors/tools mention
DROP VIEW IF EXISTS public.author_profiles_view;
-- Do not create a view named author_profiles (conflicts with table). Table is the source.

-- ── 3. Harden base table privileges (email stays admin-only via RLS) ──────────
REVOKE ALL ON TABLE public.members FROM PUBLIC;
REVOKE ALL ON TABLE public.members FROM anon;
REVOKE ALL ON TABLE public.members FROM authenticated;
-- Authenticated clients may need INSERT/UPDATE only through controlled paths;
-- sync trigger is SECURITY DEFINER. Admin UI uses authenticated + admin RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO authenticated;
-- anon must NOT touch members directly (use member_directory view/table instead)

REVOKE ALL ON TABLE public.user_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.user_profiles FROM anon;
-- authenticated keeps access; RLS restricts to own row / admin
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_profiles TO authenticated;

-- ── 4. Revoke client execute on new sync helpers ──────────────────────────────
REVOKE ALL ON FUNCTION public.sync_member_directory_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_member_directory_data() FROM anon;
REVOKE ALL ON FUNCTION public.sync_member_directory_data() FROM authenticated;

REVOKE ALL ON FUNCTION public.sync_author_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_author_profiles() FROM anon;
REVOKE ALL ON FUNCTION public.sync_author_profiles() FROM authenticated;
