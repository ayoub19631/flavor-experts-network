export const SEARCH_TYPES = [
  "people",
  "companies",
  "suppliers",
  "raw_materials",
  "jobs",
  "publications",
  "books",
  "research",
  "posts",
  "forum",
  "events",
] as const;

export type SearchEntityType = (typeof SEARCH_TYPES)[number];

export type SearchSort = "relevance" | "newest";

export type SearchHit = {
  entity_type: SearchEntityType | string;
  entity_id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  rank: number;
  created_at?: string | null;
  snippet?: string | null;
  is_verified?: boolean | null;
  has_more?: boolean | null;
};

export type SearchFilters = {
  types?: SearchEntityType[] | null;
  country?: string | null;
  language?: string | null;
  specialty?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: SearchSort;
};

export type SearchPageResult = {
  hits: SearchHit[];
  hasMore: boolean;
  cursor: SearchCursor | null;
  latencyMs: number;
  error: string | null;
};

export type SearchCursor = {
  rank: number;
  created_at: string;
  entity_type: string;
  entity_id: string;
};

export type DiscoverHit = {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  reason?: string | null;
  created_at?: string | null;
};

export type DiscoverSection = "experts" | "companies" | "publications" | "discussions" | "jobs";

export interface SearchAdapter {
  search(query: string, filters?: SearchFilters, cursor?: SearchCursor | null, limit?: number): Promise<SearchPageResult>;
  suggest(query: string, limit?: number): Promise<SearchHit[]>;
  remember(query: string): Promise<void>;
  recents(): Promise<string[]>;
  clearHistory(): Promise<void>;
  recordEvent(query: string, meta: { hasResults?: boolean; latencyMs?: number; entityType?: string; clicked?: boolean }): Promise<void>;
  discover(section: DiscoverSection, limit?: number): Promise<DiscoverHit[]>;
}
