-- Revoke PostgREST RPC on trigger-only email functions
REVOKE ALL ON FUNCTION public.notify_contact_message_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_contact_message_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_contact_message_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_contact_message_email() TO service_role;

REVOKE ALL ON FUNCTION public.notify_enterprise_request_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_enterprise_request_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_enterprise_request_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_enterprise_request_email() TO service_role;
