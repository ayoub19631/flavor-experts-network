import { describe, expect, it } from "vitest";
import {
  authDocumentTitle,
  isValidEmail,
  isValidHttpUrl,
  validateCompanySignup,
  validateIndividualSignup,
  validatePassword,
} from "./registration";

describe("registration validation", () => {
  it("accepts a complete individual signup", () => {
    expect(
      validateIndividualSignup({
        fullName: "Ayoub Akbik",
        email: "member@example.com",
        password: "securepass",
        country: "United Arab Emirates",
        role: "Flavor Scientist",
        acceptedTerms: true,
        adultConfirmed: true,
      }),
    ).toBeNull();
  });

  it("requires policy and adult confirmation", () => {
    expect(
      validateIndividualSignup({
        fullName: "Ayoub Akbik",
        email: "member@example.com",
        password: "securepass",
        country: "United Arab Emirates",
        role: "Flavor Scientist",
        acceptedTerms: false,
        adultConfirmed: true,
      }),
    ).toBe("agree_required");
    expect(
      validateIndividualSignup({
        fullName: "Ayoub Akbik",
        email: "member@example.com",
        password: "securepass",
        country: "United Arab Emirates",
        role: "Flavor Scientist",
        acceptedTerms: true,
        adultConfirmed: false,
      }),
    ).toBe("adult_required");
  });

  it("validates company website and email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidHttpUrl("ftp://bad.example")).toBe(false);
    expect(validatePassword("short")).toBe("password_min");
    expect(
      validateCompanySignup({
        companyName: "Acme Flavors",
        contactName: "Jane Smith",
        email: "jane@acme.com",
        password: "securepass",
        country: "Germany",
        website: "https://acme.com",
        acceptedTerms: true,
        adultConfirmed: true,
      }),
    ).toBeNull();
  });
});

describe("auth document titles", () => {
  it("uses the required public titles", () => {
    expect(authDocumentTitle("login")).toBe("Sign In");
    expect(authDocumentTitle("signup", "individual")).toBe("Create Account");
    expect(authDocumentTitle("signup", "company")).toBe("Company Registration");
    expect(authDocumentTitle("reset")).toBe("Reset Password");
    expect(authDocumentTitle("new-password")).toBe("Reset Password");
  });
});
