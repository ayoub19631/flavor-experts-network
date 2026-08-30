/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║       Flavor Experts Network — Admin Account Creator         ║
 * ║       إنشاء حساب المدير — شبكة خبراء النكهات                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:  node create-admin.mjs
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in your .env file
 *   → Get it from: https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/settings/api
 *   → Copy "service_role" key (not anon key) and add to .env
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
function loadEnv() {
  const envPath = join(__dir, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL        = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL         = process.env.ADMIN_EMAIL    || "Ayobe895@gmail.com";
const ADMIN_PASSWORD      = process.env.ADMIN_PASSWORD;
const ADMIN_FULL_NAME     = process.env.ADMIN_FULL_NAME || "Ayoub Akbik";
const ADMIN_ROLE_TITLE    = "Platform Administrator";
const ADMIN_COMPANY       = "Flavor Experts Network";

// ── Validation ────────────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const RED    = "\x1b[31m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";

function log(color, msg)  { console.log(`${color}${msg}${RESET}`); }
function ok(msg)          { log(GREEN,  `  ✅ ${msg}`); }
function warn(msg)        { log(YELLOW, `  ⚠️  ${msg}`); }
function err(msg)         { log(RED,    `  ❌ ${msg}`); }
function info(msg)        { log(CYAN,   `  ℹ️  ${msg}`); }

if (!SUPABASE_URL) {
  err("Missing VITE_SUPABASE_URL in .env");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.log("");
  log(RED + BOLD, "  Missing SUPABASE_SERVICE_ROLE_KEY");
  console.log("");
  info("To get your service role key:");
  info("1. Go to: https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/settings/api");
  info("2. Copy the 'service_role' key (NOT the anon key)");
  info("3. Add to your .env file:");
  console.log("");
  log(YELLOW, "     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
  console.log("");
  info("4. Then run: node create-admin.mjs");
  console.log("");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  err("Missing ADMIN_PASSWORD in .env");
  info("Add to .env: ADMIN_PASSWORD=YourSecurePassword123!");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  err("ADMIN_PASSWORD must be at least 8 characters");
  process.exit(1);
}

// ── Supabase Admin Client ─────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("");
  log(BOLD + CYAN, "  ══════════════════════════════════════════════");
  log(BOLD + CYAN, "    Flavor Experts Network — Admin Setup");
  log(BOLD + CYAN, "  ══════════════════════════════════════════════");
  console.log("");
  info(`Email:   ${ADMIN_EMAIL}`);
  info(`Name:    ${ADMIN_FULL_NAME}`);
  info(`Role:    ${ADMIN_ROLE_TITLE}`);
  console.log("");

  let userId;

  // Step 1: Check if user already exists
  info("Checking if user already exists...");
  const { data: existingList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listErr) {
    err(`Cannot list users: ${listErr.message}`);
    process.exit(1);
  }

  const existing = existingList?.users?.find(
    (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  if (existing) {
    warn("User already exists in Auth — updating admin role only.");
    userId = existing.id;

    // Update password if the user wants to reset it
    const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (pwErr) warn(`Could not update password: ${pwErr.message}`);
    else ok("Password updated");
  } else {
    // Step 2: Create user via Admin API (email auto-confirmed — no verification email needed)
    info("Creating auth user (email pre-verified)...");
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,           // ← skips email verification
      user_metadata: {
        full_name: ADMIN_FULL_NAME,
        role: ADMIN_ROLE_TITLE,
      },
    });

    if (authErr) {
      err(`Auth creation failed: ${authErr.message}`);
      process.exit(1);
    }

    userId = authData.user.id;
    ok(`Auth user created (id: ${userId})`);
  }

  // Step 3: Wait for the auto-trigger to create the profile row
  info("Waiting for database trigger...");
  await new Promise((r) => setTimeout(r, 2000));

  // Step 4: Upsert the full admin profile
  info("Setting up admin profile...");
  const { error: profileErr } = await supabase.from("user_profiles").upsert(
    {
      id: userId,
      email: ADMIN_EMAIL,
      full_name: ADMIN_FULL_NAME,
      subscription_tier: "enterprise",
      subscription_active: true,
      is_admin: true,
      is_verified: true,
      is_active: true,
      role: ADMIN_ROLE_TITLE,
      company: ADMIN_COMPANY,
      account_type: "individual",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileErr) {
    err(`Profile setup failed: ${profileErr.message}`);
    process.exit(1);
  }
  ok("Admin profile configured (enterprise tier + verified)");

  // Step 5: Verify
  info("Verifying admin status...");
  const { data: profile, error: verifyErr } = await supabase
    .from("user_profiles")
    .select("email, full_name, is_admin, subscription_tier, is_verified")
    .eq("id", userId)
    .single();

  if (verifyErr || !profile?.is_admin) {
    err("Verification failed — apply supabase/migrations/ then retry.");
  } else {
    console.log("");
    log(BOLD + GREEN, "  ══════════════════════════════════════════════");
    log(BOLD + GREEN, "    ✅  Admin Account Ready!");
    log(BOLD + GREEN, "  ══════════════════════════════════════════════");
    console.log("");
    ok(`Email:        ${profile.email}`);
    ok(`Name:         ${profile.full_name}`);
    ok(`Admin:        ${profile.is_admin ? "YES ✅" : "NO ❌"}`);
    ok(`Tier:         ${profile.subscription_tier}`);
    ok(`Verified:     ${profile.is_verified ? "YES ✅" : "NO ❌"}`);
    console.log("");
    info(`Login at: http://localhost:3003/auth`);
    info(`Admin panel: http://localhost:3003/admin`);
    console.log("");
  }
}

main().catch((e) => {
  err(`Unexpected error: ${e.message}`);
  process.exit(1);
});
