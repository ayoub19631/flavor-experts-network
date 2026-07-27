# إعداد البريد (Resend) — مكتمل تلقائياً

## الحالة: موثّق ويعمل

- النطاق: `nexusflavor.com`
- الحالة: **verified**
- المرسل: `Flavor Experts <noreply@nexusflavor.com>`
- إشعارات التواصل/المؤسسات: تعمل عبر Vault + pg_net triggers
- اختبار إرسال ناجح بعد التوثيق

## ما تم ضبطه بدون تدخل

1. التحقق من سجلات DNS الموجودة مسبقاً
2. تشغيل Verify على Resend حتى أصبحت الحالة verified
3. تحويل المرسل من `onboarding@resend.dev` إلى `noreply@nexusflavor.com`
4. إرسال إقرار للعميل + تنبيه للأدمن عند كل رسالة/طلب مؤسسة
5. تدوير كلمات مرور الحسابات التجريبية (محفوظة محلياً في ملف سري)
6. تخزين `oauth_state_secret` و `resend_api_key` في Supabase Vault

## غير متوفر تلقائياً (لا مفتاح في المشروع)

- `OPENAI_API_KEY` فارغ في `.env` → FlavorBot يعمل بالردود الذكية المدمجة حتى تضيف المفتاح لاحقاً في Vault/Edge Secrets
- Google/LinkedIn OAuth يحتاج تفعيل المزود في لوحة Auth + Client IDs (محاولة الدخول أظهرت `provider is not enabled`)

## ملف الأسرار المحلي

`deploy/LOCAL-CREDENTIALS.secret.txt` (مدرج في `.gitignore`)
