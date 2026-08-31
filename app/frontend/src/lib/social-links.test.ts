import { describe, expect, it } from "vitest";
import {
  SOCIAL_LINKS,
  configuredSocialLinks,
  isPublicHttpsUrl,
  resolveSocialHref,
  socialSameAs,
} from "./social-links";

describe("public social URLs", () => {
  it("accepts https links and rejects empty, fake, or unsafe values", () => {
    expect(isPublicHttpsUrl(SOCIAL_LINKS.linkedinGroup)).toBe(true);
    expect(isPublicHttpsUrl("")).toBe(false);
    expect(isPublicHttpsUrl("https://example.com")).toBe(true);
    expect(isPublicHttpsUrl("http://instagram.com/flavor")).toBe(false);
    expect(isPublicHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isPublicHttpsUrl("not-a-url")).toBe(false);
  });

  it("only accepts matching hosts for each network", () => {
    expect(resolveSocialHref("instagram", "https://www.instagram.com/flavor")).toBe(
      "https://www.instagram.com/flavor",
    );
    expect(resolveSocialHref("instagram", "https://example.com/flavor")).toBe("");
    expect(resolveSocialHref("youtube", "https://youtu.be/abc")).toBe("https://youtu.be/abc");
    expect(resolveSocialHref("facebook", "")).toBe("");
    expect(resolveSocialHref("website", "https://www.flavorexpertsnetwork.com/")).toBe(
      "https://www.flavorexpertsnetwork.com/",
    );
    expect(resolveSocialHref("website", "https://evil.example/admin")).toBe("");
  });

  it("exposes the official Flavor Experts Network profiles", () => {
    const links = configuredSocialLinks();
    const byId = Object.fromEntries(links.map((link) => [link.id, link.href]));
    expect(byId.instagram).toBe(SOCIAL_LINKS.instagram);
    expect(byId.facebook).toBe(SOCIAL_LINKS.facebook);
    expect(byId.youtube).toBe(SOCIAL_LINKS.youtube);
    expect(byId.linkedinPage).toBe(SOCIAL_LINKS.linkedinPage);
    expect(byId.linkedinGroup).toBe(SOCIAL_LINKS.linkedinGroup);
    expect(byId.website).toBe(SOCIAL_LINKS.website);
  });

  it("lists official profiles for JSON-LD without admin paths", () => {
    const sameAs = socialSameAs();
    expect(sameAs).toEqual(Object.values(SOCIAL_LINKS));
    expect(sameAs.some((href) => /\/admin(?:\/|$)/i.test(href))).toBe(false);
  });
});
