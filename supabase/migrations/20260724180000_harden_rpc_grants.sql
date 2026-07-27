-- Harden EXECUTE grants on SECURITY DEFINER helpers flagged by advisors.
-- resolve_resource_url requires auth (premium links must not be public).

REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_subscription() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;

REVOKE ALL ON FUNCTION public.is_email_verified() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_email_verified() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_resource_url(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_resource_url(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO authenticated;
