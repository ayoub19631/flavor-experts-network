-- Email delivery reliability
-- 1) Ensure Vault site_url
-- 2) Harden send_resend_email
-- 3) Welcome marks sent only when Resend request is queued
-- 4) Admin/service helper to resend pending welcomes

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'site_url') THEN
    PERFORM vault.create_secret(
      'https://flavorexpertsnetwork.com',
      'site_url',
      'Public site URL for branded email links'
    );
  END IF;
END;
$$;

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
  from_addr text;
BEGIN
  IF p_to IS NULL OR length(btrim(p_to)) = 0 THEN
    RAISE WARNING 'send_resend_email: empty recipient';
    RETURN NULL;
  END IF;

  api_key := public.get_resend_api_key();
  IF api_key IS NULL OR length(api_key) < 10 THEN
    RAISE WARNING 'Resend API key missing in vault';
    RETURN NULL;
  END IF;

  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_from' LIMIT 1),
    'Flavor Experts Network <noreply@nexusflavor.com>'
  ) INTO from_addr;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', from_addr,
      'to', jsonb_build_array(btrim(p_to)),
      'subject', p_subject,
      'html', p_html,
      'text', p_text
    )
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'send_resend_email: pg_net did not queue request for %', p_to;
  END IF;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_resend_email(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_resend_email(text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.send_resend_email(text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_resend_email(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  safe_name text := replace(
    coalesce(nullif(trim(NEW.full_name), ''), split_part(NEW.email, '@', 1), 'Member'),
    '<',
    ''
  );
  site_url text := coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'site_url' LIMIT 1),
    'https://flavorexpertsnetwork.com'
  );
  subject text := 'مرحباً بك في شبكة خبراء النكهات | Welcome to Flavor Experts Network';
  html text;
  plain text;
  request_id bigint;
BEGIN
  IF NEW.welcome_email_sent = true THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  site_url := rtrim(site_url, '/');

  html :=
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>Welcome</title></head>'
    || '<body style="margin:0;padding:0;background:#F3F4F6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#002D54">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:28px 12px"><tr><td align="center">'
    || '<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">'
    || '<tr><td style="background:#002D54;padding:28px 24px;color:#E1DDCF">'
    || '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:8px">شبكة خبراء النكهات</div>'
    || '<h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700">مرحباً بك، ' || safe_name || '</h1>'
    || '</td></tr>'
    || '<tr><td style="padding:28px 24px;font-size:15px;line-height:1.7;color:#1f2937">'
    || '<div dir="rtl" style="text-align:right;margin-bottom:28px">'
    || '<p style="margin:0 0 12px">أهلاً بك <strong>' || safe_name || '</strong>،</p>'
    || '<p style="margin:0 0 12px">يسعدنا انضمامك إلى <strong>شبكة خبراء النكهات</strong>.</p>'
    || '<p style="margin:0 0 16px">المنصة مجانية بالكامل للأفراد والشركات — بدون اشتراكات مدفوعة.</p>'
    || '<p style="margin:0 0 16px;font-size:14px">'
    || '<a href="' || site_url || '/terms" style="color:#002D54;font-weight:600">الشروط والأحكام</a> · '
    || '<a href="' || site_url || '/privacy" style="color:#002D54;font-weight:600">سياسة الخصوصية</a></p>'
    || '</div>'
    || '<hr style="border:none;border-top:1px solid #EEF2F7;margin:8px 0 24px"/>'
    || '<div dir="ltr" style="text-align:left">'
    || '<p style="margin:0 0 12px">Welcome, <strong>' || safe_name || '</strong>,</p>'
    || '<p style="margin:0 0 12px">We''re glad you''ve joined <strong>Flavor Experts Network</strong>.</p>'
    || '<p style="margin:0 0 16px">The platform is fully free for individuals and companies — no paid subscriptions.</p>'
    || '<p style="margin:0 0 20px;font-size:14px">'
    || '<a href="' || site_url || '/terms" style="color:#002D54;font-weight:600">Terms of Service</a> · '
    || '<a href="' || site_url || '/privacy" style="color:#002D54;font-weight:600">Privacy Policy</a></p>'
    || '<p style="margin:0"><a href="' || site_url || '/dashboard" style="display:inline-block;background:#002D54;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open your dashboard</a></p>'
    || '</div></td></tr>'
    || '<tr><td style="padding:18px 24px 26px;border-top:1px solid #EEF2F7;font-size:12px;color:#6b7280">'
    || '© ' || extract(year from now())::text || ' Flavor Experts Network'
    || '</td></tr></table></td></tr></table></body></html>';

  plain :=
    'أهلاً بك ' || safe_name || ' في شبكة خبراء النكهات.' || E'\n'
    || 'المنصة مجانية بالكامل للأفراد والشركات.' || E'\n'
    || 'Welcome to Flavor Experts Network, ' || safe_name || '.' || E'\n'
    || site_url || '/dashboard';

  request_id := public.send_resend_email(NEW.email, subject, html, plain);

  IF request_id IS NOT NULL THEN
    UPDATE public.user_profiles SET welcome_email_sent = true WHERE id = NEW.id;
  ELSE
    RAISE WARNING 'welcome email not queued for %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_welcome_email() TO service_role;

CREATE OR REPLACE FUNCTION public.resend_pending_welcome_emails(p_limit int DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
  request_id bigint;
  safe_name text;
BEGIN
  FOR r IN
    SELECT id, email, full_name
    FROM public.user_profiles
    WHERE COALESCE(welcome_email_sent, false) = false
      AND email IS NOT NULL
      AND length(btrim(email)) > 0
    ORDER BY created_at ASC
    LIMIT greatest(coalesce(p_limit, 50), 1)
  LOOP
    safe_name := replace(
      coalesce(nullif(trim(r.full_name), ''), split_part(r.email, '@', 1), 'Member'),
      '<',
      ''
    );
    request_id := public.send_resend_email(
      r.email,
      'مرحباً بك في شبكة خبراء النكهات | Welcome to Flavor Experts Network',
      '<p dir="rtl">أهلاً بك <strong>' || safe_name || '</strong> في شبكة خبراء النكهات.</p>'
        || '<p dir="rtl">المنصة مجانية بالكامل للأفراد والشركات.</p>'
        || '<p>Welcome to Flavor Experts Network. Fully free for individuals and companies.</p>'
        || '<p><a href="https://flavorexpertsnetwork.com/dashboard">Open dashboard</a></p>',
      'Welcome to Flavor Experts Network. https://flavorexpertsnetwork.com/dashboard'
    );
    IF request_id IS NOT NULL THEN
      UPDATE public.user_profiles SET welcome_email_sent = true WHERE id = r.id;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.resend_pending_welcome_emails(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resend_pending_welcome_emails(int) FROM anon;
REVOKE ALL ON FUNCTION public.resend_pending_welcome_emails(int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resend_pending_welcome_emails(int) TO service_role;

COMMENT ON FUNCTION public.resend_pending_welcome_emails(int) IS
  'Queues welcome emails for profiles where welcome_email_sent is still false.';
