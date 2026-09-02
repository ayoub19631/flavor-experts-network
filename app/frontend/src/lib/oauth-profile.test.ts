import { describe, expect, it } from "vitest";
import { isPlatformStoredAvatar, shouldReplaceAvatar, shouldReplaceFullName } from "./oauth-profile";

describe("oauth profile sync", () => {
  it("protects uploaded platform avatars from Google overwrites", () => {
    const uploaded = "https://imucfofvdwfyexdwrsfe.supabase.co/storage/v1/object/public/platform-uploads/avatars/users/photo.jpg";
    const google = "https://lh3.googleusercontent.com/a/abc=s96-c";
    expect(isPlatformStoredAvatar(uploaded)).toBe(true);
    expect(shouldReplaceAvatar(uploaded, google)).toBe(false);
    expect(shouldReplaceAvatar(google, uploaded)).toBe(true);
    expect(shouldReplaceAvatar("", google)).toBe(true);
  });

  it("does not overwrite an existing display name on later Google logins", () => {
    expect(shouldReplaceFullName("Talal Reyad", "Talal Reyad")).toBe(true);
    expect(shouldReplaceFullName("طلال البوشي", "Talal Reyad")).toBe(false);
    expect(shouldReplaceFullName("", "Talal Reyad")).toBe(true);
  });
});
