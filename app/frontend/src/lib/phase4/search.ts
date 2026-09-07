import { searchAdapter, type SearchHit } from "@/lib/search";

export type UnifiedHit = Pick<SearchHit, "entity_type" | "entity_id" | "title" | "href" | "rank">;

export async function unifiedSearch(query: string) {
  const result = await searchAdapter.search(query, undefined, null, 8);
  return { data: result.hits, error: result.error };
}

export async function rememberSearch(query: string) {
  await searchAdapter.remember(query);
}
