/**
 * Configure Google + LinkedIn OAuth for Flavor Experts Network
 *
 * Usage:
 *   1. Copy deploy/oauth.env.example → deploy/oauth.env
 *   2. Fill in credentials
 *   3. node deploy/configure-oauth.mjs
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "imucfofvdwfyexdwrsfe";
const SITE_URL = "https://flavorexpertsnetwork.com";

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

const oauthEnv = {
  ...loadEnvFile(join(__dir, "oauth.env")),
  ...process.env,
};

const required = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
];

const missing = required.filter((key) => !oauthEnv[key]);
if (missing.length) {
  console.error("\n❌ Missing OAuth credentials:");
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error("\nCreate deploy/oauth.env from deploy/oauth.env.example and fill in values.\n");
  process.exit(1);
}

console.log("\n🔐 Setting Supabase Edge Function secrets...\n");

const secretArgs = [
  `GOOGLE_CLIENT_ID=${oauthEnv.GOOGLE_CLIENT_ID}`,
  `GOOGLE_CLIENT_SECRET=${oauthEnv.GOOGLE_CLIENT_SECRET}`,
  `LINKEDIN_CLIENT_ID=${oauthEnv.LINKEDIN_CLIENT_ID}`,
  `LINKEDIN_CLIENT_SECRET=${oauthEnv.LINKEDIN_CLIENT_SECRET}`,
  `SITE_URL=${SITE_URL}`,
].join(" ");

try {
  execSync(`npx supabase secrets set ${secretArgs} --project-ref ${PROJECT_REF}`, {
    stdio: "inherit",
    shell: true,
  });
} catch {
  console.error("\n❌ Failed to set secrets. Run: npx supabase login\n");
  process.exit(1);
}

if (oauthEnv.SUPABASE_ACCESS_TOKEN) {
  console.log("\n⚙️  Updating Supabase Auth redirect URLs...\n");
  const payload = {
    site_url: SITE_URL,
    uri_allow_list: `${SITE_URL}/**,http://localhost:5173/**,http://localhost:3000/**`,
  };

  fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${oauthEnv.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.warn(`⚠️  Could not update redirect URLs (${res.status}): ${text}`);
      } else {
        console.log("✅ Redirect URLs updated");
      }
    })
    .catch((err) => console.warn(`⚠️  Redirect URL update failed: ${err.message}`));
} else {
  console.log("\nℹ️  Optional: add SUPABASE_ACCESS_TOKEN to deploy/oauth.env to auto-update redirect URLs.");
}

console.log("\n✅ OAuth secrets configured.");
console.log("\nNext steps:");
console.log("  1. Deploy edge function: npx supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe");
console.log("  2. Google redirect URI:  https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback");
console.log("  3. LinkedIn redirect URI: https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback");
console.log("  4. Test at: https://flavorexpertsnetwork.com/auth\n");
