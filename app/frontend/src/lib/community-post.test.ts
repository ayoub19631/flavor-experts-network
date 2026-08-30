import { describe, expect, it } from "vitest";
import {
  shouldCollapsePost,
  splitPostPresentation,
  truncatePost,
  uniqueHashtags,
} from "./community-post";

describe("community post preview", () => {
  it("keeps short posts intact", () => {
    expect(shouldCollapsePost("Short professional note.")).toBe(false);
    expect(truncatePost("Short professional note.")).toBe("Short professional note.");
  });

  it("collapses long technical posts at a paragraph", () => {
    const first = "Toffee is built from caramelized sugar, butter, and dairy warmth.";
    const rest = Array.from({ length: 20 }, (_, i) => `Line ${i} with propylene glycol 705 g and vanillin 50 g.`).join("\n");
    const text = `${first}\n\n${rest}`;
    expect(shouldCollapsePost(text)).toBe(true);
    expect(truncatePost(text)).toBe(first);
  });

  it("extracts a title line and unique hashtags", () => {
    const text =
      "How Is a Professional Toffee Flavor Built? | Flavor Experts Network\n\nBody starts here with enough extra text to qualify as a long professional article about flavor chemistry.\n#Toffee #toffee #FlavorScience";
    expect(splitPostPresentation(text).title).toContain("Toffee Flavor");
    expect(uniqueHashtags(text)).toEqual(["#Toffee", "#FlavorScience"]);
  });
});
