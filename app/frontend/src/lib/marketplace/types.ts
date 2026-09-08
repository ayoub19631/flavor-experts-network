export const SUPPLIER_TYPES = ["manufacturer", "distributor", "agent"] as const;
export const RFQ_STATUSES = [
  "draft",
  "published",
  "invited",
  "receiving_quotes",
  "under_review",
  "shortlisted",
  "accepted",
  "closed",
  "cancelled",
  "expired",
] as const;
export const QUOTE_STATUSES = [
  "draft",
  "submitted",
  "revised",
  "shortlisted",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
] as const;
export const MARKETPLACE_REGIONS = ["EU", "USA", "India", "Middle East", "Africa", "Asia", "LatAm"] as const;
export const DOC_TYPES = ["coa", "tds", "sds", "halal", "kosher", "allergen", "gmo", "other"] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];
export type RfqStatus = (typeof RFQ_STATUSES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type PublicSupplier = {
  id: string;
  slug: string;
  legal_name?: string | null;
  trade_name: string;
  supplier_type: SupplierType | string;
  logo_url?: string | null;
  cover_url?: string | null;
  country?: string | null;
  city?: string | null;
  about?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  markets?: string[] | null;
  is_verified?: boolean | null;
  listing_status?: string | null;
  updated_at?: string | null;
  last_catalog_update_at?: string | null;
};

export type PublicMaterial = {
  id: string;
  slug: string;
  trade_name: string;
  generic_name?: string | null;
  category?: string | null;
  physical_form?: string | null;
  country_of_origin?: string | null;
  sample_available?: boolean | null;
  supplier_id?: string;
  supplier_slug?: string;
  supplier_name?: string;
  supplier_verified?: boolean | null;
  certifications?: string[] | null;
  updated_at?: string | null;
};

export type RfqLineInput = {
  material_id?: string | null;
  material_name: string;
  specs?: string;
  quantity?: number | string;
  unit?: string;
};

export const PUBLIC_SEARCH_PRICE_KEYS = ["price", "unit_price", "quote_price", "amount"] as const;
