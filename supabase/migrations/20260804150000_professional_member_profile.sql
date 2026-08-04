-- Professional member profiles: cover photo + richer career details.
-- Source of truth: user_profiles → sync_member_from_profile → members → member_directory.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_years_experience_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_years_experience_check
  CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 80));

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_years_experience_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_years_experience_check
  CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 80));

DROP VIEW IF EXISTS public.member_directory;
CREATE VIEW public.member_directory AS
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
FROM public.members;

GRANT SELECT ON public.member_directory TO anon, authenticated;

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
    full_name, email, role, specialty, linkedin_url, avatar_url, cover_url, is_featured,
    title, company, location, bio, member_type, website, years_experience,
    skills, education, work_experience, projects, joined_at, profile_id
  ) VALUES (
    COALESCE(NULLIF(btrim(NEW.full_name), ''), split_part(member_email, '@', 1)),
    member_email,
    COALESCE(NULLIF(btrim(NEW.role), ''), 'Member'),
    NULLIF(btrim(COALESCE(NEW.specialty, '')), ''),
    NULLIF(btrim(COALESCE(NEW.linkedin_url, '')), ''),
    NULLIF(btrim(COALESCE(NEW.avatar_url, '')), ''),
    NULLIF(btrim(COALESCE(NEW.cover_url, '')), ''),
    COALESCE(NEW.is_admin, false),
    NULLIF(btrim(COALESCE(NEW.role, '')), ''),
    NULLIF(btrim(COALESCE(NEW.company, '')), ''),
    NULLIF(btrim(COALESCE(NEW.location, '')), ''),
    NULLIF(btrim(COALESCE(NEW.bio, '')), ''),
    CASE WHEN NEW.account_type = 'company' THEN 'company' ELSE 'individual' END,
    NULLIF(btrim(COALESCE(NEW.website_url, '')), ''),
    NEW.years_experience,
    COALESCE(NEW.skills, '{}'::text[]),
    COALESCE(NEW.education, '[]'::jsonb),
    COALESCE(NEW.work_experience, '[]'::jsonb),
    COALESCE(NEW.projects, '[]'::jsonb),
    COALESCE(NEW.created_at, now()),
    NEW.id
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    specialty = EXCLUDED.specialty,
    linkedin_url = EXCLUDED.linkedin_url,
    avatar_url = EXCLUDED.avatar_url,
    cover_url = EXCLUDED.cover_url,
    -- Keep admin featured; otherwise preserve existing featured flag.
    is_featured = CASE
      WHEN COALESCE(NEW.is_admin, false) THEN true
      ELSE public.members.is_featured
    END,
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    bio = EXCLUDED.bio,
    member_type = EXCLUDED.member_type,
    website = EXCLUDED.website,
    years_experience = EXCLUDED.years_experience,
    skills = EXCLUDED.skills,
    education = EXCLUDED.education,
    work_experience = EXCLUDED.work_experience,
    projects = EXCLUDED.projects,
    profile_id = EXCLUDED.profile_id;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN undefined_column THEN
    RETURN NEW;
END;
$$;
