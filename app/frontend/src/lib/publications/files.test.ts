import { describe, expect, it } from "vitest";
import { storedDoiHref } from "./files";
import { buildPublicationStoragePath, isSafeStorageSegment } from "./slug";

describe("publication file guards", () => {
  it("builds an owner-scoped random path and rejects traversal", () => {
    const owner = "11111111-1111-1111-1111-111111111111";
    const pub = "22222222-2222-2222-2222-222222222222";
    const path = buildPublicationStoragePath(owner, pub, "paper.pdf");
    expect(path.startsWith(`${owner}/${pub}/`)).toBe(true);
    expect(path.endsWith(".pdf")).toBe(true);
    expect(path).not.toContain("paper");
    expect(isSafeStorageSegment("..")).toBe(false);
    expect(() => buildPublicationStoragePath(owner, pub, "../x.pdf")).toThrow();
  });

  it("does not invent a DOI URL", () => {
    expect(storedDoiHref(null, null)).toBeNull();
    expect(storedDoiHref("not-a-doi", "https://example.com/doi")).toBeNull();
    expect(storedDoiHref("10.1234/abc", null)).toBe("https://doi.org/10.1234/abc");
    expect(storedDoiHref(null, "https://doi.org/10.1234/abc")).toBe("https://doi.org/10.1234/abc");
  });
});
