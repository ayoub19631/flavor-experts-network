import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Provider = "google" | "linkedin";

interface OAuthState {
  provider: Provider;
  redirectTo: string;
  intent: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Prefer path-based callback — LinkedIn is strict about redirect URI matching. */
function getCallbackUrl(): string {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("Missing SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/oauth/callback`;
}

/** Legacy query callback kept for apps that still list it in the LinkedIn console. */
function getLegacyCallbackUrl(): string {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("Missing SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/oauth?action=callback`;
}

function getStateSecret(): string {
  const dedicated = Deno.env.get("OAUTH_STATE_SECRET");
  if (dedicated) return dedicated;

  const siteUrl = Deno.env.get("SITE_URL") || "";
  const isProduction = siteUrl.includes("flavorexpertsnetwork.com");
  if (isProduction) {
    throw new Error("OAUTH_STATE_SECRET must be set in production");
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "dev-only-oauth-state-secret";
}

function getSiteUrl(): string {
  return (Deno.env.get("SITE_URL") || "https://flavorexpertsnetwork.com").replace(/\/$/, "");
}

function originOf(urlStr: string): string {
  try {
    return new URL(urlStr).origin;
  } catch {
    return urlStr.replace(/\/$/, "");
  }
}

function getAllowedOrigins(): string[] {
  const siteUrl = getSiteUrl();
  const origin = originOf(siteUrl);
  const www =
    origin.includes("://www.")
      ? origin.replace("://www.", "://")
      : origin.replace("://", "://www.");
  return [
    origin,
    www,
    "https://ayoub19631.github.io",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "http://localhost:3001",
    "http://localhost:5173",
  ];
}

function appUrlScheme(): string {
  return (Deno.env.get("APP_URL_SCHEME") || "flavorexperts").replace(/:$/, "");
}

function isAllowedAuthPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (
    normalized === "/auth/callback" ||
    normalized === "/email-verified" ||
    normalized.endsWith("/auth/callback") ||
    normalized.endsWith("/email-verified")
  );
}

function isAllowedRedirect(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol === `${appUrlScheme()}:`) {
      return url.host === "auth" && url.pathname === "/callback";
    }
    const allowedOrigins = getAllowedOrigins();
    if (!allowedOrigins.includes(url.origin)) return false;
    return isAllowedAuthPath(url.pathname);
  } catch {
    return false;
  }
}

function sanitizeRedirect(urlStr: string | null): string {
  const fallback = `${getSiteUrl()}/auth/callback`;
  if (!urlStr) return fallback;
  return isAllowedRedirect(urlStr) ? urlStr : fallback;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(raw: string): Uint8Array {
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getStateSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sig));
}

async function encodeState(state: OAuthState): Promise<string> {
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...state,
        ts: Date.now(),
      }),
    ),
  );
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

