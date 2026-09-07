import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import PublicationCard from "@/components/publications/PublicationCard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { listPublications } from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";

export default function ResearchPage() {
  const { t, lang } = useI18n();
  const { pathname } = useLocation();
  const path = pathname.startsWith("/publications") ? "/publications/research" : "/research";
  const [items, setItems] = useState<Publication[]>([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageMeta({ title: t("research.title"), description: t("research.desc"), path, locale: lang, hreflang: true });

  const load = () => {
    setLoading(true);
    listPublications({ page, pageSize: 24, sort: "newest" }).then((result) => {
      const research = result.data.filter((item) => item.type !== "book");
      setItems(research);
      setCount(research.length);
      setError(result.error);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("library.title"), path: "/publications" }, { name: t("research.title"), path }])} />
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">{t("research.title")}</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">{t("research.desc")}</p>
        {error ? <div className="mt-6"><Button type="button" variant="outline" onClick={load}>{t("library.retry")}</Button></div> : null}
        {loading ? <p className="mt-8 text-muted-foreground">{t("library.loading")}</p> : null}
        {!loading && items.length === 0 ? <p className="mt-10 text-muted-foreground">{t("research.empty")}</p> : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => <PublicationCard key={item.id} publication={item} />)}
        </div>
        {count >= 24 && (
          <div className="mt-8 flex justify-center">
            <Button type="button" variant="outline" onClick={() => setPage((value) => value + 1)}>{t("library.more")}</Button>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
