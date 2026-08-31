const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export type RegistrationIssue =
  | "required"
  | "email"
  | "password_min"
  | "website"
  | "agree_required"
  | "adult_required"
  | "country"
  | "role";

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return URL_RE.test(trimmed);
}

export function validatePassword(password: string): RegistrationIssue | null {
  if (password.length < 8) return "password_min";
  return null;
}

export function validateIndividualSignup(input: {
  fullName: string;
  email: string;
  password: string;
  country: string;
  role: string;
  acceptedTerms: boolean;
  adultConfirmed: boolean;
}): RegistrationIssue | null {
  if (!input.fullName.trim()) return "required";
  if (!isValidEmail(input.email)) return "email";
  const pw = validatePassword(input.password);
  if (pw) return pw;
  if (!input.country.trim()) return "country";
  if (!input.role.trim()) return "role";
  if (!input.acceptedTerms) return "agree_required";
  if (!input.adultConfirmed) return "adult_required";
  return null;
}

export function validateCompanySignup(input: {
  companyName: string;
  contactName: string;
  email: string;
  password: string;
  country: string;
  website: string;
  acceptedTerms: boolean;
  adultConfirmed: boolean;
}): RegistrationIssue | null {
  if (!input.companyName.trim() || !input.contactName.trim()) return "required";
  if (!isValidEmail(input.email)) return "email";
  const pw = validatePassword(input.password);
  if (pw) return pw;
  if (!input.country.trim()) return "country";
  if (!isValidHttpUrl(input.website)) return "website";
  if (!input.acceptedTerms) return "agree_required";
  if (!input.adultConfirmed) return "adult_required";
  return null;
}

export type AuthDocumentMode = "login" | "signup" | "reset" | "new-password";
export type AuthAccountType = "individual" | "company";

export function authDocumentTitle(
  mode: AuthDocumentMode,
  accountType: AuthAccountType = "individual",
): string {
  if (mode === "reset" || mode === "new-password") return "Reset Password";
  if (mode === "signup" && accountType === "company") return "Company Registration";
  if (mode === "signup") return "Create Account";
  return "Sign In";
}
