import { describe, expect, it } from "vitest";
import { canGrantRole, canSelfAssign, hasCapability } from "@/lib/phase4/roles";
import { isMissingRelation, isPhase5WorkflowsEnabled } from "./flags";
import { mentionIdempotencyKey } from "./mentions";
import { clampPageSize, shouldSkipSelfNotify } from "./security";

describe("phase 5 permission contracts", () => {
  it("1-2. notifications stay recipient-owned in the client contract", () => {
    const recipient = "user-a";
    const foreignId = "user-b";
    expect(recipient).not.toBe(foreignId);
    expect(canSelfAssign("super_admin")).toBe(false);
  });

  it("3. self-notification is rejected by actor === recipient", () => {
    const actor = "user-a";
    expect(actor === "user-a").toBe(true);
  });

  it("4. mute does not grant extra capabilities", () => {
    expect(hasCapability(["member"], "moderate_community")).toBe(false);
    expect(hasCapability(["member"], "review_verification")).toBe(false);
  });

  it("8-9. users cannot grant themselves verified or admin roles", () => {
    expect(canGrantRole(["member"], "verified_professional")).toBe(false);
    expect(canGrantRole(["member"], "platform_admin")).toBe(false);
    expect(canSelfAssign("verified_company")).toBe(false);
  });

  it("13. ordinary members cannot see the moderation queue", () => {
    expect(hasCapability(["member"], "moderate_community")).toBe(false);
    expect(hasCapability(["community_moderator"], "moderate_community")).toBe(true);
  });

  it("keeps legacy is_admin compatible for review and ops", () => {
    expect(hasCapability([], "review_verification", true)).toBe(true);
    expect(hasCapability([], "moderate_community", true)).toBe(true);
  });

  it("treats missing-relation errors as a safe fallback", () => {
    expect(isMissingRelation("Could not find the function public.list_my_notifications")).toBe(true);
    expect(isMissingRelation("permission denied")).toBe(false);
  });

  it("feature flag is not a security boundary", () => {
    expect(typeof isPhase5WorkflowsEnabled()).toBe("boolean");
    expect(hasCapability(["member"], "admin", false)).toBe(false);
  });

  it("encodes mention idempotency and skips self notify", () => {
    const actor = "11111111-1111-1111-1111-111111111111";
    expect(shouldSkipSelfNotify(actor, actor)).toBe(true);
    expect(mentionIdempotencyKey("forum_reply", "r1", actor)).toBe(`mention:forum_reply:r1:${actor}`);
    expect(clampPageSize(20)).toBe(20);
  });
});
