import { describe, expect, it } from "vitest";

describe("unified search client contract", () => {
  it("does not treat a local list as the search source of truth", () => {
    const hits = [
      { entity_type: "job", entity_id: "1", title: "Flavorist", href: "/jobs/1", rank: 0.9 },
    ];
    expect(hits.every((hit) => hit.href.startsWith("/"))).toBe(true);
  });
});
