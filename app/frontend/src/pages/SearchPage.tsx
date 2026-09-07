import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import GlobalSearch from "@/components/search/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  searchAdapter,
  type SearchCursor,
  type SearchEntityType,
  type SearchHit,
  type SearchSort,
} from "@/lib/search";
import { isUsableSearchQuery } from "@/lib/search/normalize";

const TABS: Array<{ id: "all" | SearchEntityType; types: SearchEntityType[] | null }> = [
  { id: "all", types: null },
  { id: "people", types: ["people"] },
  { id: "companies", types: ["companies"] },
  { id: "suppliers", types: ["suppliers", "raw_materials"] },
  { id: "jobs", types: ["jobs"] },
  { id: "publications", types: ["publications", "books", "research"] },
  { id: "posts", types: ["posts"] },
  { id: "forum", types: ["forum"] },
  { id: "events", types: ["events"] },
];

function groupHits(hits: SearchHit[]) {
  const groups = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const key = hit.entity_type;
    groups.set(key, [...(groups.get(key) || []), hit]);
  }
  return [...groups.entries()];
}

export default function SearchPage() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const tab = TABS.some((item) => item.id === params.get("tab")) ? (params.get("tab") as (typeof TABS)[number]["id"]) : "all";
  const sort = (params.get("sort") === "newest" ? "newest" : "relevance") as SearchSort;
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState<SearchCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState(params.get("country") || "");
  const [language, setLanguage] = useState(params.get("language") || "");
  const [specialty, setSpecialty] = useState(params.get("specialty") || "");

  usePageMeta({
    title: t("search.title"),
    description: t("search.desc"),
    path: "/search",
    noIndex: true,
    locale: lang,
  });

  const activeTypes = TABS.find((item) => item.id === tab)?.types || null;

  const runSearch = async (nextCursor: SearchCursor | null, append = false) => {
    if (!isUsableSearchQuery(query)) {
      setHits([]);
      setHasMore(false);
      setError(null);
      return;
    }
    setLoading(true);
    const result = await searchAdapter.search(
      query,
      {
        types: activeTypes,
        sort,
        country: country || null,
        language: language || null,
        specialty: specialty || null,
      },
      nextCursor,
      20,
    );
    setLoading(false);
    setError(result.error);
    setHits((prev) => (append ? [...prev, ...result.hits] : result.hits));
    setCursor(result.cursor);
    setHasMore(result.hasMore);
    if (!append) {
      void searchAdapter.remember(query);
      void searchAdapter.recordEvent(query, { hasResults: result.hits.length > 0, latencyMs: result.latencyMs });
    }
  };

  useEffect(() => {
    void runSearch(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, sort, country, language, specialty]);

  const grouped = useMemo(() => groupHits(hits), [hits]);
  const empty = isUsableSearchQuery(query) && !loading && !error && hits.length === 0;

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-20 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold">{t("search.title")}</h1>
        <p className="mb-5 text-sm text-muted-foreground">{t("search.desc")}</p>
        <GlobalSearch autoFocus={!query} />
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t("search.title")}>
          {TABS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={tab === item.id ? "default" : "outline"}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {t(`search.tab.${item.id}`)}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("search.country")} aria-label={t("search.country")} />
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder={t("search.language")} aria-label={t("search.language")} />
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder={t("search.specialty")} aria-label={t("search.specialty")} />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={sort}
            aria-label={t("search.sort")}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("sort", e.target.value);
              setParams(next, { replace: true });
            }}
          >
            <option value="relevance">{t("search.sort.relevance")}</option>
            <option value="newest">{t("search.sort.newest")}</option>
          </select>
        </div>
        {loading && hits.length === 0 && (
          <div className="mt-8 space-y-3" aria-busy="true" aria-label={t("search.loading")}>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {error && (
          <div className="mt-8 rounded-xl border border-destructive/30 p-4">
            <p className="text-sm">{t("search.error")}</p>
            <Button className="mt-3" size="sm" onClick={() => void runSearch(null, false)}>
              {t("search.retry")}
            </Button>
          </div>
        )}
        {empty && <p className="mt-8 text-sm text-muted-foreground">{t("search.empty")}</p>}
        {grouped.map(([type, rows]) => (
          <section key={type} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold">{t(`search.type.${type}`) || type}</h2>
            <div className="space-y-2">
              {rows.map((hit) => (
                <Link
                  key={`${hit.entity_type}-${hit.entity_id}`}
                  to={hit.href}
                  className="block rounded-xl border border-border p-3 hover:border-primary/30"
                  onClick={() => void searchAdapter.recordEvent(query, { clicked: true, entityType: hit.entity_type })}
                >
                  <p className="font-medium">{hit.title}</p>
                  {hit.subtitle && <p className="text-xs text-muted-foreground">{hit.subtitle}</p>}
                  {hit.snippet && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.snippet}</p>}
                </Link>
              ))}
            </div>
          </section>
        ))}
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" disabled={loading} onClick={() => void runSearch(cursor, true)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("search.more")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
