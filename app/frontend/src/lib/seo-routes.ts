import { PUBLIC_SITE_ORIGIN } from "@/lib/social-links";

export const PUBLIC_INDEXABLE_PATHS = [
  "/",
  "/community",
  "/insights",
  "/members",
  "/jobs",
  "/forum",
  "/market",
  "/blog",
  "/consultations",
  "/enterprise",
  "/terms",
  "/privacy",
] as const;

export const PRIVATE_NOINDEX_PREFIXES = [
  "/admin",
  "/dashboard",
  "/auth",
  "/learn",
  "/messages",
  "/verify-email",
  "/email-verified",
] as const;

export function canonicalUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const trimmed = normalized === "/" ? "" : normalized.replace(/\/$/, "");
  return `${PUBLIC_SITE_ORIGIN}${trimmed}`;
}

export function isPrivatePath(path: string): boolean {
  return PRIVATE_NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export const SITEMAP_STATIC_ROUTES = [...PUBLIC_INDEXABLE_PATHS];
