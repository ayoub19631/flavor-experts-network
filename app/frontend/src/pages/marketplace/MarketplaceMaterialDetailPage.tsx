import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getPublicMaterial } from "@/lib/marketplace/api";
import { showVerifiedBadge } from "@/lib/marketplace/privacy";
import SeoJsonLd from "@/components/SeoJsonLd";
import { canonicalUrl } from "@/lib/seo-routes";

type MaterialDetail = Record<string, unknown> & {
  trade_name?: string;
  slug?: string;
  supplier?: { slug?: string; trade_name?: string; is_verified?: boolean };
  documents?: Array<{ id: string; doc_type: string; review_status: string }>;
};

export default function MarketplaceMaterialDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const [row, setRow] = useState<MaterialDetail | null>(null);

  useEffect(() => {
    if (!slug) return;
    getPublicMaterial(slug).then((data) => setRow(data as MaterialDetail | null)).catch(() => setRow(null));
  }, [slug]);

  usePageMeta({
    title: row?.trade_name || t("mp.materials"),
    description: t("mp.desc"),
    path: `/marketplace/materials/${slug || ""}`,
    locale: lang,
    hreflang: true,
  });

  const supplier = row?.supplier;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 space-y-6">
        {!row ? <p className="text-muted-foreground">{t("mp.empty")}</p> : (
          <>
            <SeoJsonLd data={{
              "@context": "https://schema.org",
              "@type": "Product",
              name: row.trade_name,
              url: canonicalUrl(`/marketplace/materials/${row.slug}`),
              brand: supplier?.trade_name,
            }} />
            <h1 className="text-3xl font-bold">{String(row.trade_name || "")}</h1>
            {supplier && (
              <Link to={`/marketplace/suppliers/${supplier.slug}`} className="inline-flex items-center gap-2">
                {supplier.trade_name}
                {showVerifiedBadge(supplier.is_verified) && <Badge>{t("mp.verified")}</Badge>}
              </Link>
            )}
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              {["generic_name", "category", "e_number", "fema", "cas", "physical_form", "country_of_origin", "country_of_manufacture", "packaging", "moq", "solubility", "shelf_life"].map((key) => (
                row[key] ? (
                  <div key={key} className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                    <dd>{String(row[key])}</dd>
                  </div>
                ) : null
              ))}
            </dl>
            {!!(row.certifications as string[] | undefined)?.length && (
              <p className="text-sm">{(row.certifications as string[]).join(", ")}</p>
            )}
            <p className="text-xs text-muted-foreground">{t("mp.claimed_certs")}</p>
            <div className="space-y-1 text-sm">
              {(row.documents || []).map((doc) => (
                <p key={doc.id}>{doc.doc_type}: {doc.review_status === "approved" ? t("mp.doc_reviewed") : t("mp.doc_pending")}</p>
              ))}
            </div>
            <Link className="text-primary text-sm" to={`/marketplace/rfq?material=${row.slug}`}>{t("mp.create_rfq")}</Link>
          </>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
