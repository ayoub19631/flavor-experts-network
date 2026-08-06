import { describe, expect, it } from "vitest";
import {
  isProfileIncomplete,
  profileCompletionPercent,
} from "./profile-completion";

describe("profileCompletionPercent", () => {
  it("returns 0 for empty profile", () => {
    expect(profileCompletionPercent({})).toBe(0);
  });

  it("scores filled fields", () => {
    const pct = profileCompletionPercent({
      full_name: "A",
      role: "Scientist",
      company: "Lab",
      location: "NY",
      bio: "Bio",
      specialty: "Vanilla",
      cover_url: "https://x",
      skills: ["citrus"],
      linkedin_url: "https://linkedin.com/in/a",
    });
    expect(pct).toBe(100);
  });
});

describe("isProfileIncomplete", () => {
  it("flags incomplete profiles", () => {
    expect(isProfileIncomplete({ full_name: "A" })).toBe(true);
  });
});
