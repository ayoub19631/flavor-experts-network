import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/site-config";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function PrivacyPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  usePageMeta({
    title: isAr ? "سياسة الخصوصية" : "Privacy Policy",
    description: isAr
      ? "كيف تجمع شبكة خبراء النكهات بياناتك وتستخدمها وتحميها."
      : "How Flavor Experts Network collects, uses, and protects your data.",
    path: "/privacy",
    noIndex: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            {isAr ? "آخر تحديث: 25 يوليو 2026" : "Last updated: July 25, 2026"}
          </p>

          <div className="prose prose-gray max-w-none space-y-6">
            {isAr ? (
              <>
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">1. مقدمة</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    تلتزم شبكة خبراء النكهات (Flavor Experts Network) بحماية خصوصيتك. توضح هذه السياسة كيفية جمع بياناتك الشخصية واستخدامها وحمايتها عند استخدام منصتنا على {SITE.domain}.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">2. البيانات التي نجمعها</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>بيانات الحساب:</strong> الاسم الكامل، البريد الإلكتروني، كلمة المرور (مشفرة)</li>
                    <li><strong>بيانات الملف الشخصي:</strong> الشركة، الدور الوظيفي، الموقع الجغرافي، رابط LinkedIn</li>
                    <li><strong>بيانات الاستخدام:</strong> الصفحات التي تزورها، الموارد التي تطلع عليها</li>
                    <li><strong>بيانات الاتصال:</strong> الرسائل التي ترسلها عبر نماذج التواصل وطلبات الشركات</li>
                    <li><strong>بيانات الدفع (عند التفعيل):</strong> تُعالَج عبر Stripe ولا نخزّن أرقام البطاقات كاملة لدينا</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">3. كيف نستخدم بياناتك</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>تشغيل حسابك وتقديم خدمات المنصة</li>
                    <li>تخصيص تجربتك وعرض المحتوى المناسب</li>
                    <li>إرسال إشعارات المنصة والتحديثات المهمة</li>
                    <li>تحسين خدماتنا وتطوير ميزات جديدة</li>
                    <li>الاستجابة لاستفساراتك ودعمك</li>
                    <li>تشغيل مساعد FlavorBot عند استخدامك للمحادثة</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">4. مشاركة البيانات ومعالجو البيانات</h2>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    لا نبيع بياناتك الشخصية. قد نعالجها عبر مزودين موثوقين:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Supabase:</strong> قاعدة البيانات، المصادقة، التخزين</li>
                    <li><strong>Resend:</strong> إرسال رسائل البريد المعاملاتية</li>
                    <li><strong>OpenAI:</strong> تشغيل مساعد FlavorBot (عند تفعيله)</li>
                    <li><strong>Stripe:</strong> معالجة المدفوعات والاشتراكات (عند التفعيل)</li>
                    <li><strong>Vercel:</strong> استضافة الواجهة الأمامية</li>
                    <li>السلطات القانونية عند الطلب وفقاً للقانون المعمول به</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">5. مدة الاحتفاظ</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>بيانات الحساب: طوال فترة نشاط الحساب</li>
                    <li>رسائل التواصل: حتى 24 شهراً ما لم يُطلب الحذف مبكراً</li>
                    <li>سجلات الاشتراك/الدفع: وفق متطلبات المحاسبة المعمول بها</li>
                    <li>عند حذف الحساب: نحذف أو نُعمّي البيانات الشخصية خلال 30 يوماً ما لم يفرض القانون الاحتفاظ</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">6. حماية البيانات</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    نستخدم تشفير SSL/TLS لجميع الاتصالات. تُخزَّن كلمات المرور بصيغة مشفرة. تُطبَّق سياسات أمان على مستوى الصفوف (RLS) على قاعدة البيانات.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">7. حقوقك</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>الوصول إلى بياناتك الشخصية وتصديرها</li>
                    <li>تصحيح أي بيانات غير دقيقة</li>
                    <li>طلب حذف حسابك وبياناتك</li>
                    <li>الاعتراض على معالجة بياناتك</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">8. ملفات تعريف الارتباط</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    نستخدم cookies ضرورية فقط للحفاظ على جلسة تسجيل دخولك وتفضيلاتك (مثل اللغة والوضع الداكن). لا نستخدم cookies للتتبع الإعلاني.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">9. التواصل</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    لأي استفسارات تتعلق بالخصوصية، تواصل معنا عبر:{" "}
                    <a href={`mailto:${SITE.supportEmail}`} className="text-primary hover:underline">
                      {SITE.supportEmail}
                    </a>
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Flavor Experts Network is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information when you use our platform at {SITE.domain}.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">2. Information We Collect</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Account data:</strong> Full name, email address, encrypted password</li>
                    <li><strong>Profile data:</strong> Company, job role, location, LinkedIn URL</li>
                    <li><strong>Usage data:</strong> Pages visited, resources accessed</li>
                    <li><strong>Contact data:</strong> Messages sent through contact and enterprise forms</li>
                    <li><strong>Payment data (when enabled):</strong> Processed by Stripe; we do not store full card numbers</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Data</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Operate your account and deliver platform services</li>
                    <li>Personalize your experience and surface relevant content</li>
                    <li>Send platform notifications and important updates</li>
                    <li>Improve our services and develop new features</li>
                    <li>Respond to your inquiries and provide support</li>
                    <li>Power FlavorBot when you use the chat assistant</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">4. Data Sharing & Processors</h2>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    We do not sell your personal data. We may process it through trusted providers:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Supabase:</strong> Database, authentication, storage</li>
                    <li><strong>Resend:</strong> Transactional email delivery</li>
                    <li><strong>OpenAI:</strong> FlavorBot assistant (when enabled)</li>
                    <li><strong>Stripe:</strong> Payments and subscriptions (when enabled)</li>
                    <li><strong>Vercel:</strong> Frontend hosting</li>
                    <li>Legal authorities when required by applicable law</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">5. Retention</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Account data: for the life of the active account</li>
                    <li>Contact messages: up to 24 months unless earlier deletion is requested</li>
                    <li>Subscription/payment records: as required for accounting compliance</li>
                    <li>On account deletion: personal data is deleted or anonymized within 30 days unless law requires retention</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">6. Data Security</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    All communications are encrypted via SSL/TLS. Passwords are stored hashed. Row-Level Security (RLS) policies are enforced on the database.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">7. Your Rights</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Access and export your personal data</li>
                    <li>Correct any inaccurate information</li>
                    <li>Request deletion of your account and data</li>
                    <li>Object to the processing of your data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">8. Cookies</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We use only essential cookies to maintain your login session and preferences (language, dark mode). We do not use advertising tracking cookies.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">9. Contact</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    For privacy-related inquiries, contact us at:{" "}
                    <a href={`mailto:${SITE.supportEmail}`} className="text-primary hover:underline">
                      {SITE.supportEmail}
                    </a>
                  </p>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
