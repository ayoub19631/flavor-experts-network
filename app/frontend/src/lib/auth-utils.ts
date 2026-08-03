import type { User } from "@supabase/supabase-js";
import { SITE } from "@/lib/site-config";
import { isNativeApp } from "@/lib/native";

export const EMAIL_NOT_CONFIRMED_CODE = "EMAIL_NOT_CONFIRMED";

function viteBasePath(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return !base || base === "/" ? "" : base;
}

export function getAuthRedirectUrl(path = "/auth/callback"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  // Email links (confirmations, resets) must open the real website — inside a
  // Capacitor app window.location.origin is https://localhost which is useless
  // in an email client.
  if (isNativeApp()) {
    return `${SITE.url}${suffix}`;
  }
  if (typeof window !== "undefined") {
    // Include Vite base (e.g. /flavor-experts-network) for GitHub Pages deploys.
    return `${window.location.origin}${viteBasePath()}${suffix}`;
  }
  return `${SITE.url}${suffix}`;
}

export function isEmailVerified(user: User | null | undefined): boolean {
  return Boolean(user?.email_confirmed_at);
}

export function isEmailNotConfirmedError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("email not confirmed") ||
    m.includes("email not verified") ||
    m.includes("not confirmed") ||
    m.includes("confirm your email")
  );
}

export function rememberPendingVerificationEmail(email: string) {
  localStorage.setItem("fen-verify-email", email.trim().toLowerCase());
}

export function clearPendingVerificationEmail() {
  localStorage.removeItem("fen-verify-email");
}
