import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import CitationBlock from "@/components/publications/CitationBlock";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchPublicationBySlug, firstAuthorName, localizedAbstract, localizedTitle, recordPublicationEvent } from "@/lib/publications/api";
import { publicationJsonLd } from "@/lib/publications/jsonld";
import { openPublicationDownload, resolveStoredFileUrl } from "@/lib/publications/files";
import { canonicalUrl } from "@/lib/seo-routes";
import type { Publication } from "@/lib/publications/types";
import { toast } from "sonner";

export default function BookDetailPage() {
  const { slug = "" } = useParams();
  const { t, lang } = useI18n();
  const language = lang === "ar" ? "ar" : "en";
  const [publication, setPublication] = useState<Publication | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicationBySlug(slug).then(async (result) => {
      setPublication(result.data);
      setError(result.error);
      if (result.data) {
        await recordPublicationEvent(result.data.id, "view");
        const cover = result.data.publication_files?.find((file) => file.kind === "cover") || (
          result.data.cover_image_path
            ? { storage_path: result.data.cover_image_path, bucket_name: "publications" }
            : null
        );
        if (cover) {
          const resolved = await resolveStoredFileUrl(cover);
          setCoverUrl(resolved.url);
        }
      }
    });
  }, [slug]);

  const chapters = useMemo(
    () => [...(publication?.book_chapters || [])].sort((a, b) => a.sort_order - b.sort_order),
    [publication],
  );
  const minutes = chapters.reduce((sum, chapter) => sum + (chapter.estimated_reading_minutes || 0), 0);
  const title = publication ? localizedTitle(publication, language) : t("books.title");
  const description = publication ? localizedAbstract(publication, language) : t("books.desc");

  usePageMeta({
    title,
    description,
    path: `/books/${slug}`,
    locale: lang,
    type: "book",
    image: coverUrl || undefined,
    noIndex: !publication || !["published", "corrected", "retracted"].includes(publication.status) || publication.visibility !== "public",
    hreflang: true,
  });

  if (error || !publication) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 text-muted-foreground">{error || t("books.empty")}</div>
      </div>
    );
  }

  const downloadable = publication.publication_files?.find((file) => file.kind === "full_pdf" && file.is_downloadable);

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd data={[
        breadcrumbJsonLd([
          { name: t("nav.home"), path: "/" },
          { name: t("books.title"), path: "/books" },
          { name: title, path: `/books/${slug}` },
        ]),
        publicationJsonLd(publication, language),
      ]} />
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 sm:px-6">
        {publication.status === "retracted" && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm" role="status">{publication.retraction_notice || t("pub.retracted")}</p>}
        {publication.status === "corrected" && <p className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm" role="status">{publication.correction_notice || t("pub.corrected")}</p>}
        <div className="grid gap-8 md:grid-cols-[220px,1fr]">
          {coverUrl ? <img src={coverUrl} alt="" className="rounded-xl border w-full aspect-[3/4] object-cover" /> : <div className="rounded-xl border bg-muted aspect-[3/4]" />}
          <div>
            <p className="text-sm text-primary font-semibold uppercase tracking-widest">{t("books.title")}</p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-muted-foreground">{firstAuthorName(publication)}</p>
            <p className="mt-4 leading-relaxed">{description}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("books.version")} {publication.version_number} · {chapters.length} {t("books.chapters")} · {minutes} {t("books.minutes")} · {publication.primary_language.toUpperCase()}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {chapters[0] && (
                <Button asChild><Link to={`/books/${slug}/chapters/${chapters[0].slug}`}>{t("library.read")}</Link></Button>
              )}
              {downloadable && (
                <Button type="button" variant="outline" onClick={async () => {
                  const resolved = await openPublicationDownload(downloadable);
                  if (resolved.url) window.open(resolved.url, "_blank", "noopener,noreferrer");
                  else toast.error(resolved.expired || resolved.missing ? t("pub.file_missing") : resolved.error || t("pub.file_denied"));
                }}>{t("books.download")}</Button>
              )}
            </div>
          </div>
        </div>
        <ol className="mt-10 space-y-2">
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <Link className="block rounded-lg border p-3 hover:border-primary/40" to={`/books/${slug}/chapters/${chapter.slug}`}>
                {index + 1}. {chapter.slug.replace(/-/g, " ")}
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <CitationBlock
            publicationId={publication.id}
            input={{
              title,
              authors: publication.publication_authors || [],
              publishedAt: publication.published_at,
              doi: publication.doi,
              isbn: publication.isbn,
              url: canonicalUrl(`/books/${slug}`),
              type: "book",
            }}
          />
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
