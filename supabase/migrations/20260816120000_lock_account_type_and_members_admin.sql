-- Lock account_type on client inserts, preserve company signup via handle_new_user,
-- and add missing members admin UPDATE/DELETE policies.

-- ── 1. Privilege trigger: clients cannot self-assign company / admin ──────────
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
      -- Client inserts cannot choose company. handle_new_user sets
      -- app.allow_account_type so metadata-driven company signup still works.
      IF current_setting('app.allow_account_type', true) IS DISTINCT FROM '1' THEN
        NEW.account_type := 'individual';
      END IF;
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

-- ── 2. handle_new_user: allow metadata account_type on first create only ──────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  parsed_name text;
  parsed_avatar text;
  parsed_linkedin text;
  parsed_account_type text;
  parsed_website text;
  parsed_phone text;
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
  parsed_phone := COALESCE(NULLIF(trim(meta->>'phone'), ''), '');

  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url,
    role, company, location, bio,
    account_type, linkedin_url, website_url, phone,
    subscription_tier, subscription_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    parsed_name,
    parsed_avatar,
    COALESCE(NULLIF(trim(meta->>'role'), ''), NULLIF(trim(meta->>'industry'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'company_name'), ''), NULLIF(trim(meta->>'company'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'location'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'bio'), ''), ''),
    parsed_account_type,
    parsed_linkedin,
    parsed_website,
    parsed_phone,
    'free',
    true
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
    -- Never upgrade/downgrade account_type after the first row exists
    website_url = CASE
      WHEN EXCLUDED.website_url <> '' THEN EXCLUDED.website_url
      ELSE user_profiles.website_url
    END,
    phone = CASE
      WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone
      ELSE user_profiles.phone
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ── 3. RLS: client inserts cannot claim company ───────────────────────────────
DROP POLICY IF EXISTS profile_insert ON public.user_profiles;
CREATE POLICY profile_insert ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = id
    AND COALESCE(account_type, 'individual') = 'individual'
    AND COALESCE(is_admin, false) = false
  );

-- ── 4. Members admin UPDATE / DELETE (missing from migration-only DBs) ────────
DROP POLICY IF EXISTS members_admin_update ON public.members;
CREATE POLICY members_admin_update ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS members_admin_delete ON public.members;
CREATE POLICY members_admin_delete ON public.members
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());
