import { Link } from "react-router-dom";
import { Building2, FlaskConical, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import SeoJsonLd from "@/components/SeoJsonLd";
import { canonicalUrl } from "@/lib/seo-routes";

export default function MarketplaceHomePage() {
  const { t, lang } = useI18n();
  usePageMeta({
    title: t("mp.title"),
    description: t("mp.desc"),
    path: "/marketplace",
    locale: lang,
    hreflang: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 space-y-8">
        <SeoJsonLd data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("mp.title"),
          url: canonicalUrl("/marketplace"),
        }} />
        <div>
          <h1 className="text-3xl font-bold">{t("mp.title")}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t("mp.desc")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link to="/marketplace/suppliers" className="rounded-2xl border p-5 hover:border-primary/40">
            <Building2 className="w-5 h-5 mb-3" />
            <h2 className="font-semibold">{t("mp.suppliers")}</h2>
          </Link>
          <Link to="/marketplace/materials" className="rounded-2xl border p-5 hover:border-primary/40">
            <FlaskConical className="w-5 h-5 mb-3" />
            <h2 className="font-semibold">{t("mp.materials")}</h2>
          </Link>
          <Link to="/marketplace/rfq" className="rounded-2xl border p-5 hover:border-primary/40">
            <FileText className="w-5 h-5 mb-3" />
            <h2 className="font-semibold">{t("mp.create_rfq")}</h2>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{t("mp.disclaimer")}</p>
        <Button asChild variant="outline"><Link to="/market">{t("nav.market")}</Link></Button>
      </div>
      <FooterSection />
    </div>
  );
}
