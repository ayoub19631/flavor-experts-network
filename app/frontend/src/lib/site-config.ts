import { PUBLIC_PRIVACY_EMAIL, PUBLIC_SUPPORT_EMAIL } from "@/lib/public-emails";
import { PUBLIC_SITE_ORIGIN, SOCIAL_LINKS } from "@/lib/social-links";

/** Central branding & contact configuration */
export const SITE = {
  name: import.meta.env.VITE_APP_TITLE || "Flavor Experts Network",
  tagline: "Flavor Expertise & Science",
  description:
    "A global professional network connecting flavorists, food scientists, R&D professionals, companies, suppliers, and the flavor industry.",
  url: (import.meta.env.VITE_SITE_URL || PUBLIC_SITE_ORIGIN).replace(/\/$/, ""),
  canonicalOrigin: PUBLIC_SITE_ORIGIN,
  domain: "flavorexpertsnetwork.com",
  supportEmail: PUBLIC_SUPPORT_EMAIL,
  privacyEmail: PUBLIC_PRIVACY_EMAIL,
  billingEmail:
    import.meta.env.VITE_BILLING_EMAIL ||
    PUBLIC_SUPPORT_EMAIL,
  linkedInGroup: SOCIAL_LINKS.linkedinGroup,
  logo: "/brand/flavor-expertise-science.webp",
  ogImage:
    import.meta.env.VITE_OG_IMAGE ||
    `${PUBLIC_SITE_ORIGIN}/brand/logo-og.jpg`,
} as const;

export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

/**
 * Platform policy: everything is free for individuals and companies.
 * When true, premium gates are unlocked and checkout UI stays off.
 */
export const PLATFORM_ALWAYS_FREE = true;

/** Explicit kill-switch for checkout. Forced off while the platform is fully free. */
export const PAYMENTS_LIVE =
  !PLATFORM_ALWAYS_FREE &&
  String(import.meta.env.VITE_PAYMENTS_ENABLED || "").toLowerCase() === "true";

export function isAuthorizedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  const primary = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();
  if (primary && normalized === primary) return true;
  const extra = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(normalized);
}
