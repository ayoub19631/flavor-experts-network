import { canonicalUrl } from "@/lib/seo-routes";
import { PUBLIC_SITE_ORIGIN } from "@/lib/social-links";
import { SITE } from "@/lib/site-config";
import { firstAuthorName, localizedAbstract, localizedTitle, publicHref } from "./api";
import type { Publication } from "./types";

export function personJsonLd(name: string, affiliation?: string | null, orcid?: string | null) {
  return {
    "@type": "Person",
    name,
    ...(affiliation ? { affiliation: { "@type": "Organization", name: affiliation } } : {}),
    ...(orcid ? { identifier: orcid } : {}),
  };
}

export function publicationJsonLd(publication: Publication, language: "en" | "ar") {
  const path = publicHref(publication);
  const authors = [...(publication.publication_authors || [])]
    .sort((a, b) => a.author_order - b.author_order)
    .map((author) => personJsonLd(author.full_name, author.affiliation, author.orcid));
  const type = publication.type === "book" ? "Book" : publication.type === "white_paper" ? "Article" : "ScholarlyArticle";
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: localizedTitle(publication, language),
    headline: localizedTitle(publication, language),
    abstract: localizedAbstract(publication, language),
    inLanguage: publication.primary_language,
    url: canonicalUrl(path),
    datePublished: publication.published_at || undefined,
    dateModified: publication.updated_at,
    version: String(publication.version_number),
    ...(publication.doi ? { identifier: publication.doi } : {}),
    ...(publication.isbn ? { isbn: publication.isbn } : {}),
    author: authors.length ? authors : personJsonLd(firstAuthorName(publication) || SITE.name),
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: PUBLIC_SITE_ORIGIN,
    },
  };
}

export function sitemapLastmod(updatedAt?: string | null): string {
  if (!updatedAt) return new Date().toISOString();
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
