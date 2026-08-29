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

export function mapAuthErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("weak") || m.includes("easy to guess") || m.includes("pwned") || m.includes("leaked")) {
    return "WEAK_PASSWORD";
  }
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return "ALREADY_EXISTS";
  }
  if (m.includes("hook") || m.includes("authorization token") || m.includes("unexpected_failure")) {
    return "EMAIL_HOOK";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "RATE_LIMIT";
  }
  if (m.includes("website") || m.includes("check constraint") || m.includes("website_url")) {
    return "WEBSITE";
  }
  return message;
}

export type PendingCompanyClaim = {
  email: string;
  company: string;
  website?: string | null;
  phone?: string | null;
  industry?: string | null;
};

const PENDING_COMPANY_KEY = "fen-pending-company";

export function rememberPendingCompany(details: PendingCompanyClaim) {
  localStorage.setItem(
    PENDING_COMPANY_KEY,
    JSON.stringify({ ...details, email: details.email.trim().toLowerCase() }),
  );
}

export function consumePendingCompany(email?: string | null): PendingCompanyClaim | null {
  const raw = localStorage.getItem(PENDING_COMPANY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingCompanyClaim;
    if (!parsed?.company || typeof parsed.company !== "string") {
      localStorage.removeItem(PENDING_COMPANY_KEY);
      return null;
    }
    if (email && parsed.email && parsed.email !== email.trim().toLowerCase()) {
      return null;
    }
    localStorage.removeItem(PENDING_COMPANY_KEY);
    return parsed;
  } catch {
    localStorage.removeItem(PENDING_COMPANY_KEY);
    return null;
  }
}
