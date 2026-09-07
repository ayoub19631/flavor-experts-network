import { describe, expect, it } from "vitest";
import { isUsableSearchQuery, normalizeSearchText, searchQueryIsSensitive } from "./normalize";

describe("Arabic search normalization", () => {
  it("folds common Arabic letter variants", () => {
    expect(normalizeSearchText("أحمد")).toBe(normalizeSearchText("احمد"));
    expect(normalizeSearchText("إيمان")).toBe(normalizeSearchText("ايمان"));
    expect(normalizeSearchText("على")).toBe(normalizeSearchText("علي"));
    expect(normalizeSearchText("نكهة")).toBe(normalizeSearchText("نكهه"));
  });

  it("strips tatweel and diacritics", () => {
    expect(normalizeSearchText("نَـكْهَة")).toBe("نكهه");
  });

  it("lowercases English without changing meaning", () => {
    expect(normalizeSearchText("Flavorist")).toBe("flavorist");
  });

  it("rejects email-like and long numeric queries", () => {
    expect(searchQueryIsSensitive("user@example.com")).toBe(true);
    expect(searchQueryIsSensitive("1234567")).toBe(true);
    expect(isUsableSearchQuery("a")).toBe(false);
    expect(isUsableSearchQuery("نكهة")).toBe(true);
  });
});
