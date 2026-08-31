import { useEffect } from "react";
import { SITE } from "@/lib/site-config";
import { canonicalUrl } from "@/lib/seo-routes";

interface PageMetaOptions {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  locale?: string;
  type?: "website" | "article";
}

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function usePageMeta({ title, description, path = "", image, noIndex = false, locale, type = "website" }: PageMetaOptions) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE.name}` : SITE.name;
    const pageDescription = description || SITE.description;
    const canonical = canonicalUrl(path);
    const ogImage = image || SITE.ogImage;
    const ogLocale = locale === "ar" ? "ar_SA" : "en_US";

    document.title = pageTitle;
    upsertMeta("description", pageDescription);
    upsertMeta("og:title", pageTitle, "property");
    upsertMeta("og:description", pageDescription, "property");
    upsertMeta("og:type", type, "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:image", ogImage, "property");
    upsertMeta("og:locale", ogLocale, "property");
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", pageTitle);
    upsertMeta("twitter:description", pageDescription);
    upsertMeta("twitter:image", ogImage);
    upsertLink("canonical", canonical);
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    for (const [hreflang, href] of [
      ["en", canonical],
      ["ar", canonical],
      ["x-default", canonical],
    ] as const) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = hreflang;
      link.href = href;
      document.head.appendChild(link);
    }

    if (noIndex) {
      upsertMeta("robots", "noindex, nofollow");
    } else {
      const robots = document.querySelector('meta[name="robots"]');
      robots?.remove();
    }
  }, [title, description, path, image, noIndex, locale, type]);
}
