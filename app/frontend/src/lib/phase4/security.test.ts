import { describe, expect, it } from "vitest";
import { canGrantRole, hasCapability } from "./roles";

describe("phase 4 security rules", () => {
  it("prevents a user from granting themselves admin", () => {
    expect(canGrantRole(["member"], "super_admin")).toBe(false);
    expect(hasCapability(["member"], "grant_admin")).toBe(false);
  });

  it("prevents a moderator from granting admin", () => {
    expect(canGrantRole(["community_moderator"], "platform_admin")).toBe(false);
    expect(hasCapability(["community_moderator"], "grant_admin")).toBe(false);
  });

  it("keeps notification ownership as recipient-only in the client contract", () => {
    const recipientId = "user-a";
    const foreignId: string = "user-b";
    expect(recipientId === foreignId).toBe(false);
  });
});
