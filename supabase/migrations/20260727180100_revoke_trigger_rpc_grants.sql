-- Revoke public EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.bump_topic_on_reply() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_topic_on_reply() FROM anon;
REVOKE ALL ON FUNCTION public.bump_topic_on_reply() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bump_topic_on_reply() TO service_role;

REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_welcome_email() TO service_role;

REVOKE ALL ON FUNCTION public.notify_consultation_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_consultation_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_consultation_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_consultation_email() TO service_role;

REVOKE ALL ON FUNCTION public.notify_newsletter_welcome() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_newsletter_welcome() FROM anon;
REVOKE ALL ON FUNCTION public.notify_newsletter_welcome() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_newsletter_welcome() TO service_role;

REVOKE ALL ON FUNCTION public.notify_contact_message_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_contact_message_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_contact_message_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_contact_message_email() TO service_role;

REVOKE ALL ON FUNCTION public.notify_enterprise_request_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_enterprise_request_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_enterprise_request_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_enterprise_request_email() TO service_role;
