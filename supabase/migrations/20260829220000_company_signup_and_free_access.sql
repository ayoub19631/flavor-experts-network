-- Company signup claim + free-period access + hook-safe member sync

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_platform_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.is_admin := false;
      NEW.platform_preview_access := false;
      NEW.subscription_active := true;
      IF current_setting('app.allow_account_type', true) IS DISTINCT FROM '1' THEN
        NEW.account_type := 'individual';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.is_admin := OLD.is_admin;
      NEW.platform_preview_access := OLD.platform_preview_access;
      NEW.subscription_active := OLD.subscription_active;
      IF current_setting('app.allow_account_type', true) IS DISTINCT FROM '1' THEN
        NEW.account_type := OLD.account_type;
      ELSIF OLD.account_type = 'company' THEN
        NEW.account_type := 'company';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_company_account(
  p_company text,
  p_website text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_industry text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  safe_website text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  safe_website := NULLIF(btrim(COALESCE(p_website, '')), '');
  IF safe_website IS NOT NULL AND safe_website !~* '^https://' THEN
    safe_website := 'https://' || regexp_replace(safe_website, '^https?://', '', 'i');
  END IF;
  IF safe_website IS NOT NULL AND safe_website !~* '^https://' THEN
    safe_website := NULL;
  END IF;

  PERFORM set_config('app.allow_account_type', '1', true);

  UPDATE public.user_profiles
  SET
    account_type = 'company',
    company = COALESCE(NULLIF(btrim(p_company), ''), company),
    website_url = COALESCE(safe_website, website_url),
    phone = COALESCE(NULLIF(btrim(COALESCE(p_phone, '')), ''), phone),
    role = COALESCE(NULLIF(btrim(COALESCE(p_industry, '')), ''), role),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_company_account(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_company_account(text, text, text, text) TO authenticated;

-- Public beta: the live product is fully free. Any signed-in user has access.
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (select auth.uid()) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.sync_member_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  WHEN check_violation THEN
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_topic_moderation_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_topic_moderation_columns() FROM anon;
REVOKE ALL ON FUNCTION public.protect_topic_moderation_columns() FROM authenticated;
