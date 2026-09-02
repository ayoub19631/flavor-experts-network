import { useEffect } from "react";
import { SITE } from "@/lib/site-config";
import { canonicalUrl } from "@/lib/seo-routes";
import { PUBLIC_SITE_ORIGIN, socialSameAs } from "@/lib/social-links";

type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: PUBLIC_SITE_ORIGIN,
    logo: `${PUBLIC_SITE_ORIGIN}/brand/logo-512.webp`,
    sameAs: socialSameAs(),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: PUBLIC_SITE_ORIGIN,
    inLanguage: ["en", "ar"],
    description: SITE.description,
  };
}

export function articleJsonLd(input: {
  title: string;
  description?: string;
  path: string;
  date?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description || SITE.description,
    url: canonicalUrl(input.path),
    image: input.image || SITE.ogImage,
    datePublished: input.date,
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: `${PUBLIC_SITE_ORIGIN}/brand/logo-512.webp`,
    },
    mainEntityOfPage: canonicalUrl(input.path),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export default function SeoJsonLd({ data }: JsonLdProps) {
  const serialized = JSON.stringify(data);
  useEffect(() => {
    const scriptId = "fen-jsonld";
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = serialized;
    return () => {
      el?.remove();
    };
  }, [serialized]);
  return null;
}
