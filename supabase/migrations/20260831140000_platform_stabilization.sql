-- Phase 1 — platform stabilization
-- Reversible: drop added columns / functions / view overlays; restore prior member_directory.
-- Does not delete users, posts, courses, jobs, or files.

-- ── Profile fields ───────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferred_language text,
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_type text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS adult_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_profiles.is_test_account IS
  'Internal QA flag. Hidden from public directory. Never delete the row.';
COMMENT ON COLUMN public.user_profiles.is_verified IS
  'Admin-set verification status. verification_type + verified_at record how/when.';
COMMENT ON COLUMN public.user_profiles.preferred_language IS
  'UI language (en/ar/…). Signed-in persistence; guests use localStorage.';

CREATE INDEX IF NOT EXISTS user_profiles_test_account_idx
  ON public.user_profiles (is_test_account)
  WHERE is_test_account = true;
CREATE INDEX IF NOT EXISTS user_profiles_country_idx
  ON public.user_profiles (country)
  WHERE country IS NOT NULL AND country <> '';
CREATE INDEX IF NOT EXISTS user_profiles_preferred_language_idx
  ON public.user_profiles (preferred_language)
  WHERE preferred_language IS NOT NULL;

-- Mark obvious QA accounts. Reversible: SET is_test_account = false.
UPDATE public.user_profiles
SET is_test_account = true
WHERE is_test_account = false
  AND (
    email ILIKE '%companyqa%'
    OR email ILIKE '%+qa%'
    OR coalesce(full_name, '') ILIKE '%companyqa%'
    OR coalesce(company, '') ILIKE '%companyqa%'
    OR coalesce(full_name, '') ~* '(qaautomation|\btest account\b|\bqa user\b)'
  );

-- ── handle_new_user: persist language, country, role, terms, adult ───────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  parsed_name text;
  parsed_avatar text;
  parsed_linkedin text;
  parsed_account_type text;
  parsed_website text;
  parsed_phone text;
  parsed_country text;
  parsed_lang text;
  parsed_role text;
  terms_ok boolean;
  adult_ok boolean;
