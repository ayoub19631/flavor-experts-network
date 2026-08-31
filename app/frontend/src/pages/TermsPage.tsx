import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getTermsSections, TERMS_VERSION } from "@/lib/terms-policy";

export default function TermsPage() {
  const { t, lang } = useI18n();
  const sections = getTermsSections(lang);
  usePageMeta({
    title: t("terms.title"),
    description:
      lang === "ar"
        ? "شروط وأحكام شبكة خبراء النكهات — شبكة مهنية تمنع السياسة ومحتوى الأطفال والمواد الإباحية"
        : "Flavor Experts Network terms — professional industry network; no politics, child-related, or adult content",
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

          <h1 className="text-3xl font-bold text-foreground mb-2">{t("terms.title")}</h1>
          <p className="text-sm text-muted-foreground mb-2">{t("terms.last_updated")}</p>
          <p className="text-xs text-muted-foreground mb-8">
            {lang === "ar" ? "إصدار السياسة" : "Policy version"} {TERMS_VERSION}
          </p>

          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed">
            {lang === "ar"
              ? "هذه شبكة مهنية لصناعة النكهات. يُمنع منعاً باتاً نشر أو مشاركة أي أخبار سياسية، أو أي محتوى يخص الأطفال، أو أي مواد إباحية. المخالفة تؤدي إلى إيقاف الحساب."
              : "This is a Professional Flavor Industry Network. Publishing political news, any child-related content, or pornography is strictly forbidden and can result in an immediate account ban."}
          </div>

          <div className="prose prose-gray max-w-none space-y-6">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
