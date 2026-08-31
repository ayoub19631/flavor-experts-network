const RETIRED_EMAIL_MARKERS = [
  "nexusflavor.com",
  "ayoub@flavorexperts.net",
];

function isRetiredPublicEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return RETIRED_EMAIL_MARKERS.some((marker) => normalized.includes(marker));
}

function firstConfiguredEmail(...candidates: Array<string | undefined>): string {
  for (const value of candidates) {
    const trimmed = (value || "").trim();
    if (trimmed.includes("@") && !isRetiredPublicEmail(trimmed)) {
      return trimmed;
    }
  }
  return "";
}

const env = import.meta.env;

export const PUBLIC_SUPPORT_EMAIL = firstConfiguredEmail(
  env.VITE_SUPPORT_EMAIL,
  env.NEXT_PUBLIC_SUPPORT_EMAIL,
);

export const PUBLIC_PRIVACY_EMAIL = firstConfiguredEmail(
  env.VITE_PRIVACY_EMAIL,
  env.NEXT_PUBLIC_PRIVACY_EMAIL,
  PUBLIC_SUPPORT_EMAIL,
);

export function emailIsConfigured(address: string | undefined | null): boolean {
  return Boolean(address && address.includes("@") && !isRetiredPublicEmail(address));
}
