import { describe, expect, it } from "vitest";
import { canGrantRole, canSelfAssign, hasCapability } from "./roles";

describe("platform roles", () => {
  it("blocks ordinary members from granting admin", () => {
    expect(canGrantRole(["member"], "platform_admin")).toBe(false);
    expect(canGrantRole(["community_moderator"], "super_admin")).toBe(false);
    expect(canGrantRole(["super_admin"], "platform_admin")).toBe(true);
  });

  it("does not allow self-assignment of privileged roles", () => {
    expect(canSelfAssign("super_admin")).toBe(false);
    expect(canSelfAssign("platform_admin")).toBe(false);
  });

  it("keeps the legacy is_admin flag compatible", () => {
    expect(hasCapability([], "admin", true)).toBe(true);
    expect(hasCapability(["member"], "moderate_community")).toBe(false);
    expect(hasCapability(["community_moderator"], "moderate_community")).toBe(true);
  });

  it("does not let ordinary members review publications", () => {
    expect(hasCapability(["member"], "review_publications")).toBe(false);
    expect(hasCapability(["research_editor"], "review_publications")).toBe(true);
    expect(hasCapability([], "review_publications", true)).toBe(true);
  });
});
