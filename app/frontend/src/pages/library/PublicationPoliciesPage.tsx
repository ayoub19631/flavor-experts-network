import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getPolicy, PUBLICATION_POLICIES } from "@/lib/publications/policies";

export default function PublicationPoliciesPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const policy = slug ? getPolicy(slug) : undefined;
  const title = policy ? (lang === "ar" ? policy.title_ar : policy.title_en) : t("policies.title");
  const description = policy ? (lang === "ar" ? policy.summary_ar : policy.summary_en) : t("policies.desc");
  const path = slug ? `/policies/${slug}` : "/policies";

  usePageMeta({ title, description, path, locale: lang, hreflang: true });

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("policies.title"), path: "/policies" }, ...(policy ? [{ name: title, path }] : [])])} />
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
        {!policy && (
          <ul className="mt-8 space-y-3">
            {PUBLICATION_POLICIES.map((item) => (
              <li key={item.slug} className="rounded-xl border p-4">
                <Link to={`/policies/${item.slug}`} className="font-medium hover:text-primary">
                  {lang === "ar" ? item.title_ar : item.title_en}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? item.summary_ar : item.summary_en}</p>
              </li>
            ))}
          </ul>
        )}
        {policy && (
          <div className="mt-8 space-y-4">
            {(lang === "ar" ? policy.body_ar : policy.body_en).map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">{paragraph}</p>
            ))}
            <Link to="/policies" className="inline-block text-sm text-primary">{t("policies.title")}</Link>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
