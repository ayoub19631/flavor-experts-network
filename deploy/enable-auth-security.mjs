/**
 * Enable Leaked Password Protection + Google/LinkedIn Auth providers.
 *
 * Prerequisites:
 *   1. Create deploy/oauth.env from oauth.env.example
 *   2. Fill SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 *   3. Fill GOOGLE_* and LINKEDIN_* client credentials
 *
 * Usage:
 *   node deploy/enable-auth-security.mjs
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "imucfofvdwfyexdwrsfe";
const SITE_URL = "https://flavorexpertsnetwork.com";
const CALLBACK =
  `https://${PROJECT_REF}.supabase.co/functions/v1/oauth?action=callback`;
const AUTH_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = {
  ...loadEnvFile(join(__dir, "oauth.env")),
  ...process.env,
};

const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("\nMissing SUPABASE_ACCESS_TOKEN in deploy/oauth.env");
  console.error("Create one at: https://supabase.com/dashboard/account/tokens\n");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function patchAuth(payload, label) {
  const res = await fetch(AUTH_URL, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${label} failed (${res.status}): ${text}`);
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
}

console.log("\n🔐 Enabling Leaked Password Protection...\n");
await patchAuth({ password_hibp_enabled: true }, "Leaked Password Protection");

console.log("\n🔗 Updating Site / Redirect URLs...\n");
await patchAuth(
  {
    site_url: SITE_URL,
    uri_allow_list: [
      `${SITE_URL}/**`,
      `${SITE_URL}/auth/callback`,
      "http://localhost:5173/**",
      "http://localhost:5173/auth/callback",
      CALLBACK,
    ].join(","),
  },
  "Auth redirect URLs",
);

const googleId = env.GOOGLE_CLIENT_ID;
const googleSecret = env.GOOGLE_CLIENT_SECRET;
const linkedinId = env.LINKEDIN_CLIENT_ID;
const linkedinSecret = env.LINKEDIN_CLIENT_SECRET;

if (googleId && googleSecret) {
  console.log("\n🟢 Enabling Google provider (Supabase Auth)...\n");
  await patchAuth(
    {
      external_google_enabled: true,
      external_google_client_id: googleId,
      external_google_secret: googleSecret,
    },
    "Google Auth provider",
  );
} else {
  console.warn("⚠️  GOOGLE_CLIENT_ID/SECRET missing — skipped Google Auth provider");
}

if (linkedinId && linkedinSecret) {
  console.log("\n🔵 Enabling LinkedIn OIDC provider (Supabase Auth)...\n");
  const ok = await patchAuth(
    {
      external_linkedin_oidc_enabled: true,
      external_linkedin_oidc_client_id: linkedinId,
      external_linkedin_oidc_secret: linkedinSecret,
    },
    "LinkedIn OIDC Auth provider",
  );
  if (!ok) {
    // Older field names fallback
    await patchAuth(
      {
        external_linkedin_enabled: true,
        external_linkedin_client_id: linkedinId,
        external_linkedin_secret: linkedinSecret,
      },
      "LinkedIn Auth provider (legacy fields)",
    );
  }
} else {
  console.warn("⚠️  LINKEDIN_CLIENT_ID/SECRET missing — skipped LinkedIn provider");
}

if (googleId && googleSecret && linkedinId && linkedinSecret) {
  console.log("\n🚀 Setting Edge Function OAuth secrets...\n");
  try {
    const secretArgs = [
      `GOOGLE_CLIENT_ID=${googleId}`,
      `GOOGLE_CLIENT_SECRET=${googleSecret}`,
      `LINKEDIN_CLIENT_ID=${linkedinId}`,
      `LINKEDIN_CLIENT_SECRET=${linkedinSecret}`,
      `SITE_URL=${SITE_URL}`,
      `OAUTH_STATE_SECRET=${env.OAUTH_STATE_SECRET || crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")}`,
    ].join(" ");
    execSync(
      `npx supabase secrets set ${secretArgs} --project-ref ${PROJECT_REF}`,
      {
        stdio: "inherit",
        shell: true,
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
      },
    );
    console.log("✅ Edge Function secrets set");
  } catch {
    console.error("❌ Failed to set Edge secrets. Ensure token has secrets write access.");
  }
}

console.log("\nDone.");
console.log(`Google/LinkedIn redirect URI must be exactly:\n  ${CALLBACK}\n`);
