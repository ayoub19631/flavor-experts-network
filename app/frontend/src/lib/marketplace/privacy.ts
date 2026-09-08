import { PUBLIC_SEARCH_PRICE_KEYS } from "./types";

export function stripPrivateMarketplaceFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const key of PUBLIC_SEARCH_PRICE_KEYS) {
    if (key in next) delete next[key];
  }
  delete next.storage_path;
  delete next.buyer_id;
  delete next.supplier_owner_id;
  return next;
}

export function isPublicMarketplaceHref(href: string): boolean {
  return (
    href === "/marketplace" ||
    href.startsWith("/marketplace/suppliers/") ||
    href.startsWith("/marketplace/materials/") ||
    href === "/marketplace/suppliers" ||
    href === "/marketplace/materials"
  );
}

export function shouldIndexMarketplacePath(path: string): boolean {
  if (!path.startsWith("/marketplace")) return false;
  if (path === "/marketplace/rfq" || path.startsWith("/marketplace/rfq/")) return false;
  return true;
}

export function showVerifiedBadge(isVerified: boolean | null | undefined): boolean {
  return isVerified === true;
}
