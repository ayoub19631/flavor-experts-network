import { supabase } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/auth-utils";

export type OAuthProvider = "google" | "linkedin_oidc";

export type OAuthIntent = "login" | "signup" | "company";

const OAUTH_INTENT_KEY = "fen-oauth-intent";

export function setOAuthIntent(intent: OAuthIntent) {
  localStorage.setItem(OAUTH_INTENT_KEY, intent);
}

export function consumeOAuthIntent(): OAuthIntent {
  const value = localStorage.getItem(OAUTH_INTENT_KEY);
  localStorage.removeItem(OAUTH_INTENT_KEY);
  if (value === "company" || value === "signup" || value === "login") return value;
  return "login";
}

export function isOAuthConfiguredError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("provider") ||
    m.includes("not enabled") ||
    m.includes("not supported") ||
    m.includes("not configured") ||
    m.includes("validation failed") ||
    m.includes("oauth")
  );
}

export async function signInWithOAuthProvider(
  provider: OAuthProvider,
  intent: OAuthIntent = "login",
) {
  setOAuthIntent(intent);

  const redirectTo = getAuthRedirectUrl("/auth/callback");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  if (!supabaseUrl) {
    return {
      data: { provider, url: null },
      error: { message: "Supabase URL is not configured", name: "AuthError", status: 500 },
    };
  }

  const startUrl = new URL(`${supabaseUrl}/functions/v1/oauth`);
  startUrl.searchParams.set("action", "start");
  startUrl.searchParams.set("provider", provider === "linkedin_oidc" ? "linkedin" : provider);
  startUrl.searchParams.set("redirect_to", redirectTo);
  startUrl.searchParams.set("intent", intent);

  window.location.assign(startUrl.toString());
  return { data: { provider, url: startUrl.toString() }, error: null };
}

export async function syncOAuthUserProfile(userId: string, metadata: Record<string, unknown>, email?: string | null) {
  const fullName =
    (metadata.full_name as string) ||
    (metadata.name as string) ||
    email?.split("@")[0] ||
    "User";
  const avatarUrl =
    (metadata.avatar_url as string) ||
    (metadata.picture as string) ||
    "";
  const linkedinUrl = (metadata.linkedin_url as string) || (metadata.profile as string) || "";

  const updates: Record<string, string> = {
    full_name: fullName,
    updated_at: new Date().toISOString(),
  };
  if (avatarUrl) updates.avatar_url = avatarUrl;
  if (linkedinUrl && linkedinUrl.includes("linkedin.com")) updates.linkedin_url = linkedinUrl;

  await supabase.from("user_profiles").update(updates).eq("id", userId);
}

export function getOAuthProviderLabel(provider: string | undefined): string {
  if (provider === "google") return "Google";
  if (provider === "linkedin_oidc" || provider === "linkedin") return "LinkedIn";
  return provider || "Social";
}
