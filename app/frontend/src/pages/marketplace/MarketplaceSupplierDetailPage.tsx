import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getPublicSupplier, listPublicMaterials } from "@/lib/marketplace/api";
import { showVerifiedBadge } from "@/lib/marketplace/privacy";
import SeoJsonLd from "@/components/SeoJsonLd";
import { canonicalUrl } from "@/lib/seo-routes";
import type { PublicMaterial, PublicSupplier } from "@/lib/marketplace/types";

export default function MarketplaceSupplierDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const [row, setRow] = useState<PublicSupplier | null>(null);
  const [materials, setMaterials] = useState<PublicMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getPublicSupplier(slug).catch(() => null),
      listPublicMaterials("", undefined, slug).catch(() => []),
    ]).then(([supplier, list]) => {
      if (cancelled) return;
      setRow(supplier);
      setMaterials(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageMeta({
    title: row?.trade_name || t("mp.suppliers"),
    description: row?.about || t("mp.desc"),
    path: `/marketplace/suppliers/${slug || ""}`,
    locale: lang,
    hreflang: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 space-y-6">
        {loading ? (
          <p className="text-muted-foreground" role="status">{t("mp.loading")}</p>
        ) : !row ? (
          <p className="text-muted-foreground">{t("mp.not_found")}</p>
        ) : (
          <>
            <SeoJsonLd data={{
              "@context": "https://schema.org",
              "@type": "Organization",
              name: row.trade_name,
              legalName: row.legal_name || undefined,
              url: canonicalUrl(`/marketplace/suppliers/${row.slug}`),
              address: { "@type": "PostalAddress", addressLocality: row.city, addressCountry: row.country },
            }} />
            {row.cover_url && <img src={row.cover_url} alt="" className="w-full h-40 object-cover rounded-2xl" />}
            <div className="flex items-center gap-3">
              {row.logo_url && <img src={row.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{row.trade_name}</h1>
                  {showVerifiedBadge(row.is_verified) && <Badge>{t("mp.verified")}</Badge>}
                </div>
                {row.legal_name && <p className="text-sm text-muted-foreground">{t("mp.legal")}: {row.legal_name}</p>}
              </div>
            </div>
            <p>{[row.supplier_type, row.city, row.country].filter(Boolean).join(" · ")}</p>
            {row.about && <p className="text-muted-foreground">{row.about}</p>}
            {!!row.markets?.length && <p className="text-sm">{t("mp.markets")}: {row.markets.join(", ")}</p>}
            <p className="text-xs text-muted-foreground">{t("mp.last_updated")}: {row.updated_at ? new Date(row.updated_at).toLocaleDateString(lang === "ar" ? "ar" : "en") : "—"}</p>
            <div className="space-y-2">
              <h2 className="font-semibold">{t("mp.materials")}</h2>
              {materials.map((m) => (
                <Link key={m.id} to={`/marketplace/materials/${m.slug}`} className="block rounded-xl border p-3">{m.trade_name}</Link>
              ))}
            </div>
            <Link className="text-primary text-sm" to={`/marketplace/rfq?supplier=${row.id}`}>{t("mp.create_rfq")}</Link>
          </>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
