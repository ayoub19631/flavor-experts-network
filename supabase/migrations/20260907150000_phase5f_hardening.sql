-- Phase 5F — corrective hardening after 5A–5E.
-- Do not edit earlier Phase 5 files. Local/staging apply only. No hard deletes.

CREATE OR REPLACE FUNCTION public.safe_app_path(p_link text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_link IS NULL OR length(trim(p_link)) = 0 OR length(p_link) > 240 THEN
    RETURN NULL;
  END IF;
  IF p_link LIKE '//%' OR p_link LIKE '%\\%' OR p_link ~ '\s' THEN
    RETURN NULL;
  END IF;
  IF p_link ~ '^[a-zA-Z][a-zA-Z0-9+.-]*:' THEN
    RETURN NULL;
  END IF;
  IF p_link ~ '^/[A-Za-z0-9][A-Za-z0-9/_?#=&%.,-]*$' THEN
    RETURN p_link;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_event_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_link text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  prefs public.notification_preferences%ROWTYPE;
  type_enabled boolean := true;
  safe_link text := public.safe_app_path(p_link);
BEGIN
  -- Clients must never call this function. Recipient, actor, and link are server-owned.
  IF p_user_id IS NULL OR p_title IS NULL OR p_body IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND public.is_blocked_pair(p_user_id, p_actor_id) THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND public.is_muted_by(p_user_id, p_actor_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  IF FOUND THEN
    IF prefs.in_app = false THEN
      RETURN NULL;
    END IF;
    IF prefs.types ? p_type THEN
      type_enabled := COALESCE((prefs.types ->> p_type)::boolean, true);
    END IF;
    IF type_enabled = false THEN
      RETURN NULL;
    END IF;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO new_id FROM public.notifications WHERE idempotency_key = p_idempotency_key;
    IF new_id IS NOT NULL THEN
      RETURN new_id;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.notifications (
      user_id, title, body, type, link, actor_id, entity_type, entity_id, idempotency_key
    ) VALUES (
      p_user_id, p_title, p_body, p_type, safe_link, p_actor_id, p_entity_type, p_entity_id, p_idempotency_key
    )
    RETURNING id INTO new_id;
  EXCEPTION WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT id INTO new_id FROM public.notifications WHERE idempotency_key = p_idempotency_key;
    END IF;
    RETURN new_id;
  END;

  IF new_id IS NOT NULL THEN
    INSERT INTO public.notification_deliveries (notification_id, channel, status, error)
    VALUES (new_id, 'in_app', 'sent', NULL);
    IF COALESCE(prefs.email, false) THEN
      INSERT INTO public.notification_deliveries (notification_id, channel, status, error)
      VALUES (new_id, 'email', 'skipped', 'email_adapter_disabled');
    END IF;
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_event_notification(uuid, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.safe_app_path(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_access_verification_object(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_path IS NOT NULL
    AND p_path NOT LIKE '%..%'
    AND p_path NOT LIKE '%\\%'
    AND (
      p_path LIKE ((SELECT auth.uid())::text || '/%')
      OR public.has_capability('review_verification')
    );
$$;

CREATE OR REPLACE FUNCTION public.guard_verification_document_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.storage_path IS NULL
     OR NEW.storage_path LIKE '%..%'
     OR NEW.storage_path LIKE '%\\%'
     OR NEW.storage_path NOT LIKE ((SELECT auth.uid())::text || '/%') THEN
    RAISE EXCEPTION 'Verification documents must stay under the owner path.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_verification_document_path ON public.verification_documents;
CREATE TRIGGER trg_guard_verification_document_path
  BEFORE INSERT OR UPDATE OF storage_path ON public.verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_verification_document_path();

GRANT EXECUTE ON FUNCTION public.can_access_verification_object(text) TO authenticated;
