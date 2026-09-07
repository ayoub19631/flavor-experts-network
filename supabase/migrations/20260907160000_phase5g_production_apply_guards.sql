-- Phase 5G — apply guards for the existing Production database.
-- Corrective only. Do not edit 4A–5F. No DROP TABLE. No hard deletes.
-- Does not grant roles and does not change existing platform_roles rows.

-- Legacy forum email trigger can still send Resend mail after 5A in-app notify exists.
DROP TRIGGER IF EXISTS trg_notify_forum_reply_email ON public.forum_replies;

-- Audit rows are written by SECURITY DEFINER functions, not by client INSERT.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;

-- Preflight showed anon/authenticated table grants on notifications, including TRUNCATE.
-- Recipients keep SELECT/UPDATE/DELETE via RLS. Clients must not INSERT or TRUNCATE.
REVOKE INSERT, TRUNCATE ON public.notifications FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE, SELECT ON public.notifications FROM PUBLIC, anon;

-- Keep verification documents private if the bucket already exists.
UPDATE storage.buckets
SET public = false
WHERE id = 'verifications' OR name = 'verifications';
