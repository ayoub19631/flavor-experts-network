import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "./normalize";
import { compareSearchHits, searchRank } from "./ranking";

describe("search ranking", () => {
  it("ranks exact title above prefix, keywords, and freshness", () => {
    const q = normalizeSearchText("flavor chemist");
    const exact = searchRank({
      normQuery: q,
      normTitle: q,
      normHaystack: q,
      fts: 0.2,
      freshness: 1,
    });
    const prefix = searchRank({
      normQuery: q,
      normTitle: `${q} senior`,
      normHaystack: `${q} senior`,
      fts: 0.9,
      verified: true,
      freshness: 1,
    });
    const keyword = searchRank({
      normQuery: q,
      normTitle: "senior scientist",
      normHaystack: `senior scientist ${q}`,
      fts: 1,
      verified: true,
      quality: 1,
      freshness: 1,
    });
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(keyword);
  });

  it("does not let capped engagement outrank an exact name", () => {
    const q = normalizeSearchText("vanillin");
    const exact = searchRank({ normQuery: q, normTitle: q, normHaystack: q, freshness: 0 });
    const popular = searchRank({
      normQuery: q,
      normTitle: "other title",
      normHaystack: "other title",
      fts: 1,
      verified: true,
      quality: 1,
      freshness: 1,
    });
    expect(exact).toBeGreaterThan(popular);
  });

  it("sorts newest independently of rank", () => {
    const a = { entity_id: "a", rank: 10, created_at: "2026-01-01T00:00:00Z" };
    const b = { entity_id: "b", rank: 1, created_at: "2026-09-01T00:00:00Z" };
    expect(compareSearchHits(a, b, "newest")).toBeGreaterThan(0);
    expect(compareSearchHits(a, b, "relevance")).toBeLessThan(0);
  });
});
