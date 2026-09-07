-- Phase 5I — revoke PUBLIC/anon execute on Phase 5 staff and notify RPCs.
-- Corrective. Do not edit 4A–5H. No user data changes.

REVOKE ALL ON FUNCTION public.emit_event_notification(uuid, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.list_moderation_queue(text, text, text, text, timestamptz, timestamptz, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_moderation_trash(int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_moderation_action(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.review_verification_request(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.grant_platform_role(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_platform_role(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_my_notifications(int, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unread_notification_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_moderation_queue(text, text, text, text, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_moderation_trash(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_moderation_action(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_verification_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_platform_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_platform_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_notifications(int, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
