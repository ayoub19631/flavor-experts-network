import { describe, expect, it } from "vitest";
import { filterPublicMembers, isHiddenTestMember } from "./public-members";

describe("public member directory filter", () => {
  it("hides QA automation accounts", () => {
    expect(isHiddenTestMember({ full_name: "ayobe895+companyqa1788031850943" })).toBe(true);
    expect(isHiddenTestMember({ full_name: "Ayoub Akbik" })).toBe(false);
  });

  it("hides flagged test and inactive accounts", () => {
    expect(isHiddenTestMember({ full_name: "Visible Expert", is_test_account: true })).toBe(true);
    expect(isHiddenTestMember({ full_name: "Suspended Expert", is_active: false })).toBe(true);
  });

  it("removes hidden accounts from listings", () => {
    const visible = filterPublicMembers([
      { full_name: "Talal Al Boushi" },
      { full_name: "ayobe895+companyqa1" },
    ]);
    expect(visible).toHaveLength(1);
    expect(visible[0].full_name).toBe("Talal Al Boushi");
  });
});
