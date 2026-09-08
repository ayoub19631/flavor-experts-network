import { supabase } from "@/lib/supabase";
import { isMissingSchemaError } from "@/lib/publications/schema-errors";
import { isUsableSearchQuery } from "./normalize";
import type {
  DiscoverHit,
  DiscoverSection,
  SearchAdapter,
  SearchCursor,
  SearchFilters,
  SearchHit,
  SearchPageResult,
} from "./types";

const GUEST_RECENTS_KEY = "fen-search-recents";

function safeHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "/search";
  return href;
}

function mapHit(row: SearchHit): SearchHit {
  return { ...row, href: safeHref(row.href || "/search") };
}

function guestRecents(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return parsed.filter((item) => typeof item === "string").slice(0, 8);
  } catch {
    return [];
  }
}

function writeGuestRecents(items: string[]) {
  localStorage.setItem(GUEST_RECENTS_KEY, JSON.stringify(items.slice(0, 8)));
}

export const postgresSearchAdapter: SearchAdapter = {
  async search(query, filters = {}, cursor = null, limit = 20): Promise<SearchPageResult> {
    const started = performance.now();
    if (!isUsableSearchQuery(query)) {
      return { hits: [], hasMore: false, cursor: null, latencyMs: 0, error: null };
    }
    const { data, error } = await supabase.rpc("global_search", {
      p_query: query.trim(),
      p_types: filters.types?.length ? filters.types : null,
      p_limit: Math.min(Math.max(limit, 1), 40),
      p_sort: filters.sort === "newest" ? "newest" : "relevance",
      p_country: filters.country || null,
      p_language: filters.language || null,
      p_specialty: filters.specialty || null,
      p_category: filters.category || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_cursor_rank: cursor?.rank ?? null,
      p_cursor_created: cursor?.created_at ?? null,
      p_cursor_type: cursor?.entity_type ?? null,
      p_cursor_id: cursor?.entity_id ?? null,
    });
    const latencyMs = Math.round(performance.now() - started);
    if (error) {
      return {
        hits: [],
        hasMore: false,
        cursor: null,
        latencyMs,
        error: isMissingSchemaError(error.message) ? null : error.message,
      };
    }
    const wantMarket =
      !filters.types?.length ||
      filters.types.some((type) => type === "suppliers" || type === "raw_materials");
    const market = wantMarket
      ? await supabase.rpc("marketplace_search", {
          p_query: query.trim(),
          p_types: filters.types?.length ? filters.types : ["suppliers", "raw_materials"],
          p_limit: Math.min(Math.max(limit, 1), 20),
        })
      : { data: [] as SearchHit[], error: null };
    const merged = [...((data as SearchHit[]) || []), ...((market.data as SearchHit[]) || [])];
    const seen = new Set<string>();
    const hits = merged
      .map(mapHit)
      .filter((hit) => {
        const key = `${hit.entity_type}:${hit.entity_id}:${hit.href}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return !hit.href.startsWith("/dashboard") && !hit.href.startsWith("/supplier/");
      });
    const last = hits[hits.length - 1];
    return {
      hits,
      hasMore: Boolean(hits[0]?.has_more),
      cursor: last
        ? {
            rank: last.rank,
            created_at: last.created_at || "",
            entity_type: last.entity_type,
            entity_id: last.entity_id,
          }
        : null,
      latencyMs,
      error: null,
    };
  },

  async suggest(query, limit = 8) {
    if (!isUsableSearchQuery(query)) return [];
    const { data, error } = await supabase.rpc("global_search_suggest", {
      p_query: query.trim(),
      p_limit: Math.min(Math.max(limit, 1), 8),
    });
    if (error) return [];
    const market = await supabase.rpc("marketplace_search", {
      p_query: query.trim(),
      p_types: ["suppliers", "raw_materials"],
      p_limit: 4,
    });
    return [...((data as SearchHit[]) || []), ...((market.data as SearchHit[]) || [])].map(mapHit);
  },

  async remember(query) {
    const trimmed = query.trim();
    if (!isUsableSearchQuery(trimmed)) return;
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      writeGuestRecents([trimmed, ...guestRecents().filter((item) => item !== trimmed)]);
      return;
    }
    await supabase.from("search_recents").upsert({
      user_id: session.user.id,
      query: trimmed,
      created_at: new Date().toISOString(),
    });
  },

  async recents() {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return guestRecents();
    const { data } = await supabase
      .from("search_recents")
      .select("query, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    return ((data as Array<{ query: string }>) || []).map((row) => row.query);
  },

  async clearHistory() {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      localStorage.removeItem(GUEST_RECENTS_KEY);
      return;
    }
    await supabase.rpc("clear_my_search_history");
  },

  async recordEvent(query, meta) {
    if (!isUsableSearchQuery(query)) return;
    await supabase.rpc("record_search_event", {
      p_query: query.trim(),
      p_has_results: meta.hasResults ?? null,
      p_latency_ms: meta.latencyMs ?? null,
      p_entity_type: meta.entityType ?? null,
      p_clicked: meta.clicked ?? false,
    });
  },

  async discover(section: DiscoverSection, limit = 6) {
    const { data, error } = await supabase.rpc("discover_feed", {
      p_section: section,
      p_limit: limit,
    });
    if (error) return [];
    return ((data as DiscoverHit[]) || []).map((row) => ({ ...row, href: safeHref(row.href) }));
  },
};

export const searchAdapter: SearchAdapter = postgresSearchAdapter;
