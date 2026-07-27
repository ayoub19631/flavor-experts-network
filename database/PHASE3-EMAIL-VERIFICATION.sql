-- Require verified email for authenticated writes (except admins)
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

-- Block unverified users from submitting enterprise requests while logged in
DROP POLICY IF EXISTS "enterprise_insert" ON public.enterprise_requests;
CREATE POLICY "enterprise_insert"
  ON public.enterprise_requests FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    OR public.is_platform_admin()
    OR public.is_email_verified()
  );
