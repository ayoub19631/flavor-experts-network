import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/site-config";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function TermsPage() {
  const { t, lang } = useI18n();
  usePageMeta({
    title: t("terms.title"),
    description: lang === "ar" ? "شروط وأحكام استخدام شبكة خبراء النكهات" : "Terms of service for Flavor Experts Network",
    path: "/terms",
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

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("terms.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {t("terms.last_updated")}
          </p>

          <div className="prose prose-gray max-w-none space-y-6">
            {lang === "ar" ? (
              <>
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">1. القبول بالشروط</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    باستخدامك لموقع Flavor Experts Network، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام الموقع.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">2. وصف الخدمة</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    توفر Flavor Experts Network منصة إلكترونية لمتخصصي صناعة النكهات وتكنولوجيا الأغذية للتواصل ومشاركة المعرفة والوصول إلى الموارد التعليمية وأخبار الصناعة.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">3. العضوية</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    المنصة مجانية بالكامل للأفراد والشركات. لا توجد اشتراكات مدفوعة ولا رسوم عضوية للوصول إلى ميزات المنصة.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">4. سلوك المستخدم</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    يُتوقع من المستخدمين الحفاظ على السلوك المهني واحترام الآخرين. يُحظر المحتوى غير اللائق أو المضلل أو الذي ينتهك حقوق الملكية الفكرية.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">5. الملكية الفكرية</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    جميع المحتويات المنشورة على الموقع محمية بحقوق الطبع والنشر. لا يجوز نسخ أو إعادة توزيع المحتوى دون إذن كتابي مسبق.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">6. سياسة الخصوصية</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    نحن نحترم خصوصيتك. يتم جمع البيانات الشخصية فقط لتحسين تجربة المستخدم وتقديم الخدمات. لن نشارك معلوماتك مع أطراف ثالثة دون موافقتك.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">7. الرسوم والمدفوعات</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    لا نفرض حالياً أي رسوم اشتراك. إذا تغيّرت سياسة التسعير مستقبلاً، سيتم إخطار الأعضاء مسبقاً عبر البريد الإلكتروني.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">8. التعديلات</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">9. التواصل</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    لأي استفسارات حول هذه الشروط، يرجى التواصل معنا عبر: {SITE.supportEmail}
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By using the Flavor Experts Network website, you agree to be bound by these Terms and Conditions. If you do not agree to any part of these terms, please do not use the website.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">2. Service Description</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Flavor Experts Network provides an online platform for flavor industry and food technology professionals to connect, share knowledge, and access educational resources and industry news.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">3. Membership</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The platform is fully free for individuals and companies. There are no paid subscriptions or membership fees to access platform features.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">4. User Conduct</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Users are expected to maintain professional conduct and respect others. Inappropriate, misleading, or intellectual property-infringing content is prohibited.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">5. Intellectual Property</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    All content published on the website is protected by copyright. Content may not be copied or redistributed without prior written permission.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">6. Privacy Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We respect your privacy. Personal data is collected only to improve user experience and deliver services. We will not share your information with third parties without your consent.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">7. Fees & Payments</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We do not currently charge subscription fees. If pricing policy changes in the future, members will be notified in advance by email.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">8. Modifications</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We reserve the right to modify these terms at any time. Users will be notified of any material changes via email.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-foreground mb-3">9. Contact</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    For any inquiries about these terms, please contact us at: {SITE.supportEmail}
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