-- Align welcome email policy copy with fully free platform membership.

CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  safe_name text := replace(coalesce(nullif(trim(NEW.full_name), ''), split_part(NEW.email, '@', 1), 'Member'), '<', '');
  site_url text := coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'site_url' LIMIT 1),
    'https://flavorexpertsnetwork.com'
  );
  subject text := 'مرحباً بك في شبكة خبراء النكهات | Welcome to Flavor Experts Network';
  html text;
  plain text;
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
    || '<div style="display:none;max-height:0;overflow:hidden">Welcome to Flavor Experts Network — fully free for individuals and companies.</div>'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:28px 12px"><tr><td align="center">'
    || '<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">'
    || '<tr><td style="background:#002D54;padding:28px 24px;color:#E1DDCF">'
    || '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:8px">شبكة خبراء النكهات</div>'
    || '<h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700">مرحباً بك، ' || safe_name || '</h1>'
    || '</td></tr>'
    || '<tr><td style="padding:28px 24px;font-size:15px;line-height:1.7;color:#1f2937">'
    || '<div dir="rtl" style="text-align:right;margin-bottom:28px">'
    || '<p style="margin:0 0 12px;font-size:16px">أهلاً بك <strong>' || safe_name || '</strong>،</p>'
    || '<p style="margin:0 0 12px">يسعدنا انضمامك إلى <strong>شبكة خبراء النكهات</strong> — المجتمع المهني لمتخصصي صناعة النكهات وتكنولوجيا الأغذية.</p>'
    || '<p style="margin:0 0 16px">كجزء من تفعيل حسابك الجديد، نرسل لك نسخة موجزة من <strong>سياسة المنصة</strong>.</p>'
    || '<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;margin:0 0 16px">'
    || '<p style="margin:0 0 10px;font-weight:700;color:#002D54">ملخص سياسة المنصة</p>'
    || '<ul style="margin:0;padding-right:18px;color:#374151;line-height:1.75">'
    || '<li>باستخدامك للمنصة فإنك توافق على الشروط والأحكام وسياسة الخصوصية.</li>'
    || '<li>المنصة مخصّصة للتواصل المهني، مشاركة المعرفة، والوصول إلى الأخبار والموارد التعليمية.</li>'
    || '<li>المنصة مجانية بالكامل للأفراد والشركات — بدون اشتراكات مدفوعة.</li>'
    || '<li>يُتوقع الحفاظ على السلوك المهني؛ ويُحظر المحتوى غير اللائق أو المضلل أو المنتهك لحقوق الملكية الفكرية.</li>'
    || '<li>نجمع البيانات اللازمة لتقديم الخدمة وتحسينها، ولا نبيع بياناتك لأطراف ثالثة.</li>'
    || '<li>لا نفرض رسوم عضوية حالياً للوصول إلى ميزات المنصة.</li>'
    || '</ul></div>'
    || '<p style="margin:0 0 16px;font-size:14px">النسخة الكاملة: '
    || '<a href="' || site_url || '/terms" style="color:#002D54;font-weight:600">الشروط والأحكام</a> · '
    || '<a href="' || site_url || '/privacy" style="color:#002D54;font-weight:600">سياسة الخصوصية</a></p>'
    || '</div>'
    || '<hr style="border:none;border-top:1px solid #EEF2F7;margin:8px 0 24px"/>'
    || '<div dir="ltr" style="text-align:left">'
    || '<p style="margin:0 0 12px;font-size:16px">Welcome, <strong>' || safe_name || '</strong>,</p>'
    || '<p style="margin:0 0 12px">We''re glad you''ve joined <strong>Flavor Experts Network</strong> — the professional community for flavor scientists and food technologists.</p>'
    || '<p style="margin:0 0 16px">As part of activating your new account, we''re sharing a concise copy of our <strong>platform policy</strong>.</p>'
    || '<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;margin:0 0 16px">'
    || '<p style="margin:0 0 10px;font-weight:700;color:#002D54">Platform policy summary</p>'
    || '<ul style="margin:0;padding-left:18px;color:#374151;line-height:1.75">'
    || '<li>By using the platform you agree to our Terms of Service and Privacy Policy.</li>'
    || '<li>The network is for professional networking, knowledge sharing, industry news, and educational resources.</li>'
    || '<li>The platform is fully free for individuals and companies — no paid subscriptions.</li>'
    || '<li>Professional conduct is required; inappropriate, misleading, or IP-infringing content is prohibited.</li>'
    || '<li>We collect only the data needed to deliver and improve the service, and we do not sell your data.</li>'
    || '<li>We do not currently charge membership fees for platform features.</li>'
    || '</ul></div>'
    || '<p style="margin:0 0 20px;font-size:14px">Full documents: '
    || '<a href="' || site_url || '/terms" style="color:#002D54;font-weight:600">Terms of Service</a> · '
    || '<a href="' || site_url || '/privacy" style="color:#002D54;font-weight:600">Privacy Policy</a></p>'
    || '<p style="margin:0 0 8px"><a href="' || site_url || '/dashboard" style="display:inline-block;background:#002D54;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open your dashboard</a></p>'
    || '<p style="margin:20px 0 0;font-size:12px;color:#6b7280">If you did not create this account, you can safely ignore this email.</p>'
    || '</div>'
    || '</td></tr>'
    || '<tr><td style="padding:18px 24px 26px;border-top:1px solid #EEF2F7;font-size:12px;color:#6b7280;line-height:1.55">'
    || '© ' || extract(year from now())::text || ' Flavor Experts Network · '
    || '<a href="' || site_url || '" style="color:#002D54;text-decoration:none">' || replace(site_url, 'https://', '') || '</a>'
    || '</td></tr></table></td></tr></table></body></html>';

  plain :=
    'أهلاً بك ' || safe_name || ' في شبكة خبراء النكهات.' || E'\n'
    || 'المنصة مجانية بالكامل للأفراد والشركات — بدون اشتراكات مدفوعة.' || E'\n'
    || 'الشروط: ' || site_url || '/terms' || E'\n'
    || 'الخصوصية: ' || site_url || '/privacy' || E'\n\n'
    || 'Welcome to Flavor Experts Network, ' || safe_name || '.' || E'\n'
    || 'The platform is fully free for individuals and companies — no paid subscriptions.' || E'\n'
    || site_url || '/terms' || E'\n'
    || site_url || '/privacy' || E'\n'
    || site_url || '/dashboard';

  PERFORM public.send_resend_email(NEW.email, subject, html, plain);

  UPDATE public.user_profiles SET welcome_email_sent = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_welcome_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_welcome_email() TO service_role;

COMMENT ON FUNCTION public.notify_welcome_email() IS
  'Sends a bilingual welcome email with free-platform policy summary when a new user_profiles row is inserted.';
