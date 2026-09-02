import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { rememberPendingVerificationEmail } from "@/lib/auth-utils";

/** Exact public/auth paths accessible while logged-in but email is not yet verified */
const ALLOWED_WHILE_UNVERIFIED = new Set([
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
  "/search",
  "/market",
  "/forum",
  "/jobs",
  "/insights",
  "/courses",
  "/consultations",
  "/blog",
  "/library",
  "/books",
  "/research",
  "/policies",
]);

/** Nested public or legacy-redirect prefixes that must stay readable while verifying */
const ALLOWED_PREFIXES = [
  "/blog/",
  "/insights/",
  "/courses/",
  "/members/",
  "/forum/",
  "/jobs/",
  "/market/",
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

export default function EmailVerificationGuard({ children }: { children: React.ReactNode }) {
  const { user, isEmailVerified, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || isEmailVerified) return;
    if (isAllowedPath(location.pathname)) return;

    if (user.email) rememberPendingVerificationEmail(user.email);
    navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`, { replace: true });
  }, [user, isEmailVerified, loading, location.pathname, navigate]);

  return <>{children}</>;
}
