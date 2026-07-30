-- Trigger-only: must not be callable via PostgREST
REVOKE ALL ON FUNCTION public.sync_member_from_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_member_from_profile() FROM anon;
REVOKE ALL ON FUNCTION public.sync_member_from_profile() FROM authenticated;
