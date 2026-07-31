/**
 * URL safety helpers for user-controlled links (profiles, jobs, posts).
 * Prevents stored-XSS via javascript:/data: URLs and normalizes http → https.
 */

/** Returns a safe https URL string, or null when the input is unsafe/invalid. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  let url: URL;
  try {
    // Bare domains (example.com) get an https scheme assumed.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") return null; // blocks javascript:, data:, vbscript:, file:, etc.
  if (!url.hostname.includes(".")) return null; // require a real host
  return url.toString();
}

/** True when the value resolves to a safe https URL. */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
  return safeHttpUrl(value) !== null;
}

/** LinkedIn profile/company URLs only (extra strictness for the LinkedIn field). */
export function safeLinkedInUrl(value: string | null | undefined): string | null {
  const safe = safeHttpUrl(value);
  if (!safe) return null;
  try {
    const host = new URL(safe).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com") ? safe : null;
  } catch {
    return null;
  }
}
