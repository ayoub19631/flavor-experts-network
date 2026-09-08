-- Phase 8G — allow public catalog listings to resolve Verified without
-- granting anon SELECT on user_profiles or platform_roles.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE OR REPLACE FUNCTION public.marketplace_is_verified_company(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_uid IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.platform_roles
      WHERE user_id = p_uid AND role = 'verified_company'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = p_uid AND coalesce(is_verified, false) = true
    )
  );
$$;

REVOKE ALL ON FUNCTION public.marketplace_is_verified_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_is_verified_company(uuid) TO anon, authenticated;
