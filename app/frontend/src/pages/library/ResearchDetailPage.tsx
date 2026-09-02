import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import CitationBlock from "@/components/publications/CitationBlock";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchPublicationBySlug, localizedAbstract, localizedTitle, recordPublicationEvent } from "@/lib/publications/api";
import { publicationJsonLd } from "@/lib/publications/jsonld";
import { markdownToSafeHtml } from "@/lib/publications/sanitize";
import { openPublicationDownload } from "@/lib/publications/files";
import { canonicalUrl } from "@/lib/seo-routes";
import type { Publication, ResearchSections } from "@/lib/publications/types";
import { toast } from "sonner";

const SECTION_KEYS: Array<[keyof ResearchSections, string]> = [
  ["introduction", "Introduction"],
  ["methods", "Materials and Methods"],
  ["results", "Results"],
  ["discussion", "Discussion"],
  ["conclusion", "Conclusion"],
  ["funding", "Funding"],
  ["conflict_of_interest", "Conflict of interest"],
  ["data_availability", "Data availability"],
  ["regulatory_scope", "Regulatory scope"],
];

export default function ResearchDetailPage() {
  const { slug = "" } = useParams();
  const { t, lang } = useI18n();
  const language = lang === "ar" ? "ar" : "en";
  const [publication, setPublication] = useState<Publication | null>(null);

  useEffect(() => {
    fetchPublicationBySlug(slug).then(async (result) => {
      setPublication(result.data);
      if (result.data) await recordPublicationEvent(result.data.id, "view");
    });
  }, [slug]);

  const title = publication ? localizedTitle(publication, language) : t("research.title");
  const description = publication ? localizedAbstract(publication, language) : t("research.desc");
  const translation = publication?.publication_translations?.find((item) => item.language === language) || publication?.publication_translations?.[0];
  const sections = translation?.sections || {};

  usePageMeta({
    title,
    description,
    path: `/research/${slug}`,
    locale: lang,
    type: "article",
    noIndex: !publication || !["published", "corrected", "retracted"].includes(publication.status) || publication.visibility !== "public",
    hreflang: true,
  });

  if (!publication) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 text-muted-foreground">{t("research.empty")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd data={[
        breadcrumbJsonLd([
          { name: t("nav.home"), path: "/" },
          { name: t("research.title"), path: "/research" },
          { name: title, path: `/research/${slug}` },
        ]),
        publicationJsonLd(publication, language),
      ]} />
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-3xl px-4 sm:px-6">
        {publication.status === "retracted" && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm">{publication.retraction_notice || t("pub.retracted")}</p>}
        {publication.status === "corrected" && <p className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm">{publication.correction_notice || t("pub.corrected")}</p>}
        <p className="text-sm text-primary font-semibold">{publication.type.replace(/_/g, " ")}</p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {[...(publication.publication_authors || [])].sort((a, b) => a.author_order - b.author_order).map((author) => (
            <li key={author.id}>
              {author.full_name}
              {author.affiliation ? ` — ${author.affiliation}` : ""}
              {author.is_corresponding ? ` (${t("research.corresponding")})` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          {publication.published_at ? new Date(publication.published_at).toLocaleDateString(lang) : ""}
          {publication.doi ? ` · DOI ${publication.doi}` : ""}
          {` · ${t("research.version")} ${publication.version_number}`}
        </p>
        <section className="mt-8">
          <h2 className="font-semibold">{t("research.abstract")}</h2>
          <p className="mt-2 leading-relaxed">{description}</p>
        </section>
        {publication.keywords?.length > 0 && (
          <p className="mt-4 text-sm"><span className="font-medium">{t("research.keywords")}: </span>{publication.keywords.join(", ")}</p>
        )}
        {SECTION_KEYS.map(([key, label]) => sections[key] ? (
          <section key={key} className="mt-8">
            <h2 className="font-semibold">{label}</h2>
            <div className="prose dark:prose-invert max-w-none mt-2" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(sections[key]) }} />
          </section>
        ) : null)}
        {translation?.body && (
          <div className="prose dark:prose-invert max-w-none mt-8" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(translation.body) }} />
        )}
        {(publication.publication_references || []).length > 0 && (
          <section className="mt-8">
            <h2 className="font-semibold">{t("research.references")}</h2>
            <ol className="mt-3 space-y-2 list-decimal ps-5 text-sm">
              {[...publication.publication_references!].sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                <li key={item.id}>{item.citation_text || [item.authors, item.title, item.journal_or_publisher, item.publication_year, item.doi].filter(Boolean).join(". ")}</li>
              ))}
            </ol>
          </section>
        )}
        {(publication.publication_files || []).filter((file) => file.kind !== "cover" && file.is_downloadable).length > 0 && (
          <section className="mt-8">
            <h2 className="font-semibold">{t("research.supplementary")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              {publication.publication_files!.filter((file) => file.kind !== "cover" && file.is_downloadable).map((file) => (
                <Button key={file.id} type="button" variant="outline" className="justify-start" onClick={async () => {
                  const resolved = await openPublicationDownload(file);
                  if (resolved.url) window.open(resolved.url, "_blank", "noopener,noreferrer");
                  else toast.error(resolved.error || t("pub.file_denied"));
                }}>{file.kind}</Button>
              ))}
            </div>
          </section>
        )}
        <div className="mt-8">
          <CitationBlock
            publicationId={publication.id}
            input={{
              title,
              authors: publication.publication_authors || [],
              publishedAt: publication.published_at,
              doi: publication.doi,
              url: canonicalUrl(`/research/${slug}`),
              type: publication.type,
            }}
          />
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