async function decodeState(raw: string | null): Promise<OAuthState | null> {
  if (!raw || !raw.includes(".")) return null;
  try {
    const dot = raw.indexOf(".");
    const payload = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    if (!payload || !sig) return null;
    const expected = await hmacSign(payload);
    if (!timingSafeEqual(expected, sig)) return null;

    const parsed = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as OAuthState & { ts?: number };
    if (!parsed?.provider || !parsed?.redirectTo) return null;
    if (!isAllowedRedirect(parsed.redirectTo)) return null;
    if (parsed.ts && Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function redirectWithError(fallback: string, message: string): Response {
  const base = fallback.startsWith("http") ? fallback : `${getSiteUrl()}/auth`;
  const target = new URL(base);
  target.pathname = "/auth/error";
  target.search = `msg=${encodeURIComponent(message)}`;
  return Response.redirect(target.toString(), 302);
}

function providerConfig(provider: Provider) {
  if (provider === "google") {
    return {
      clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scopes: "openid email profile",
      extraAuthParams: { access_type: "online", prompt: "select_account" } as Record<string, string>,
    };
  }

  return {
    clientId: Deno.env.get("LINKEDIN_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("LINKEDIN_CLIENT_SECRET") ?? "",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    scopes: "openid profile email",
    extraAuthParams: {} as Record<string, string>,
  };
}

async function handleStart(url: URL): Promise<Response> {
  const provider = (url.searchParams.get("provider") ?? "google") as Provider;
  if (provider !== "google" && provider !== "linkedin") {
    return new Response(JSON.stringify({ error: "Unsupported provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const redirectTo = sanitizeRedirect(url.searchParams.get("redirect_to"));
  const intent = url.searchParams.get("intent") ?? "login";
  const config = providerConfig(provider);

  if (!config.clientId || !config.clientSecret) {
    const label = provider === "google" ? "Google" : "LinkedIn";
    return redirectWithError(
      redirectTo,
      `${label} sign-in is not configured yet. Add OAuth credentials in Supabase secrets.`,
    );
  }

  const state = await encodeState({ provider, redirectTo, intent });
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  // Path-based callback (recommended). LinkedIn app must list this exact URI.
  authUrl.searchParams.set("redirect_uri", getCallbackUrl());
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", state);
  for (const [key, value] of Object.entries(config.extraAuthParams)) {
    authUrl.searchParams.set(key, value);
  }

  return Response.redirect(authUrl.toString(), 302);
}

async function exchangeCode(provider: Provider, code: string, redirectUri: string) {
  const config = providerConfig(provider);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokens.error_description || tokens.error || "Token exchange failed");
  }

  const userRes = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await userRes.json();
  if (!userRes.ok) {
    throw new Error(profile.message || profile.error_description || "Failed to load user profile");
  }

  return {
    profile: profile as Record<string, string>,
    idToken: typeof tokens.id_token === "string" ? tokens.id_token : null,
  };
}

type AdminClient = ReturnType<typeof createClient>;
interface AdminUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

async function findUserByEmail(admin: AdminClient, email: string): Promise<AdminUser | null> {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found as AdminUser;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

async function findOrCreateUser(
  admin: AdminClient,
  email: string,
  metadata: Record<string, unknown>,
  provider: string,
) {
  let user = await findUserByEmail(admin, email);

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: metadata,
      app_metadata: { provider, providers: [provider] },
    });

    if (createError) {
      user = await findUserByEmail(admin, email);
      if (!user) throw createError;
    } else {
      user = created.user;
    }
  } else {
    const existingProviders = Array.isArray(user.app_metadata?.providers)
      ? (user.app_metadata.providers as string[])
      : user.app_metadata?.provider
        ? [String(user.app_metadata.provider)]
        : [];
    const providers = [...new Set([...existingProviders, provider])];
    await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { ...user.user_metadata, ...metadata },
      app_metadata: { ...user.app_metadata, provider, providers },
    });
  }

  return user;
}

function resolveCallbackRedirectUri(reqUrl: URL): string {
  // Match the redirect_uri that was used at authorize time.
  if (reqUrl.pathname.endsWith("/callback")) return getCallbackUrl();
  if (reqUrl.searchParams.get("action") === "callback") return getLegacyCallbackUrl();
  // Default to path-based (current authorize URL)
  return getCallbackUrl();
}

async function handleCallback(reqUrl: URL): Promise<Response> {
  const oauthError = reqUrl.searchParams.get("error_description") || reqUrl.searchParams.get("error");
  const state = await decodeState(reqUrl.searchParams.get("state"));
  const fallback = state?.redirectTo ?? `${getSiteUrl()}/auth/callback`;

  if (oauthError) {
    return redirectWithError(fallback, oauthError);
  }

  const code = reqUrl.searchParams.get("code");
  if (!code || !state) {
    return redirectWithError(fallback, "Invalid OAuth callback. Please try again.");
  }

  const redirectUri = resolveCallbackRedirectUri(reqUrl);
  let profile: Record<string, string>;
  try {
    ({ profile } = await exchangeCode(state.provider, code, redirectUri));
  } catch (err) {
    // Retry once with the other callback URI shape (migration between query/path).
    const alt =
      redirectUri === getCallbackUrl() ? getLegacyCallbackUrl() : getCallbackUrl();
    try {
      ({ profile } = await exchangeCode(state.provider, code, alt));
    } catch {
      throw err;
    }
  }

  const email = profile.email;
  if (!email) {
    return redirectWithError(
      fallback,
      "Your LinkedIn/Google account did not return an email address. Enable the email scope and try again.",
    );
  }

  const fullName = profile.name || profile.given_name || email.split("@")[0];
  const avatarUrl = profile.picture || profile.picture_url || "";
  const metadata: Record<string, unknown> = {
    full_name: fullName,
    name: fullName,
    avatar_url: avatarUrl,
    picture: avatarUrl,
  };

  if (state.provider === "linkedin") {
    if (typeof profile.profile === "string" && profile.profile.includes("linkedin.com")) {
      metadata.linkedin_url = profile.profile;
    }
    if (profile.sub) metadata.linkedin_sub = profile.sub;
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  await findOrCreateUser(admin, email, metadata, state.provider);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: state.redirectTo },
  });

  if (linkError || !linkData?.properties) {
    return redirectWithError(fallback, linkError?.message || "Could not complete sign in.");
  }

  const hashed = linkData.properties.hashed_token;
  const actionLink = linkData.properties.action_link;

  // Prefer explicit token_hash handoff to /auth/callback (more reliable than action_link quirks).
  if (hashed) {
    const target = new URL(state.redirectTo);
    target.searchParams.set("token_hash", hashed);
    target.searchParams.set("type", "magiclink");
    target.searchParams.set("oauth_provider", state.provider);
    return Response.redirect(target.toString(), 302);
  }

  if (actionLink) {
    return Response.redirect(actionLink, 302);
  }

  return redirectWithError(fallback, "Could not complete sign in.");
}

function resolveAction(url: URL): "start" | "callback" | "invalid" {
  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/callback") || url.searchParams.get("action") === "callback") {
    return "callback";
  }
  if (url.searchParams.has("code") || url.searchParams.has("error")) {
    return "callback";
  }
  if (url.searchParams.get("action") === "start" || url.searchParams.has("provider")) {
    return "start";
  }
  if (url.searchParams.get("action") === "start") return "start";
  return url.searchParams.has("provider") ? "start" : "invalid";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = resolveAction(url);

  try {
    if (action === "start") return await handleStart(url);
    if (action === "callback") return await handleCallback(url);
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("oauth error", error);
    const message = error instanceof Error ? error.message : "OAuth sign-in failed";
    const state = await decodeState(url.searchParams.get("state"));
    return redirectWithError(state?.redirectTo ?? `${getSiteUrl()}/auth/callback`, message);
  }
});
