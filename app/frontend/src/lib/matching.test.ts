import { describe, expect, it } from "vitest";
import { rankBySkillOverlap, skillOverlapScore, tokenizeSkills } from "./matching";

describe("tokenizeSkills", () => {
  it("merges skills and specialty tokens", () => {
    expect(tokenizeSkills(["Vanilla", "Citrus"], "Flavor Science | Sensory")).toEqual([
      "vanilla",
      "citrus",
      "flavor science",
      "sensory",
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(tokenizeSkills(["Vanilla", "vanilla"], "Vanilla")).toEqual(["vanilla"]);
  });
});

describe("skillOverlapScore", () => {
  it("counts shared tokens", () => {
    expect(skillOverlapScore(["vanilla", "citrus"], ["citrus", "menthol"])).toBe(1);
  });

  it("returns 0 for empty inputs", () => {
    expect(skillOverlapScore([], ["a"])).toBe(0);
    expect(skillOverlapScore(["a"], [])).toBe(0);
  });
});

describe("rankBySkillOverlap", () => {
  it("ranks and limits matches", () => {
    const ranked = rankBySkillOverlap(
      [
        { id: "1", skills: ["vanilla"] },
        { id: "2", skills: ["menthol"] },
        { id: "3", skills: ["vanilla", "citrus"] },
      ],
      (item) => item.skills,
      ["vanilla", "citrus"],
      { limit: 2 },
    );
    expect(ranked.map((r) => r.id)).toEqual(["3", "1"]);
    expect(ranked[0].matchScore).toBe(2);
    expect(ranked[1].matchScore).toBe(1);
  });
});
