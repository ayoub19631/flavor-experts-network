ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

CREATE OR REPLACE FUNCTION public.accept_platform_terms(p_version text DEFAULT '2026-08-30')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.user_profiles
  SET
    terms_accepted_at = now(),
    terms_version = COALESCE(NULLIF(btrim(p_version), ''), '2026-08-30'),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.accept_platform_terms(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_platform_terms(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_platform_terms(text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_signup_terms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  IF COALESCE(meta->>'terms_accepted', '') IN ('true', '1', 'yes') THEN
    UPDATE public.user_profiles
    SET
      terms_accepted_at = COALESCE(terms_accepted_at, now()),
      terms_version = COALESCE(NULLIF(meta->>'terms_version', ''), '2026-08-30')
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_signup_terms ON auth.users;
CREATE TRIGGER trg_apply_signup_terms
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_signup_terms();

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
  subject text := 'مرحباً بك في شبكة خبراء النكهات | Welcome — Terms included';
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
    || '<table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">'
    || '<tr><td style="background:#002D54;padding:28px 24px;color:#E1DDCF">'
    || '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:8px">شبكة خبراء النكهات</div>'
    || '<h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700">مرحباً بك، ' || safe_name || '</h1>'
    || '</td></tr>'
    || '<tr><td style="padding:28px 24px;font-size:15px;line-height:1.7;color:#1f2937">'
    || '<div dir="rtl" style="text-align:right;margin-bottom:24px">'
    || '<p>أهلاً بك <strong>' || safe_name || '</strong> في شبكة خبراء النكهات — منصة تعليمية مهنية لعلوم النكهات وتكنولوجيا الأغذية.</p>'
    || '<p style="font-weight:700;color:#9A3412">باستخدامك للمنصة فإنك توافق على الشروط التالية:</p>'
    || '<div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:14px 16px;margin:12px 0">'
    || '<ul style="margin:0;padding-right:18px">'
    || '<li>يُمنع منعاً باتاً نشر أو مشاركة أي أخبار أو نقاش سياسي.</li>'
    || '<li>يُمنع منعاً باتاً أي محتوى يخص الأطفال.</li>'
    || '<li>يُمنع منعاً باتاً المواد الإباحية أو الجنسية أو أي محتوى للبالغين.</li>'
    || '<li>هذه منصة تعليمية علمية فقط. المخالفة تؤدي إلى إيقاف الحساب فوراً.</li>'
    || '</ul></div>'
    || '<p><a href="' || site_url || '/terms" style="color:#002D54;font-weight:700">اقرأ الشروط والأحكام كاملة</a></p>'
    || '</div>'
    || '<hr style="border:none;border-top:1px solid #EEF2F7;margin:8px 0 24px"/>'
    || '<div dir="ltr" style="text-align:left">'
    || '<p>Welcome, <strong>' || safe_name || '</strong>. Flavor Experts Network is a professional educational platform for flavor science and food technology.</p>'
    || '<p style="font-weight:700;color:#9A3412">By using the platform you agree to these rules:</p>'
    || '<div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:14px 16px;margin:12px 0">'
    || '<ul style="margin:0;padding-left:18px">'
    || '<li>Political news, campaigning, or political debate is strictly forbidden.</li>'
    || '<li>Any content involving children is strictly forbidden.</li>'
    || '<li>Pornography, sexual, or adult content is strictly forbidden.</li>'
    || '<li>This is an educational platform only. Violations can lead to immediate account suspension.</li>'
    || '</ul></div>'
    || '<p><a href="' || site_url || '/terms" style="color:#002D54;font-weight:700">Read the full Terms &amp; Conditions</a></p>'
    || '<p style="margin-top:20px"><a href="' || site_url || '/" style="display:inline-block;background:#002D54;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open the community</a></p>'
    || '</div></td></tr>'
    || '<tr><td style="padding:18px 24px 26px;border-top:1px solid #EEF2F7;font-size:12px;color:#6b7280">'
    || '© ' || extract(year from now())::text || ' Flavor Experts Network · Policy 2026-08-30'
    || '</td></tr></table></td></tr></table></body></html>';

  plain :=
    'أهلاً بك ' || safe_name || ' في شبكة خبراء النكهات.' || E'\n'
    || 'هذه منصة تعليمية. يُمنع السياسة ومحتوى الأطفال والمواد الإباحية.' || E'\n'
    || site_url || '/terms' || E'\n'
    || 'Welcome to Flavor Experts Network. Educational use only. No politics, child-related, or adult content.' || E'\n'
    || site_url || '/terms';

  request_id := public.send_resend_email(NEW.email, subject, html, plain);

  IF request_id IS NOT NULL THEN
    UPDATE public.user_profiles SET welcome_email_sent = true WHERE id = NEW.id;
  ELSE
    RAISE WARNING 'welcome email not queued for %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$;
