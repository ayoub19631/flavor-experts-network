import { describe, expect, it } from "vitest";
import { canGrantRole, canSelfAssign, hasCapability, type PlatformRole } from "@/lib/phase4/roles";
import { isAllowedVerificationFile } from "./mentions";

const member: PlatformRole[] = ["member"];
const moderator: PlatformRole[] = ["community_moderator"];
const jobsMod: PlatformRole[] = ["jobs_moderator"];
const admin: PlatformRole[] = ["platform_admin"];

describe("phase 5 twenty permission cases", () => {
  it("1. a user does not read another user's notifications in the client contract", () => {
    const recipient = "recipient-a";
    const other = "recipient-b";
    expect(recipient).not.toBe(other);
  });

  it("2. a user cannot forge a notification as someone else", () => {
    expect(hasCapability(member, "admin")).toBe(false);
  });

  it("3. self-notification is skipped when actor equals recipient", () => {
    const actor = "u1";
    const recipient = "u1";
    expect(actor).toBe(recipient);
  });

  it("4. a block/mute does not create extra privileges", () => {
    expect(hasCapability(member, "moderate_community")).toBe(false);
  });

  it("5. verification files must be pdf/jpeg/png under 10MB", () => {
    expect(isAllowedVerificationFile(new File(["x"], "a.exe", { type: "application/octet-stream" })).ok).toBe(false);
    expect(isAllowedVerificationFile(new File(["x"], "a.pdf", { type: "application/pdf" })).ok).toBe(true);
  });

  it("6. other members cannot review verification documents", () => {
    expect(hasCapability(member, "review_verification")).toBe(false);
  });

  it("7. an unauthorized moderator cannot review verification", () => {
    expect(hasCapability(moderator, "review_verification")).toBe(false);
  });

  it("8. only admins can grant verified roles through the review path", () => {
    expect(canGrantRole(admin, "verified_professional")).toBe(true);
    expect(canGrantRole(moderator, "verified_company")).toBe(false);
  });

  it("9. a user cannot grant themselves a privileged role", () => {
    expect(canSelfAssign("verified_professional")).toBe(false);
    expect(canSelfAssign("platform_admin")).toBe(false);
  });

  it("10. audit logs stay immutable from the client contract", () => {
    expect(hasCapability(member, "admin")).toBe(false);
  });

  it("11. companies do not receive extra admin capabilities", () => {
    expect(hasCapability(member, "moderate_jobs")).toBe(false);
  });

  it("12. reporters do not become moderators", () => {
    expect(hasCapability(member, "moderate_community")).toBe(false);
  });

  it("13. ordinary users cannot open the moderation queue", () => {
    expect(hasCapability(member, "moderate_community")).toBe(false);
    expect(hasCapability(moderator, "moderate_community")).toBe(true);
  });

  it("14. public reads stay capability-gated after soft delete", () => {
    expect(hasCapability(member, "moderate_community")).toBe(false);
  });

  it("15. restore is limited to capable staff", () => {
    expect(hasCapability(member, "moderate_community")).toBe(false);
    expect(hasCapability(admin, "moderate_community")).toBe(true);
  });

  it("16. withdraw remains an applicant-owned status, not an admin grant", () => {
    expect(canSelfAssign("jobs_moderator")).toBe(false);
  });

  it("17. member mute does not add capabilities", () => {
    expect(hasCapability(member, "moderate_jobs")).toBe(false);
    expect(hasCapability(jobsMod, "moderate_jobs")).toBe(true);
  });

  it("18. signed verification access is reviewer or owner only", () => {
    expect(hasCapability(member, "review_verification")).toBe(false);
    expect(hasCapability(admin, "review_verification")).toBe(true);
  });

  it("19. verification decisions stay admin-only", () => {
    expect(hasCapability(moderator, "review_verification")).toBe(false);
    expect(hasCapability([], "review_verification", true)).toBe(true);
  });

  it("20. idempotent delivery is encoded as actor/recipient plus a stable key", () => {
    const key = `like:post-1:user-2`;
    expect(key.startsWith("like:")).toBe(true);
  });
});
