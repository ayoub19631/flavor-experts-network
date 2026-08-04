-- Platform is fully free for individuals and companies.
-- Any authenticated user has full access previously gated by paid tiers.

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (select auth.uid()) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_subscription() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO service_role;
