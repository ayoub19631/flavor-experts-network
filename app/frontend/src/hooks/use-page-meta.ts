import { useEffect } from "react";
import { SITE } from "@/lib/site-config";

interface PageMetaOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
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

export function usePageMeta({ title, description, path = "", noIndex = false }: PageMetaOptions) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE.name}` : SITE.name;
    const pageDescription = description || SITE.description;
    const canonical = `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`.replace(/\/$/, "") || SITE.url;

    document.title = pageTitle;
    upsertMeta("description", pageDescription);
    upsertMeta("og:title", pageTitle, "property");
    upsertMeta("og:description", pageDescription, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:image", SITE.ogImage, "property");
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", pageTitle);
    upsertMeta("twitter:description", pageDescription);
    upsertLink("canonical", canonical);

    if (noIndex) {
      upsertMeta("robots", "noindex, nofollow");
    } else {
      const robots = document.querySelector('meta[name="robots"]');
      robots?.remove();
    }
  }, [title, description, path, noIndex]);
}
