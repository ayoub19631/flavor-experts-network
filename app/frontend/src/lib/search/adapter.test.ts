import { describe, expect, it } from "vitest";
import type { SearchHit } from "./types";

function safeHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "/search";
  return href;
}

describe("search result hrefs", () => {
  it("rejects protocol-relative and external targets", () => {
    const hits: SearchHit[] = [
      { entity_type: "people", entity_id: "1", title: "A", href: "/members/1", rank: 1 },
      { entity_type: "jobs", entity_id: "2", title: "B", href: "//evil.example/x", rank: 1 },
      { entity_type: "posts", entity_id: "3", title: "C", href: "https://evil.example", rank: 1 },
    ];
    expect(hits.map((hit) => safeHref(hit.href))).toEqual(["/members/1", "/search", "/search"]);
  });
});
