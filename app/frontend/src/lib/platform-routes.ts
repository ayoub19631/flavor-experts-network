/** Canonical route inventory extracted from App.tsx. Do not invent extra product areas. */

export type RouteAudience =
  | "public"
  | "authentication"
  | "member"
  | "professional"
  | "company"
  | "supplier"
  | "reviewer"
  | "moderator"
  | "admin"
  | "super_admin";

export type RouteRecord = {
  path: string;
  audience: RouteAudience;
  nav: "header" | "explore" | "footer" | "dashboard" | "admin" | "user" | "inline" | "alias" | "utility";
};

export const LIBRARY_ACTIVE_PREFIXES = [
  "/publications",
  "/library",
  "/books",
  "/research",
  "/policies",
] as const;

export const PLATFORM_ROUTES: RouteRecord[] = [
  { path: "/", audience: "public", nav: "header" },
  { path: "/welcome", audience: "public", nav: "utility" },
  { path: "/auth", audience: "authentication", nav: "header" },
  { path: "/verify-email", audience: "authentication", nav: "inline" },
  { path: "/email-verified", audience: "member", nav: "utility" },
  { path: "/auth/callback", audience: "authentication", nav: "utility" },
  { path: "/auth/error", audience: "authentication", nav: "utility" },
  { path: "/terms", audience: "public", nav: "footer" },
  { path: "/privacy", audience: "public", nav: "footer" },
  { path: "/enterprise", audience: "public", nav: "explore" },
  { path: "/community", audience: "public", nav: "header" },
  { path: "/insights", audience: "public", nav: "header" },
  { path: "/publications", audience: "public", nav: "header" },
  { path: "/publications/books", audience: "public", nav: "explore" },
  { path: "/publications/research", audience: "public", nav: "explore" },
  { path: "/publications/:slug", audience: "public", nav: "inline" },
  { path: "/library", audience: "public", nav: "alias" },
  { path: "/books", audience: "public", nav: "alias" },
  { path: "/books/:slug", audience: "public", nav: "alias" },
  { path: "/books/:slug/chapters/:chapterSlug", audience: "public", nav: "inline" },
  { path: "/research", audience: "public", nav: "alias" },
  { path: "/research/:slug", audience: "public", nav: "alias" },
  { path: "/policies", audience: "public", nav: "footer" },
  { path: "/policies/:slug", audience: "public", nav: "inline" },
  { path: "/members", audience: "public", nav: "header" },
  { path: "/members/:id", audience: "public", nav: "inline" },
  { path: "/companies", audience: "public", nav: "header" },
  { path: "/companies/:slug", audience: "public", nav: "inline" },
  { path: "/jobs", audience: "public", nav: "header" },
  { path: "/jobs/:slug", audience: "public", nav: "inline" },
  { path: "/forum", audience: "public", nav: "header" },
  { path: "/forum/c/:slug", audience: "public", nav: "inline" },
  { path: "/forum/t/:id", audience: "public", nav: "inline" },
  { path: "/marketplace", audience: "public", nav: "header" },
  { path: "/marketplace/suppliers", audience: "public", nav: "inline" },
  { path: "/marketplace/suppliers/:slug", audience: "public", nav: "inline" },
  { path: "/marketplace/materials", audience: "public", nav: "inline" },
  { path: "/marketplace/materials/:slug", audience: "public", nav: "inline" },
  { path: "/marketplace/rfq", audience: "member", nav: "inline" },
  { path: "/market", audience: "public", nav: "header" },
  { path: "/blog", audience: "public", nav: "header" },
  { path: "/blog/:slug", audience: "public", nav: "inline" },
  { path: "/consultations", audience: "public", nav: "explore" },
  { path: "/consultations/experts", audience: "public", nav: "inline" },
  { path: "/consultations/experts/:id", audience: "public", nav: "inline" },
  { path: "/events", audience: "public", nav: "explore" },
  { path: "/events/:slug", audience: "public", nav: "inline" },
  { path: "/discover", audience: "public", nav: "explore" },
  { path: "/search", audience: "public", nav: "header" },
  { path: "/messages", audience: "member", nav: "header" },
  { path: "/dashboard", audience: "member", nav: "user" },
  { path: "/dashboard/publications", audience: "member", nav: "dashboard" },
  { path: "/dashboard/publications/:id", audience: "member", nav: "inline" },
  { path: "/dashboard/connections", audience: "member", nav: "dashboard" },
  { path: "/dashboard/saved-jobs", audience: "member", nav: "dashboard" },
  { path: "/dashboard/applications", audience: "member", nav: "dashboard" },
  { path: "/dashboard/rfqs", audience: "member", nav: "dashboard" },
  { path: "/dashboard/rfqs/:id", audience: "member", nav: "inline" },
  { path: "/dashboard/quotes", audience: "member", nav: "dashboard" },
  { path: "/dashboard/blocked", audience: "member", nav: "dashboard" },
  { path: "/dashboard/privacy", audience: "member", nav: "dashboard" },
  { path: "/notifications", audience: "member", nav: "user" },
  { path: "/notifications/preferences", audience: "member", nav: "inline" },
  { path: "/verification", audience: "member", nav: "dashboard" },
  { path: "/submit-publication", audience: "member", nav: "inline" },
  { path: "/my-library", audience: "member", nav: "alias" },
  { path: "/my-library/:id", audience: "member", nav: "alias" },
  { path: "/company/dashboard", audience: "company", nav: "dashboard" },
  { path: "/supplier/catalog", audience: "supplier", nav: "dashboard" },
  { path: "/supplier/quotes", audience: "supplier", nav: "dashboard" },
  { path: "/expert/consultations", audience: "professional", nav: "inline" },
  { path: "/admin", audience: "admin", nav: "admin" },
  { path: "/admin/ops", audience: "moderator", nav: "admin" },
  { path: "/admin/verification", audience: "reviewer", nav: "admin" },
  { path: "/admin/marketplace", audience: "reviewer", nav: "admin" },
  { path: "/admin/publications", audience: "reviewer", nav: "admin" },
  { path: "/admin/publications/:id", audience: "reviewer", nav: "inline" },
  { path: "/admin/academy/:courseId", audience: "admin", nav: "admin" },
  { path: "/admin/events", audience: "moderator", nav: "alias" },
  { path: "/pricing", audience: "public", nav: "alias" },
  { path: "/courses", audience: "public", nav: "alias" },
  { path: "/learn", audience: "public", nav: "alias" },
  { path: "/certificates", audience: "public", nav: "alias" },
  { path: "/dashboard/jobs", audience: "member", nav: "alias" },
  { path: "/dashboard/consultations", audience: "member", nav: "alias" },
  { path: "/dashboard/events", audience: "member", nav: "alias" },
  { path: "/company/jobs/:id/applications", audience: "company", nav: "alias" },
];

export function isLibraryNavPath(pathname: string): boolean {
  return LIBRARY_ACTIVE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function canonicalLibraryPath(pathname: string): string | null {
  if (pathname === "/library") return "/publications";
  if (pathname === "/books") return "/publications/books";
  if (pathname === "/research") return "/publications/research";
  if (pathname === "/my-library") return "/dashboard/publications";
  const book = pathname.match(/^\/books\/([^/]+)$/);
  if (book) return `/publications/${book[1]}`;
  const research = pathname.match(/^\/research\/([^/]+)$/);
  if (research) return `/publications/${research[1]}`;
  const mine = pathname.match(/^\/my-library\/([^/]+)$/);
  if (mine) return `/dashboard/publications/${mine[1]}`;
  return null;
}
