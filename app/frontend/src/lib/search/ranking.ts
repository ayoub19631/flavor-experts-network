export type SearchRankInput = {
  normQuery: string;
  normTitle: string;
  normHaystack: string;
  fts?: number;
  trgm?: number;
  verified?: boolean;
  quality?: number;
  freshness?: number;
};

export function searchRank(input: SearchRankInput): number {
  const exact = input.normTitle && input.normTitle === input.normQuery ? 1000 : 0;
  const prefix =
    input.normTitle &&
    input.normQuery &&
    input.normTitle.startsWith(input.normQuery) &&
    input.normTitle !== input.normQuery
      ? 600
      : 0;
  const keywords =
    input.normHaystack &&
    input.normQuery &&
    input.normHaystack.includes(input.normQuery) &&
    input.normTitle !== input.normQuery
      ? 300
      : 0;
  const fts = Math.min((input.fts ?? 0) * 80, 200);
  const trgm = Math.min((input.trgm ?? 0) * 50, 40);
  const verified = input.verified ? 40 : 0;
  const quality = Math.min(Math.max(input.quality ?? 0, 0), 1) * 30;
  const freshness = Math.min(Math.max(input.freshness ?? 0, 0), 1) * 15;
  return exact + prefix + keywords + fts + trgm + verified + quality + freshness;
}

export function compareSearchHits<T extends { rank: number; created_at?: string; entity_id: string }>(
  a: T,
  b: T,
  sort: "relevance" | "newest" = "relevance",
): number {
  if (sort === "newest") {
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  }
  if (b.rank !== a.rank) return b.rank - a.rank;
  return a.entity_id.localeCompare(b.entity_id);
}
