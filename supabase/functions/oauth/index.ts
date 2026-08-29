import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Provider = "google" | "linkedin";

interface OAuthState {
  provider: Provider;
  redirectTo: string;
  intent: string;
  linkedinMode?: "oidc" | "legacy";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getQueryCallbackUrl(): string {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("Missing SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/oauth?action=callback`;
}

function getPathCallbackUrl(): string {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) throw new Error("Missing SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/oauth/callback`;
}

/** Use the URI registered in the LinkedIn/Google console. Query form is the live default. */
function getCallbackUrl(provider?: Provider): string {
  if (provider === "linkedin") {
    const linkedin = Deno.env.get("LINKEDIN_REDIRECT_URI");
    if (linkedin) return linkedin;
  }
  const configured = Deno.env.get("OAUTH_REDIRECT_URI");
  if (configured) return configured;
  return getQueryCallbackUrl();
}

function getStateSecret(): string {
  const dedicated = Deno.env.get("OAUTH_STATE_SECRET");
  if (dedicated) return dedicated;
  const siteUrl = Deno.env.get("SITE_URL") || "";
  if (siteUrl.includes("flavorexpertsnetwork.com")) {
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
  const origin = originOf(getSiteUrl());
  const www = origin.includes("://www.")
    ? origin.replace("://www.", "://")
    : origin.replace("://", "://www.");
  return [
    origin,
    www,
    "https://flavorexpertsnetwork.com",
    "https://www.flavorexpertsnetwork.com",
    "https://ayoub19631.github.io",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
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
    return getAllowedOrigins().includes(url.origin) && isAllowedAuthPath(url.pathname);
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
    new TextEncoder().encode(JSON.stringify({ ...state, ts: Date.now() })),
  );
  return `${payload}.${await hmacSign(payload)}`;
}

async function decodeState(raw: string | null): Promise<OAuthState | null> {
  if (!raw || !raw.includes(".")) return null;
  try {
    const dot = raw.indexOf(".");
    const payload = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    if (!payload || !sig) return null;
    if (!timingSafeEqual(await hmacSign(payload), sig)) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as OAuthState & {
      ts?: number;
    };
    if (!parsed?.provider || !parsed?.redirectTo) return null;
    if (!isAllowedRedirect(parsed.redirectTo)) return null;
    if (parsed.ts && Date.now() - parsed.ts > 15 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function friendlyOAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("unauthorized_scope") || m.includes("openid") || m.includes("not authorized for your application")) {
    return "LINKEDIN_SCOPE";
  }
  if (m.includes("redirect_uri")) {
    return "OAUTH_REDIRECT";
  }
  if (m.includes("did not return an email") || m.includes("did not share an email")) {
    return "LINKEDIN_EMAIL";
  }
  if (m.includes("invalid oauth callback") || m.includes("could not complete")) {
    return "OAUTH_CALLBACK";
  }
  return message;
}

function redirectWithError(fallback: string, message: string): Response {
  const base = fallback.startsWith("http") ? fallback : `${getSiteUrl()}/auth`;
  const target = new URL(base);
  target.pathname = "/auth/error";
  target.search = `msg=${encodeURIComponent(friendlyOAuthError(message))}`;
  return Response.redirect(target.toString(), 302);
}

function linkedinScopes(mode: "oidc" | "legacy" = "oidc"): string {
  if (mode === "legacy") return "r_liteprofile r_emailaddress";
  return (Deno.env.get("LINKEDIN_SCOPES") || "").trim() || "openid profile email";
}

function usesLinkedInOidc(scopes: string): boolean {
  return scopes.split(/\s+/).includes("openid");
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
    scopes: linkedinScopes("oidc"),
    extraAuthParams: {} as Record<string, string>,
  };
}

async function handleStart(url: URL, forced?: Partial<OAuthState>): Promise<Response> {
  const provider = (forced?.provider || url.searchParams.get("provider") || "google") as Provider;
  if (provider === "linkedin") {
    const redirectTo = sanitizeRedirect(forced?.redirectTo || url.searchParams.get("redirect_to"));
    return redirectWithError(
      redirectTo,
      "LinkedIn sign-in is temporarily disabled. Use Google or email.",
    );
  }
  if (provider !== "google") {
    return new Response(JSON.stringify({ error: "Unsupported provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const redirectTo = sanitizeRedirect(forced?.redirectTo || url.searchParams.get("redirect_to"));
  const intent = forced?.intent || url.searchParams.get("intent") || "login";
  const linkedinMode = (forced?.linkedinMode ||
    (url.searchParams.get("linkedin_mode") === "legacy" ? "legacy" : "oidc")) as "oidc" | "legacy";
  const config = providerConfig(provider);
  if (provider === "linkedin") config.scopes = linkedinScopes(linkedinMode);

  if (!config.clientId || !config.clientSecret) {
    const label = provider === "google" ? "Google" : "LinkedIn";
    return redirectWithError(
      redirectTo,
      `${label} sign-in is not configured yet. Add OAuth credentials in Supabase secrets.`,
    );
  }

  const state = await encodeState({ provider, redirectTo, intent, linkedinMode });
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", getCallbackUrl(provider));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", state);
  for (const [key, value] of Object.entries(config.extraAuthParams)) {
    authUrl.searchParams.set(key, value);
  }
  return Response.redirect(authUrl.toString(), 302);
}

function decodeJwtPayload(token: string | undefined): Record<string, string> {
  if (!token || token.split(".").length < 2) return {};
  try {
    const payload = token.split(".")[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    return JSON.parse(atob(padded + pad)) as Record<string, string>;
  } catch {
    return {};
  }
}

function pictureFrom(profile: Record<string, unknown>): string {
  const picture = profile.picture;
  if (typeof picture === "string") return picture;
  if (picture && typeof picture === "object" && "url" in picture) {
    return String((picture as { url?: string }).url || "");
  }
  return String(profile.picture_url || "");
}

function linkedinLegacyPicture(me: Record<string, unknown>): string {
  const picture = me.profilePicture as
    | { "displayImage~"?: { elements?: Array<{ identifiers?: Array<{ identifier?: string }> }> } }
    | undefined;
  const elements = picture?.["displayImage~"]?.elements || [];
  const last = elements[elements.length - 1];
  return last?.identifiers?.[0]?.identifier || "";
}

async function fetchLinkedInLegacyProfile(accessToken: string): Promise<Record<string, unknown>> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
  };
  const meRes = await fetch(
    "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))",
    { headers },
  );
  const me = (await meRes.json()) as Record<string, unknown>;
  if (!meRes.ok) {
    throw new Error(String(me.message || me.error_description || "Failed to load LinkedIn profile"));
  }

  const emailRes = await fetch(
    "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
    { headers },
  );
  const emailJson = (await emailRes.json()) as {
    elements?: Array<{ "handle~"?: { emailAddress?: string } }>;
  };
  const email = emailJson?.elements?.[0]?.["handle~"]?.emailAddress || "";
  const first = String(me.localizedFirstName || "");
  const last = String(me.localizedLastName || "");
  return {
    email,
    name: `${first} ${last}`.trim(),
    given_name: first,
    family_name: last,
    picture: linkedinLegacyPicture(me),
    sub: me.id,
  };
}

async function exchangeCode(
  provider: Provider,
  code: string,
  redirectUri: string,
  linkedinMode: "oidc" | "legacy" = "oidc",
) {
  const config = providerConfig(provider);
  if (provider === "linkedin") config.scopes = linkedinScopes(linkedinMode);
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

  const fromIdToken = decodeJwtPayload(tokens.id_token);
  let profile: Record<string, unknown> = { ...fromIdToken };

  if (provider === "linkedin" && !usesLinkedInOidc(config.scopes) && tokens.access_token) {
    try {
      const legacy = await fetchLinkedInLegacyProfile(tokens.access_token);
      profile = { ...profile, ...legacy };
    } catch (legacyErr) {
      const userRes = await fetch(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userRes.ok) profile = { ...profile, ...(await userRes.json()) };
      else throw legacyErr;
    }
  } else if (tokens.access_token) {
    const userRes = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userRes.ok) profile = { ...profile, ...(await userRes.json()) };
    if (provider === "linkedin" && !profile.email && tokens.access_token) {
      try {
        const legacy = await fetchLinkedInLegacyProfile(tokens.access_token);
        profile = { ...legacy, ...profile, email: profile.email || legacy.email };
      } catch {
        /* keep OIDC profile */
      }
    }
  }

  if (!profile.email && fromIdToken.email) profile.email = fromIdToken.email;
  if (!profile.email) {
    throw new Error("Your LinkedIn/Google account did not return an email address.");
  }
  return profile;
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

function resolveCallbackRedirectUri(reqUrl: URL, provider: Provider): string {
  if (reqUrl.pathname.replace(/\/+$/, "").endsWith("/callback")) return getPathCallbackUrl();
  if (reqUrl.searchParams.get("action") === "callback") return getQueryCallbackUrl();
  return getCallbackUrl(provider);
}

async function handleCallback(reqUrl: URL): Promise<Response> {
  const oauthError = reqUrl.searchParams.get("error_description") || reqUrl.searchParams.get("error");
  const state = await decodeState(reqUrl.searchParams.get("state"));
  const fallback = state?.redirectTo ?? `${getSiteUrl()}/auth/callback`;
  if (state?.provider === "linkedin") {
    return redirectWithError(fallback, "LinkedIn sign-in is temporarily disabled. Use Google or email.");
  }

  if (oauthError) {
    const scopeDenied = /unauthorized_scope|not authorized for your application/i.test(oauthError);
    if (state?.provider === "linkedin" && scopeDenied && state.linkedinMode !== "legacy") {
      const retry = new URL(reqUrl.toString());
      retry.search = "";
      retry.searchParams.set("action", "start");
      retry.searchParams.set("provider", "linkedin");
      retry.searchParams.set("redirect_to", state.redirectTo);
      retry.searchParams.set("intent", state.intent || "login");
      return handleStart(retry, { ...state, linkedinMode: "legacy" });
    }
    return redirectWithError(fallback, oauthError);
  }

  const code = reqUrl.searchParams.get("code");
  if (!code || !state) {
    return redirectWithError(fallback, "Invalid OAuth callback. Please try again.");
  }

  const redirectUri = resolveCallbackRedirectUri(reqUrl, state.provider);
  const candidates = [...new Set([redirectUri, getCallbackUrl(state.provider), getQueryCallbackUrl(), getPathCallbackUrl()])];
  let profile: Record<string, unknown> | null = null;
  let lastError: Error | null = null;
  for (const uri of candidates) {
    try {
      profile = await exchangeCode(state.provider, code, uri, state.linkedinMode || "oidc");
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  if (!profile) throw lastError || new Error("Token exchange failed");

  const email = String(profile.email || "").trim().toLowerCase();
  if (!email) {
    return redirectWithError(fallback, "Your account did not return an email address.");
  }

  const fullName = String(profile.name || profile.given_name || email.split("@")[0]);
  const avatarUrl = pictureFrom(profile);
  const metadata: Record<string, unknown> = {
    full_name: fullName,
    name: fullName,
    avatar_url: avatarUrl,
    picture: avatarUrl,
    account_type: state.intent === "company" ? "company" : "individual",
  };
  if (state.provider === "linkedin") {
    const profileUrl = String(profile.profile || profile.vanityName || "");
    if (profileUrl.includes("linkedin.com")) metadata.linkedin_url = profileUrl;
    if (profile.sub) metadata.linkedin_sub = profile.sub;
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const user = await findOrCreateUser(admin, email, metadata, state.provider);

  if (state.intent === "company") {
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({ account_type: "company", updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profileError) console.error("company profile update", profileError);
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: state.redirectTo },
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    return redirectWithError(fallback, linkError?.message || "Could not complete sign in.");
  }

  const finish = new URL(state.redirectTo);
  finish.searchParams.set("oauth_provider", state.provider);
  if (state.intent) finish.searchParams.set("intent", state.intent);

  try {
    const { data: verified } = await admin.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
    });
    const session = verified?.session;
    if (session?.access_token && session.refresh_token) {
      finish.hash = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: String(session.expires_in ?? 3600),
        token_type: "bearer",
        type: "magiclink",
      }).toString();
      return Response.redirect(finish.toString(), 302);
    }
  } catch (err) {
    console.warn("oauth verifyOtp handoff skipped", err);
  }

  finish.searchParams.set("token_hash", hashedToken);
  finish.searchParams.set("type", "magiclink");
  return Response.redirect(finish.toString(), 302);
}

function resolveAction(url: URL): "start" | "callback" | "invalid" {
  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/callback") || url.searchParams.get("action") === "callback") return "callback";
  if (url.searchParams.has("code") || url.searchParams.has("error")) return "callback";
  if (url.searchParams.get("action") === "start" || url.searchParams.has("provider")) return "start";
  return "invalid";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
