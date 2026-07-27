-- Drop scaffold always-true INSERT policies + tighten grants
DROP POLICY IF EXISTS "messages_public_insert" ON public.contact_messages;
DROP POLICY IF EXISTS "resources_public_insert" ON public.educational_resources;
DROP POLICY IF EXISTS "enterprise_public_insert" ON public.enterprise_requests;
DROP POLICY IF EXISTS "news_public_insert" ON public.industry_news;
DROP POLICY IF EXISTS "members_public_insert" ON public.members;

DROP POLICY IF EXISTS "messages_insert" ON public.contact_messages;
CREATE POLICY "messages_insert"
  ON public.contact_messages FOR INSERT
  WITH CHECK (
    length(btrim(coalesce(name, ''))) >= 2
    AND length(btrim(coalesce(email, ''))) >= 5
    AND length(btrim(coalesce(message, ''))) >= 5
  );

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

REVOKE ALL ON FUNCTION public.is_email_verified() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_email_verified() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO service_role;

REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_subscription() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO service_role;

REVOKE ALL ON FUNCTION public.resolve_resource_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO service_role;
