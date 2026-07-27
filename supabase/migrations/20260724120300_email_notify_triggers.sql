-- Email notification triggers (Vault secret must already exist: resend_api_key)
-- Do NOT put API keys in this file.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_resend_api_key()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'resend_api_key'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_resend_api_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_resend_api_key() FROM anon;
REVOKE ALL ON FUNCTION public.get_resend_api_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_resend_api_key() TO service_role;

CREATE OR REPLACE FUNCTION public.send_resend_email(
  p_to text,
  p_subject text,
  p_html text,
  p_text text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  api_key text;
  request_id bigint;
  from_addr text := 'Flavor Experts <onboarding@resend.dev>';
BEGIN
  api_key := public.get_resend_api_key();
  IF api_key IS NULL OR length(api_key) < 10 THEN
    RAISE WARNING 'Resend API key missing in vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', from_addr,
      'to', jsonb_build_array(p_to),
      'subject', p_subject,
      'html', p_html,
      'text', p_text
    )
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_resend_email(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_resend_email(text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.send_resend_email(text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_resend_email(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_contact_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  admin_email text := 'ayobe895@gmail.com';
BEGIN
  PERFORM public.send_resend_email(
    admin_email,
    '[Contact] ' || coalesce(NEW.subject, 'New message'),
    '<p><strong>From:</strong> ' || replace(NEW.name, '<', '') || ' &lt;' || replace(NEW.email, '<', '') || '&gt;</p><p><strong>Subject:</strong> ' || replace(coalesce(NEW.subject, ''), '<', '') || '</p><pre>' || replace(NEW.message, '<', '') || '</pre>',
    'From: ' || NEW.name || ' <' || NEW.email || E'>\nSubject: ' || coalesce(NEW.subject, '') || E'\n\n' || NEW.message
  );

  IF lower(NEW.email) = lower(admin_email) THEN
    PERFORM public.send_resend_email(
      NEW.email,
      'We received your message — Flavor Experts Network',
      '<p>Hi ' || replace(NEW.name, '<', '') || ',</p><p>Thank you for contacting Flavor Experts Network.</p>',
      'Thank you for contacting Flavor Experts Network.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_contact_message_email ON public.contact_messages;
CREATE TRIGGER trg_notify_contact_message_email
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contact_message_email();

CREATE OR REPLACE FUNCTION public.notify_enterprise_request_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  admin_email text := 'ayobe895@gmail.com';
BEGIN
  PERFORM public.send_resend_email(
    admin_email,
    '[Enterprise] ' || NEW.company_name,
    '<p><strong>Company:</strong> ' || replace(NEW.company_name, '<', '') || '</p><p><strong>Contact:</strong> ' || replace(NEW.contact_name, '<', '') || ' &lt;' || replace(NEW.email, '<', '') || '&gt;</p><pre>' || replace(coalesce(NEW.message, ''), '<', '') || '</pre>',
    'Company: ' || NEW.company_name || E'\nContact: ' || NEW.contact_name || ' <' || NEW.email || E'>\n\n' || coalesce(NEW.message, '')
  );

  IF lower(NEW.email) = lower(admin_email) THEN
    PERFORM public.send_resend_email(
      NEW.email,
      'Enterprise request received — Flavor Experts Network',
      '<p>We received your enterprise request.</p>',
      'We received your enterprise request.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_enterprise_request_email ON public.enterprise_requests;
CREATE TRIGGER trg_notify_enterprise_request_email
  AFTER INSERT ON public.enterprise_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_enterprise_request_email();
