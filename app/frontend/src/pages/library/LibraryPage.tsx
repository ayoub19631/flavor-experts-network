import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import PublicationCard from "@/components/publications/PublicationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchPublicationCategories, listPublications } from "@/lib/publications/api";
import type { Publication, PublicationCategory } from "@/lib/publications/types";
import { PUBLICATION_TYPES, AUDIENCE_LEVELS } from "@/lib/publications/types";

export default function LibraryPage() {
  const { t, lang } = useI18n();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith("/publications") ? "/publications" : "/library";
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<"newest" | "most_read">("newest");
  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [featured, setFeatured] = useState<Publication[]>([]);
  const [items, setItems] = useState<Publication[]>([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 12;

  usePageMeta({
    title: t("library.title"),
    description: t("library.desc"),
    path: basePath,
    locale: lang,
    hreflang: true,
  });

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    fetchPublicationCategories().then((result) => setCategories(result.data));
  }, []);

  const load = async () => {
    setLoading(true);
    const [featureRes, listRes] = await Promise.all([
      listPublications({ featured: true, pageSize: 4 }),
      listPublications({
        query: debounced,
        type,
        category,
        language,
        level,
        sort,
        page,
        pageSize,
      }),
    ]);
    setFeatured(featureRes.data);
    setItems(listRes.data);
    setCount(listRes.count || listRes.data.length);
    setError(listRes.error || featureRes.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [debounced, type, category, language, level, sort, page]);

  const books = useMemo(() => items.filter((item) => item.type === "book"), [items]);
  const research = useMemo(() => items.filter((item) => item.type !== "book"), [items]);
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("library.title"), path: basePath }])} />
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">{t("library.tag")}</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold">{t("library.title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-3xl">{t("library.desc")}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to={`${basePath === "/publications" ? "/publications/books" : "/books"}`} className="text-primary">{t("nav.books")}</Link>
          <Link to={`${basePath === "/publications" ? "/publications/research" : "/research"}`} className="text-primary">{t("nav.research")}</Link>
          <Link to="/policies" className="text-primary">{t("policies.title")}</Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-6">
          <Input value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder={t("library.search")} className="md:col-span-2" aria-label={t("library.search")} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => { setPage(0); setType(event.target.value); }} aria-label={t("library.type")}>
            <option value="">{t("library.type")}</option>
            {PUBLICATION_TYPES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => { setPage(0); setCategory(event.target.value); }} aria-label={t("library.field")}>
            <option value="">{t("library.field")}</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{lang === "ar" ? item.name_ar : item.name_en}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={language} onChange={(event) => { setPage(0); setLanguage(event.target.value); }} aria-label={t("library.language")}>
            <option value="">{t("library.language")}</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sort} onChange={(event) => { setPage(0); setSort(event.target.value as "newest" | "most_read"); }} aria-label={t("library.sort")}>
            <option value="newest">{t("library.sort.newest")}</option>
            <option value="most_read">{t("library.sort.most_read")}</option>
          </select>
        </div>
        <div className="mt-3">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={level} onChange={(event) => { setPage(0); setLevel(event.target.value); }} aria-label={t("library.level")}>
            <option value="">{t("library.level")}</option>
            {AUDIENCE_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3" role="alert">
            <p className="text-sm text-destructive">{t("library.error")}</p>
            <Button type="button" size="sm" variant="outline" onClick={load}>{t("library.retry")}</Button>
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 mt-10 text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("library.loading")}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">{t("library.empty")}</div>
        )}

        {featured.length > 0 && page === 0 && !debounced && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">{t("library.featured")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">{featured.map((item) => <PublicationCard key={item.id} publication={item} />)}</div>
          </section>
        )}

        {books.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">{t("library.latest_books")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((item) => <PublicationCard key={item.id} publication={item} />)}</div>
          </section>
        )}
        {research.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">{t("library.latest_research")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{research.map((item) => <PublicationCard key={item.id} publication={item} />)}</div>
          </section>
        )}

        {count > pageSize && (
          <div className="mt-8 flex justify-center gap-2">
            <Button type="button" variant="outline" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>{t("library.prev")}</Button>
            <span className="self-center text-sm text-muted-foreground">{t("library.page")} {page + 1} / {pageCount}</span>
            <Button type="button" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>{t("library.more")}</Button>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
