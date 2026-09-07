import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { searchAdapter, type DiscoverHit, type DiscoverSection } from "@/lib/search";
import { canonicalUrl } from "@/lib/seo-routes";

const SECTIONS: DiscoverSection[] = ["experts", "companies", "publications", "discussions", "jobs"];

export default function DiscoverPage() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Record<DiscoverSection, DiscoverHit[]>>({
    experts: [],
    companies: [],
    publications: [],
    discussions: [],
    jobs: [],
  });
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: t("discover.title"),
    description: t("discover.desc"),
    path: "/discover",
    locale: lang,
    hreflang: true,
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all(SECTIONS.map((section) => searchAdapter.discover(section, 6))).then((results) => {
      if (cancelled) return;
      setRows({
        experts: results[0],
        companies: results[1],
        publications: results[2],
        discussions: results[3],
        jobs: results[4],
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const publicItems = SECTIONS.flatMap((section) => rows[section]).slice(0, 20);
    if (!publicItems.length) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.discover = "1";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      url: canonicalUrl("/discover"),
      itemListElement: publicItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: canonicalUrl(item.href.split("#")[0]),
        name: item.title,
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold">{t("discover.title")}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{t("discover.desc")}</p>
        {SECTIONS.map((section) => (
          <section key={section} className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">{t(`discover.${section}`)}</h2>
            {loading && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {!loading && rows[section].length === 0 && (
              <p className="text-sm text-muted-foreground">{t("discover.empty")}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {rows[section].map((item) => (
                <Link
                  key={`${item.entity_type}-${item.entity_id}`}
                  to={item.href}
                  className="rounded-xl border border-border p-3 hover:border-primary/30"
                >
                  <p className="font-medium">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                  {item.reason && (
                    <p className="mt-1 text-[11px] uppercase text-muted-foreground">
                      {t(`discover.reason.${item.reason}`) || item.reason}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
