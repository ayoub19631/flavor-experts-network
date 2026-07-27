import type { User } from "@supabase/supabase-js";
import { SITE } from "@/lib/site-config";

export const EMAIL_NOT_CONFIRMED_CODE = "EMAIL_NOT_CONFIRMED";

export function getAuthRedirectUrl(path = "/auth/callback"): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
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
