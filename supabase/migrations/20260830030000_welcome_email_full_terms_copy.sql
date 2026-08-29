-- Welcome email includes the full educational Terms (AR + EN).
-- Applied remotely as welcome_email_full_terms_copy.

CREATE OR REPLACE FUNCTION public.notify_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
DECLARE
  safe_name text := replace(coalesce(nullif(trim(NEW.full_name), ''), split_part(NEW.email, '@', 1), 'Member'), '<', '');
  site_url text := coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'site_url' LIMIT 1), 'https://flavorexpertsnetwork.com');
  subject text := 'مرحباً بك في شبكة خبراء النكهات | Welcome — Full Terms included';
  html text;
  plain text;
  request_id bigint;
  terms_ar text;
  terms_en text;
BEGIN
  IF NEW.welcome_email_sent = true THEN RETURN NEW; END IF;
  IF NEW.email IS NULL OR NEW.email = '' THEN RETURN NEW; END IF;
  site_url := rtrim(site_url, '/');
  terms_ar := $ar$
<p style="font-weight:700;margin:16px 0 8px">1. قبول الشروط</p>
<p>شبكة خبراء النكهات منصة تعليمية ومهنية لعلوم النكهات وتكنولوجيا الأغذية. إنشاء حساب أو استخدام الموقع يعني أنك قرأت هذه الشروط وفهمتها ووافقت عليها.</p>
<p style="font-weight:700;margin:16px 0 8px">2. الغرض التعليمي</p>
<p>المنصة مخصّصة فقط للتعلّم المهني وتبادل المعرفة العلمية وأخبار صناعة النكهات والأغذية والوظائف وتعاون الشركات. ليست منصة سياسية أو ترفيهية أو للمحتوى الجنسي.</p>
<p style="font-weight:700;margin:16px 0 8px">3. محتوى محظور حظراً تاماً</p>
<p>يُمنع منعاً باتاً: (1) الأخبار السياسية والدعاية والنقاش السياسي. (2) أي محتوى يخص الأطفال بما في ذلك الصور أو القصص أو الروابط. (3) المواد الإباحية أو الجنسية أو العارية. المخالفة الجسيمة الأولى قد توقف الحساب نهائياً فوراً.</p>
<p style="font-weight:700;margin:16px 0 8px">4. السلوك المهني</p>
<p>يلتزم الأعضاء بالاحترام والدقة والطابع العلمي. يُحظر التحرش وخطاب الكراهية والرسائل المزعجة وانتحال الهوية وسرقة الصيغ السرية.</p>
<p style="font-weight:700;margin:16px 0 8px">5. العضوية</p>
<p>المنصة مجانية حالياً للأفراد والشركات. الوصول لا يعطي حق نشر محتوى محظور.</p>
<p style="font-weight:700;margin:16px 0 8px">6. التنفيذ</p>
<p>يجوز حذف المحتوى وإيقاف الحسابات المخالفة دون إشعار مسبق. المخالفات الجسيمة تُبلَّغ للجهات المختصة عند وجوب القانون.</p>
<p style="font-weight:700;margin:16px 0 8px">7. الملكية الفكرية</p>
<p>لا تنشر مادة لا تملك حق مشاركتها. هوية المنصة والبرمجيات ملك لنا.</p>
<p style="font-weight:700;margin:16px 0 8px">8. الخصوصية</p>
<p>نجمع بيانات الحساب لتشغيل الخدمة التعليمية فقط. لا نبيع بياناتك.</p>
<p style="font-weight:700;margin:16px 0 8px">9. التعديلات</p>
<p>قد نحدّث هذه الشروط. استمرار الاستخدام أو الموافقة عبر مربع الاختيار يعني قبول النسخة الحالية (2026-08-30).</p>
<p style="font-weight:700;margin:16px 0 8px">10. التواصل</p>
<p>للاستفسار: ayoub@flavorexperts.net</p>
$ar$;
  terms_en := $en$
