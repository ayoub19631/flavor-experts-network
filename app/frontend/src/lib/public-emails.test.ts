import { describe, expect, it } from "vitest";
import { emailIsConfigured } from "./public-emails";

describe("public email configuration", () => {
  it("does not treat empty values as configured", () => {
    expect(emailIsConfigured("")).toBe(false);
    expect(emailIsConfigured(undefined)).toBe(false);
    expect(emailIsConfigured("support@flavorexpertsnetwork.com")).toBe(true);
  });

  it("rejects retired public addresses", () => {
    expect(emailIsConfigured("ayoub@flavorexperts.net")).toBe(false);
    expect(emailIsConfigured("info@nexusflavor.com")).toBe(false);
  });
});
