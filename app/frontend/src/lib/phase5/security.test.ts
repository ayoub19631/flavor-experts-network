import { describe, expect, it } from "vitest";
import { hasCapability } from "@/lib/phase4/roles";
import { isAllowedVerificationFile } from "./mentions";
import {
  clampPageSize,
  isValidProfileId,
  mentionDeliveryAllowed,
  safeAppPath,
  shouldSkipSelfNotify,
  uniqueIds,
} from "./security";

const valid = "11111111-1111-1111-1111-111111111111";

describe("phase 5 security contracts", () => {
  it("rejects invalid profile ids", () => {
    expect(isValidProfileId("not-a-uuid")).toBe(false);
    expect(isValidProfileId("<script>")).toBe(false);
    expect(isValidProfileId(valid)).toBe(true);
  });

  it("deduplicates mention ids", () => {
    expect(uniqueIds([valid, valid, "bad"])).toEqual([valid]);
  });

  it("skips self notification", () => {
    expect(shouldSkipSelfNotify(valid, valid)).toBe(true);
    expect(shouldSkipSelfNotify(valid, "22222222-2222-2222-2222-222222222222")).toBe(false);
  });

  it("blocks mention delivery for self, block, and mute", () => {
    expect(mentionDeliveryAllowed({ actorId: valid, mentionedId: valid, blocked: false, muted: false })).toBe(false);
    expect(mentionDeliveryAllowed({ actorId: valid, mentionedId: "22222222-2222-2222-2222-222222222222", blocked: true, muted: false })).toBe(false);
    expect(mentionDeliveryAllowed({ actorId: valid, mentionedId: "22222222-2222-2222-2222-222222222222", blocked: false, muted: true })).toBe(false);
    expect(mentionDeliveryAllowed({ actorId: valid, mentionedId: "22222222-2222-2222-2222-222222222222", blocked: false, muted: false })).toBe(true);
  });

  it("keeps notification links on-app only", () => {
    expect(safeAppPath("/forum/t/1")).toBe("/forum/t/1");
    expect(safeAppPath("https://evil.example/phish")).toBe("/");
    expect(safeAppPath("//evil.example")).toBe("/");
    expect(safeAppPath("javascript:alert(1)")).toBe("/");
  });

  it("clamps pagination", () => {
    expect(clampPageSize(999)).toBe(50);
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(Number.NaN)).toBe(20);
  });

  it("keeps restore and review capability-gated", () => {
    expect(hasCapability(["member"], "moderate_community")).toBe(false);
    expect(hasCapability(["community_moderator"], "moderate_community")).toBe(true);
    expect(hasCapability(["member"], "review_verification")).toBe(false);
  });

  it("rejects unsafe verification files", () => {
    expect(isAllowedVerificationFile(new File(["x"], "a.svg", { type: "image/svg+xml" })).ok).toBe(false);
    expect(isAllowedVerificationFile(new File(["x"], "doc.pdf", { type: "application/pdf" })).ok).toBe(true);
  });
});