BEGIN
  PERFORM set_config('app.allow_account_type', '1', true);

  parsed_name := COALESCE(
    NULLIF(trim(meta->>'full_name'), ''),
    NULLIF(trim(meta->>'name'), ''),
    NULLIF(trim(COALESCE(meta->>'given_name', '') || ' ' || COALESCE(meta->>'family_name', '')), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  parsed_avatar := COALESCE(NULLIF(trim(meta->>'avatar_url'), ''), NULLIF(trim(meta->>'picture'), ''), '');

  parsed_linkedin := COALESCE(
    NULLIF(trim(meta->>'linkedin_url'), ''),
    CASE
      WHEN COALESCE(meta->>'profile', '') ILIKE '%linkedin.com%' THEN trim(meta->>'profile')
      ELSE NULL
    END,
    ''
  );

  parsed_account_type := CASE
    WHEN lower(COALESCE(meta->>'account_type', 'individual')) = 'company' THEN 'company'
    ELSE 'individual'
  END;

  parsed_website := COALESCE(
    NULLIF(trim(meta->>'website_url'), ''),
    NULLIF(trim(meta->>'website'), ''),
    ''
  );
  IF parsed_website <> '' AND parsed_website !~* '^https://' THEN
    parsed_website := 'https://' || regexp_replace(parsed_website, '^https?://', '', 'i');
  END IF;
  IF parsed_website <> '' AND parsed_website !~* '^https://' THEN
    parsed_website := '';
  END IF;

  parsed_phone := COALESCE(NULLIF(trim(meta->>'phone'), ''), '');
  parsed_country := NULLIF(trim(meta->>'country'), '');
  parsed_lang := lower(NULLIF(trim(meta->>'preferred_language'), ''));
  IF parsed_lang IS NOT NULL AND parsed_lang NOT IN ('en', 'ar', 'fr', 'es', 'de', 'tr', 'zh') THEN
    parsed_lang := 'en';
  END IF;
  parsed_role := COALESCE(NULLIF(trim(meta->>'role'), ''), NULLIF(trim(meta->>'industry'), ''), '');

  terms_ok := COALESCE((meta->>'terms_accepted')::boolean, false)
    OR NULLIF(trim(meta->>'terms_version'), '') IS NOT NULL;
  adult_ok := COALESCE((meta->>'adult_confirmed')::boolean, false)
    OR NULLIF(trim(meta->>'adult_confirmed_at'), '') IS NOT NULL;

  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url,
    role, company, location, bio,
    account_type, linkedin_url, website_url, phone,
    subscription_tier, subscription_active,
    country, preferred_language, specialty,
    terms_accepted_at, terms_version, adult_confirmed_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    parsed_name,
    parsed_avatar,
    parsed_role,
    COALESCE(NULLIF(trim(meta->>'company_name'), ''), NULLIF(trim(meta->>'company'), ''), ''),
    COALESCE(parsed_country, NULLIF(trim(meta->>'location'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'bio'), ''), ''),
    parsed_account_type,
    parsed_linkedin,
    NULLIF(parsed_website, ''),
    parsed_phone,
    'free',
    true,
    parsed_country,
    parsed_lang,
    NULLIF(trim(meta->>'specialty'), ''),
    CASE WHEN terms_ok THEN now() ELSE NULL END,
    NULLIF(trim(meta->>'terms_version'), ''),
    CASE WHEN adult_ok THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
    avatar_url = CASE
      WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url
      ELSE user_profiles.avatar_url
    END,
    email = COALESCE(NULLIF(EXCLUDED.email, ''), user_profiles.email),
    company = CASE
      WHEN EXCLUDED.company <> '' THEN EXCLUDED.company
      ELSE user_profiles.company
    END,
    account_type = CASE
      WHEN EXCLUDED.account_type = 'company' THEN 'company'
      ELSE user_profiles.account_type
    END,
    website_url = CASE
      WHEN EXCLUDED.website_url IS NOT NULL AND EXCLUDED.website_url <> '' THEN EXCLUDED.website_url
      ELSE user_profiles.website_url
    END,
    phone = CASE
      WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone
      ELSE user_profiles.phone
    END,
    country = COALESCE(EXCLUDED.country, user_profiles.country),
    preferred_language = COALESCE(EXCLUDED.preferred_language, user_profiles.preferred_language),
    specialty = COALESCE(EXCLUDED.specialty, user_profiles.specialty),
    role = CASE WHEN EXCLUDED.role <> '' THEN EXCLUDED.role ELSE user_profiles.role END,
    location = CASE
      WHEN EXCLUDED.location <> '' THEN EXCLUDED.location
      ELSE user_profiles.location
    END,
    terms_accepted_at = COALESCE(user_profiles.terms_accepted_at, EXCLUDED.terms_accepted_at),
    terms_version = COALESCE(EXCLUDED.terms_version, user_profiles.terms_version),
    adult_confirmed_at = COALESCE(user_profiles.adult_confirmed_at, EXCLUDED.adult_confirmed_at),
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- ── Prevent clients from self-granting admin / verification / test flags ─────
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  NEW.is_admin := OLD.is_admin;
  NEW.is_test_account := OLD.is_test_account;
  NEW.is_verified := OLD.is_verified;
  NEW.verification_type := OLD.verification_type;
  NEW.verified_at := OLD.verified_at;
  NEW.platform_preview_access := OLD.platform_preview_access;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.subscription_active := OLD.subscription_active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_privileged_profile_columns ON public.user_profiles;
CREATE TRIGGER trg_protect_privileged_profile_columns
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- ── Public directory: hide test / suspended / incomplete ─────────────────────
CREATE OR REPLACE VIEW public.member_directory
  WITH (security_invoker = true)
AS
SELECT
  d.id, d.full_name, d.role, d.specialty, d.linkedin_url, d.joined_at, d.avatar_url, d.cover_url,
  d.is_featured, d.title, d.company, d.location, d.bio, d.member_type, d.years_experience,
  d.website, d.profile_id, d.skills, d.education, d.work_experience, d.projects
FROM public.member_directory_data d
LEFT JOIN public.user_profiles p ON p.id = d.id
WHERE NOT public.is_hidden_test_member(d.full_name, d.company, d.bio)
  AND COALESCE(p.is_test_account, false) = false
  AND COALESCE(p.is_active, true) = true
  AND NULLIF(btrim(COALESCE(d.full_name, '')), '') IS NOT NULL
  AND lower(btrim(d.full_name)) NOT IN ('user', 'test', 'admin', 'member');

GRANT SELECT ON public.member_directory TO anon, authenticated;

-- ── Admin-only quality report (no automatic merges, no deletes) ──────────────
CREATE OR REPLACE FUNCTION public.admin_member_quality_report()
RETURNS TABLE (
  profile_id uuid,
  email text,
  full_name text,
  company text,
  account_type text,
  is_test_account boolean,
  is_active boolean,
  is_verified boolean,
  category text,
  detail text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.company,
      p.account_type,
      p.is_test_account,
      COALESCE(p.is_active, true) AS is_active,
      p.is_verified,
      p.created_at,
      p.role,
      p.specialty,
      p.country
    FROM public.user_profiles p
  ),
  flagged AS (
    SELECT
      b.id,
      b.email,
      b.full_name,
      b.company,
      b.account_type,
      b.is_test_account,
      b.is_active,
      b.is_verified,
      CASE
        WHEN b.is_test_account OR b.email ILIKE '%companyqa%' OR coalesce(b.full_name, '') ILIKE '%companyqa%'
          THEN 'qa_test'
        WHEN b.is_active = false THEN 'suspended'
        WHEN NULLIF(btrim(COALESCE(b.full_name, '')), '') IS NULL
          OR (NULLIF(btrim(COALESCE(b.role, '')), '') IS NULL
              AND NULLIF(btrim(COALESCE(b.specialty, '')), '') IS NULL
              AND NULLIF(btrim(COALESCE(b.country, '')), '') IS NULL)
          THEN 'incomplete'
        ELSE NULL
      END AS category,
      CASE
        WHEN b.is_test_account THEN 'Flagged is_test_account'
        WHEN b.email ILIKE '%companyqa%' THEN 'Email contains companyqa'
        WHEN b.is_active = false THEN 'is_active = false'
        ELSE 'Missing professional profile fields'
      END AS detail,
      b.created_at
    FROM base b
  ),
  dupes AS (
    SELECT
      b.id,
      b.email,
      b.full_name,
      b.company,
      b.account_type,
      b.is_test_account,
      b.is_active,
      b.is_verified,
      'duplicate_candidate'::text AS category,
      'Same normalized full name as another account — review only, do not auto-merge' AS detail,
      b.created_at
    FROM base b
    WHERE NULLIF(btrim(COALESCE(b.full_name, '')), '') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM base o
        WHERE o.id <> b.id
          AND lower(btrim(o.full_name)) = lower(btrim(b.full_name))
      )
  )
  SELECT f.id, f.email, f.full_name, f.company, f.account_type,
         f.is_test_account, f.is_active, f.is_verified, f.category, f.detail, f.created_at
  FROM flagged f
  WHERE f.category IS NOT NULL
  UNION ALL
  SELECT d.id, d.email, d.full_name, d.company, d.account_type,
         d.is_test_account, d.is_active, d.is_verified, d.category, d.detail, d.created_at
  FROM dupes d
  ORDER BY 9, 11 DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_member_quality_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_quality_report() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_test_account(p_user_id uuid, p_is_test boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.user_profiles
  SET is_test_account = p_is_test, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_test_account(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_test_account(uuid, boolean) TO authenticated;

-- ── Public live stats (real counts only) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.platform_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'public_members', (SELECT count(*) FROM public.member_directory),
    'published_courses', (
      SELECT count(*) FROM public.courses c
      WHERE COALESCE(c.is_published, false) = true
         OR COALESCE(c.status, '') = 'published'
    ),
    'open_jobs', (
      SELECT count(*) FROM public.job_listings j
      WHERE COALESCE(j.is_published, true) = true
        AND COALESCE(j.status, 'open') IN ('open', 'published', 'active')
    ),
    'learning_paths', (SELECT count(*) FROM public.learning_paths)
  );
$$;

GRANT EXECUTE ON FUNCTION public.platform_public_stats() TO anon, authenticated;
