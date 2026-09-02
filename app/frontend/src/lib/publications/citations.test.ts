import { describe, expect, it } from "vitest";
import { citationBundle } from "./citations";

describe("citations", () => {
  it("does not invent DOI or ISBN when they are absent", () => {
    const bundle = citationBundle({
      title: "Flavor Creation Fundamentals – Volume 1",
      authors: [{ full_name: "Example Author" }],
      publishedAt: "2026-01-01",
      type: "book",
    });
    expect(bundle.apa).toContain("Flavor Creation Fundamentals – Volume 1");
    expect(bundle.apa).not.toMatch(/doi\.org/);
    expect(bundle.harvard).not.toMatch(/doi\.org/);
    expect(bundle.bibtex).not.toMatch(/doi =/);
    expect(bundle.ris).not.toMatch(/DO {2}-/);
  });

  it("includes DOI only when provided", () => {
    const bundle = citationBundle({
      title: "Sensory study",
      authors: [{ full_name: "A Researcher" }],
      doi: "10.1234/example",
      type: "original_research",
    });
    expect(bundle.apa).toContain("10.1234/example");
    expect(bundle.bibtex).toContain("10.1234/example");
  });
});
