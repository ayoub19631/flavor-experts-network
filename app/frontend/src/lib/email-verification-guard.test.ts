import { describe, expect, it } from "vitest";
import { isAllowedPath } from "@/lib/email-verification-paths";

describe("unverified session public paths", () => {
  it("keeps public network pages readable", () => {
    expect(isAllowedPath("/")).toBe(true);
    expect(isAllowedPath("/insights")).toBe(true);
    expect(isAllowedPath("/community")).toBe(true);
    expect(isAllowedPath("/market")).toBe(true);
    expect(isAllowedPath("/members/abc")).toBe(true);
    expect(isAllowedPath("/companies")).toBe(true);
    expect(isAllowedPath("/companies/al%20sham%20food%20factory%20llc")).toBe(true);
    expect(isAllowedPath("/events")).toBe(true);
    expect(isAllowedPath("/forum/c/flavor-science")).toBe(true);
    expect(isAllowedPath("/forum/t/12")).toBe(true);
    expect(isAllowedPath("/blog/natural-vs-artificial-flavors")).toBe(true);
    expect(isAllowedPath("/library")).toBe(true);
    expect(isAllowedPath("/books/sample")).toBe(true);
    expect(isAllowedPath("/research/sample")).toBe(true);
    expect(isAllowedPath("/policies/publication-ethics")).toBe(true);
  });

  it("lets legacy catalog URLs redirect instead of trapping the user", () => {
    expect(isAllowedPath("/courses")).toBe(true);
    expect(isAllowedPath("/courses/old-slug")).toBe(true);
    expect(isAllowedPath("/learn")).toBe(true);
    expect(isAllowedPath("/certificates/code")).toBe(true);
  });

  it("still sends unverified users away from private tools", () => {
    expect(isAllowedPath("/dashboard")).toBe(false);
    expect(isAllowedPath("/messages")).toBe(false);
    expect(isAllowedPath("/admin")).toBe(false);
  });
});
