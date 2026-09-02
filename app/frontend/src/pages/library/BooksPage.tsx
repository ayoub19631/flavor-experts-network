import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import PublicationCard from "@/components/publications/PublicationCard";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { listPublications } from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";

export default function BooksPage() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  usePageMeta({ title: t("books.title"), description: t("books.desc"), path: "/books", locale: lang, hreflang: true });

  useEffect(() => {
    listPublications({ type: "book", pageSize: 24 }).then((result) => {
      setItems(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd data={breadcrumbJsonLd([{ name: t("nav.home"), path: "/" }, { name: t("library.title"), path: "/library" }, { name: t("books.title"), path: "/books" }])} />
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">{t("books.title")}</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">{t("books.desc")}</p>
        {loading ? <p className="mt-8 text-muted-foreground">{t("library.loading")}</p> : null}
        {!loading && items.length === 0 ? <p className="mt-10 text-muted-foreground">{t("books.empty")}</p> : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => <PublicationCard key={item.id} publication={item} />)}
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
