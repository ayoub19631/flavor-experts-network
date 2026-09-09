import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { listPublicMaterials } from "@/lib/marketplace/api";
import { showVerifiedBadge } from "@/lib/marketplace/privacy";
import type { PublicMaterial } from "@/lib/marketplace/types";

export default function MarketplaceMaterialsPage() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<PublicMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageMeta({ title: t("mp.materials"), description: t("mp.desc"), path: "/marketplace/materials", locale: lang, hreflang: true });

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPublicMaterials(debounced)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setError(t("mp.error"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, t]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 space-y-6">
        <h1 className="text-3xl font-bold">{t("mp.materials")}</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("mp.search")} aria-label={t("mp.search")} />
        {loading && <p className="text-muted-foreground" role="status">{t("mp.loading")}</p>}
        {!loading && error && (
          <div className="space-y-2">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setDebounced((value) => `${value}`)}>{t("common.retry")}</Button>
          </div>
        )}
        {!loading && !error && rows.length === 0 && <p className="text-muted-foreground">{t("mp.empty")}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((row) => (
            <Link key={row.id} to={`/marketplace/materials/${row.slug}`} className="rounded-2xl border p-4 hover:border-primary/40 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold truncate">{row.trade_name}</h2>
                {showVerifiedBadge(row.supplier_verified) && <Badge>{t("mp.verified")}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{[row.supplier_name, row.category].filter(Boolean).join(" · ")}</p>
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("mp.claimed_certs")}</p>
      </div>
      <FooterSection />
    </div>
  );
}
