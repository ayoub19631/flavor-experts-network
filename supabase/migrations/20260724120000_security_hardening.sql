-- Security hardening: privilege escalation, RLS, email verification, OAuth profiles, premium links
-- Idempotent — safe to re-run

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1 — Prevent self-service privilege / subscription escalation
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_platform_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.is_admin := false;
      NEW.subscription_active := false;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.is_admin := OLD.is_admin;
      NEW.subscription_active := OLD.subscription_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2 — Harden RLS, storage, function permissions
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "members_insert" ON public.members;
CREATE POLICY "members_insert"
  ON public.members FOR INSERT
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = 'avatars'
    )
  );

DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (auth.uid() = owner AND (storage.foldername(name))[1] = 'avatars')
    )
  );

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3 — Email verification helpers
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_email_verified() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO service_role;

DROP POLICY IF EXISTS "enterprise_insert" ON public.enterprise_requests;
CREATE POLICY "enterprise_insert"
  ON public.enterprise_requests FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    OR public.is_platform_admin()
    OR public.is_email_verified()
  );

-- Soft anti-spam: require non-empty fields (already enforced by NOT NULL in schema if present)
-- Rate limiting should be handled at Edge Function / WAF layer

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 4 — OAuth profile creation
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  provider text := COALESCE(NEW.raw_app_meta_data->>'provider', '');
  parsed_name text;
  parsed_avatar text;
  parsed_linkedin text;
  parsed_account_type text;
BEGIN
  parsed_name := COALESCE(
    meta->>'full_name',
    meta->>'name',
    NULLIF(trim(COALESCE(meta->>'given_name', '') || ' ' || COALESCE(meta->>'family_name', '')), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'User'
  );

  parsed_avatar := COALESCE(meta->>'avatar_url', meta->>'picture', '');

  parsed_linkedin := COALESCE(
    meta->>'linkedin_url',
    meta->>'profile',
    CASE WHEN provider IN ('linkedin', 'linkedin_oidc') THEN meta->>'sub' ELSE '' END,
    ''
  );

  parsed_account_type := COALESCE(meta->>'account_type', 'individual');

  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url,
    role, company, location, bio,
    account_type, linkedin_url, subscription_tier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    parsed_name,
    parsed_avatar,
    COALESCE(meta->>'role', ''),
    COALESCE(meta->>'company_name', meta->>'company', ''),
    COALESCE(meta->>'location', ''),
    COALESCE(meta->>'bio', ''),
    parsed_account_type,
    parsed_linkedin,
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    avatar_url = CASE
      WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url
      ELSE user_profiles.avatar_url
    END,
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    updated_at = now();

  RETURN NEW;
END;
$$;