<p style="font-weight:700;margin:16px 0 8px">1. Acceptance of Terms</p>
<p>Flavor Experts Network is an educational and professional platform for flavor science and food technology. Creating an account means you have read and accepted these Terms.</p>
<p style="font-weight:700;margin:16px 0 8px">2. Educational purpose</p>
<p>The platform exists only for professional learning, scientific exchange, industry news related to flavors and food technology, jobs, and company collaboration.</p>
<p style="font-weight:700;margin:16px 0 8px">3. Strictly prohibited content</p>
<p>Forbidden: (1) Political news, campaigning, or political debate. (2) Any content involving children, including images, stories, or links. (3) Pornography, sexual content, or nudity. A first serious violation may permanently suspend the account immediately.</p>
<p style="font-weight:700;margin:16px 0 8px">4. Professional conduct</p>
<p>Members must remain respectful, accurate, and scientific. Harassment, hate speech, spam, impersonation, and confidential formula theft are prohibited.</p>
<p style="font-weight:700;margin:16px 0 8px">5. Membership</p>
<p>The platform is currently free for individuals and companies. Access does not grant a right to publish prohibited content.</p>
<p style="font-weight:700;margin:16px 0 8px">6. Enforcement</p>
<p>We may remove content and suspend accounts that break these rules, with or without prior notice.</p>
<p style="font-weight:700;margin:16px 0 8px">7. Intellectual property</p>
<p>Do not publish material you do not have the right to share.</p>
<p style="font-weight:700;margin:16px 0 8px">8. Privacy</p>
<p>We collect account data only to operate the educational service. We do not sell your personal data.</p>
<p style="font-weight:700;margin:16px 0 8px">9. Changes</p>
<p>We may update these Terms (current version 2026-08-30). Continued use or a new acceptance checkbox constitutes agreement.</p>
<p style="font-weight:700;margin:16px 0 8px">10. Contact</p>
<p>Questions: ayoub@flavorexperts.net</p>
$en$;
  html := '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/></head><body style="margin:0;background:#F3F4F6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#002D54"><table width="100%" style="padding:28px 12px"><tr><td align="center"><table width="100%" style="max-width:640px;background:#fff;border-radius:12px;border:1px solid #E5E7EB"><tr><td style="background:#002D54;padding:28px 24px;color:#E1DDCF"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">شبكة خبراء النكهات · Flavor Experts Network</div><h1 style="margin:10px 0 0;font-size:22px">مرحباً بك، ' || safe_name || '</h1></td></tr><tr><td style="padding:28px 24px;line-height:1.75"><div dir="rtl" style="text-align:right"><p>أهلاً بك في منصة تعليمية مهنية لعلوم النكهات. باستخدامك الحساب فإنك توافق على الشروط التالية.</p><div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:14px 16px;margin:16px 0"><p style="font-weight:700;color:#9A3412;margin:0 0 8px">حظر تام</p><ul style="margin:0;padding-right:18px"><li>أي أخبار أو محتوى سياسي</li><li>أي محتوى يخص الأطفال</li><li>أي مواد إباحية أو جنسية</li></ul></div><div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px">' || terms_ar || '</div></div><hr style="margin:28px 0;border:none;border-top:1px solid #E5E7EB"/><div dir="ltr"><p>Welcome to this educational flavor-science platform. Using your account means you accept the Terms below.</p><div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:14px 16px;margin:16px 0"><p style="font-weight:700;color:#9A3412;margin:0 0 8px">Zero tolerance</p><ul style="margin:0;padding-left:18px"><li>Political news or political debate</li><li>Any child-related content</li><li>Pornography or adult sexual content</li></ul></div><div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px">' || terms_en || '</div><p style="margin-top:20px"><a href="' || site_url || '/terms" style="color:#002D54;font-weight:700">Open /terms on the website</a></p><p><a href="' || site_url || '/" style="display:inline-block;background:#002D54;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open the community</a></p></div></td></tr><tr><td style="padding:16px 24px 24px;font-size:12px;color:#6b7280">© Flavor Experts Network · Educational platform only</td></tr></table></td></tr></table></body></html>';
  plain := 'Welcome ' || safe_name || E'.\n\nEducational platform. Strictly forbidden: politics, any child-related content, pornography.\n\nFull Terms: ' || site_url || '/terms\nVersion 2026-08-30';
  request_id := public.send_resend_email(NEW.email, subject, html, plain);
  IF request_id IS NOT NULL THEN
    UPDATE public.user_profiles SET welcome_email_sent = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
