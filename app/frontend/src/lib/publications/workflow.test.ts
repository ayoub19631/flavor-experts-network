import { describe, expect, it } from "vitest";
import { canAuthorEditPublication, canPublishPublication, canReadPublication } from "./visibility";
import { PUBLICATION_STATUSES, PUBLICATION_TYPES } from "./types";

describe("phase 6 publication workflow contract", () => {
  it("includes the professional content types and review statuses", () => {
    expect(PUBLICATION_TYPES).toEqual(expect.arrayContaining(["book", "technical_article", "industry_report", "guide"]));
    expect(PUBLICATION_STATUSES).toEqual(expect.arrayContaining([
      "draft", "submitted", "under_review", "revision_requested", "approved", "scheduled", "published", "rejected", "archived",
    ]));
  });

  it("keeps drafts private and published public rows readable", () => {
    expect(canReadPublication({ status: "draft", visibility: "public", created_by: "a" }, {})).toBe(false);
    expect(canReadPublication({ status: "published", visibility: "public", created_by: "a" }, {})).toBe(true);
    expect(canAuthorEditPublication({ status: "rejected", created_by: "a" }, { userId: "a" })).toBe(true);
    expect(canPublishPublication({ userId: "a" })).toBe(false);
  });
});
