import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "./types";
import { isAuthorizedAdminEmail } from "./site-config";

export function isPlatformPrivateMode(): boolean {
  return import.meta.env.VITE_PLATFORM_PRIVATE === "true";
}

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getPlatformAccessAllowlist(): string[] {
  const emails = new Set<string>(parseAllowlist(import.meta.env.VITE_PLATFORM_ACCESS_ALLOWLIST));

  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
  if (adminEmail) emails.add(adminEmail);

  return [...emails];
}

export function isEmailOnPlatformAllowlist(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return getPlatformAccessAllowlist().includes(normalized) || isAuthorizedAdminEmail(normalized);
}

export function resolvePlatformAccess(
  user: User | null | undefined,
  profile: UserProfile | null | undefined
): boolean {
  if (!isPlatformPrivateMode()) return true;
  if (profile?.is_admin) return true;
  if (profile?.platform_preview_access) return true;
  return isEmailOnPlatformAllowlist(user?.email ?? profile?.email);
}

const AUTH_EXEMPT_PATHS = new Set([
  "/auth",
  "/auth/callback",
  "/auth/error",
  "/verify-email",
]);

export function isPlatformAuthExemptPath(pathname: string): boolean {
  return AUTH_EXEMPT_PATHS.has(pathname);
}
