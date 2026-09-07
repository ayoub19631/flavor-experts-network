-- Phase 7G — let guest RLS evaluate has_active_subscription() instead of erroring.
-- The function returns false when auth.uid() is null, so this does not open paid rows.
-- Apply after 20260908160000. No user-data changes. No hard deletes.
SET LOCAL statement_timeout = '15s';

REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO anon, authenticated, service_role;
