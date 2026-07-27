import { describe, expect, it } from "vitest";
import {
  getPlatformAccessAllowlist,
  isEmailOnPlatformAllowlist,
  isPlatformAuthExemptPath,
  isPlatformPrivateMode,
  resolvePlatformAccess,
} from "@/lib/platform-access";
import type { UserProfile } from "@/lib/types";

describe("platform access", () => {
  it("treats auth callback paths as exempt", () => {
    expect(isPlatformAuthExemptPath("/auth")).toBe(true);
    expect(isPlatformAuthExemptPath("/auth/callback")).toBe(true);
    expect(isPlatformAuthExemptPath("/")).toBe(false);
  });

  it("resolvePlatformAccess respects private mode flag", () => {
    if (isPlatformPrivateMode()) {
      expect(resolvePlatformAccess(null, null)).toBe(false);
    } else {
      expect(resolvePlatformAccess(null, null)).toBe(true);
    }
  });

  it("includes configured admin email in allowlist helpers", () => {
    const allowlist = getPlatformAccessAllowlist();
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();
    if (adminEmail) {
      expect(allowlist).toContain(adminEmail);
      expect(isEmailOnPlatformAllowlist(adminEmail)).toBe(true);
    }
  });

  it("grants access to admins and preview users when private mode is enabled", () => {
    const profile = {
      id: "1",
      email: "member@example.com",
      full_name: "Member",
      avatar_url: "",
      subscription_tier: "free",
      subscription_active: true,
      is_admin: false,
      platform_preview_access: true,
      created_at: new Date().toISOString(),
    } satisfies UserProfile;

    expect(
      resolvePlatformAccess({ id: "1", email: profile.email } as never, profile)
    ).toBe(true);
  });
});
