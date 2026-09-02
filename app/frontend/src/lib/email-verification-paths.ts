/** Exact public/auth paths accessible while logged-in but email is not yet verified */
export const ALLOWED_WHILE_UNVERIFIED = new Set([
  "/",
  "/welcome",
  "/community",
  "/auth",
  "/verify-email",
  "/email-verified",
  "/auth/callback",
  "/auth/error",
  "/terms",
  "/privacy",
  "/pricing",
  "/enterprise",
  "/members",
  "/companies",
  "/search",
  "/market",
  "/forum",
  "/jobs",
  "/insights",
  "/courses",
  "/consultations",
  "/events",
  "/blog",
  "/library",
  "/books",
  "/research",
  "/policies",
]);

/** Nested public or legacy-redirect prefixes that must stay readable while verifying */
export const ALLOWED_PREFIXES = [
  "/blog/",
  "/insights/",
  "/courses/",
  "/members/",
  "/companies/",
  "/forum/",
  "/jobs/",
  "/market/",
  "/consultations/",
  "/events/",
  "/learn",
  "/certificates",
  "/auth/",
  "/library/",
  "/books/",
  "/research/",
  "/policies/",
];

export function isAllowedPath(pathname: string): boolean {
  if (ALLOWED_WHILE_UNVERIFIED.has(pathname)) return true;
  return ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}
