/**
 * Fix RLS policies for Flavor Experts Network
 * Run: node fix-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// Load env
const lines = readFileSync(join(__dir, ".env"), "utf-8").split("\n");
const env = {};
for (const l of lines) {
  const i = l.indexOf("=");
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonSb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── SQL fixes to run via Supabase REST ─────────────────────────────────────
const SQL_FIXES = [
  // contact_messages: allow anyone to INSERT (contact form)
  `DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages`,
  `CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true)`,

  // enterprise_requests: allow anyone to INSERT (enterprise signup form)
  `DROP POLICY IF EXISTS "Anyone can submit enterprise requests" ON public.enterprise_requests`,
  `CREATE POLICY "Anyone can submit enterprise requests" ON public.enterprise_requests FOR INSERT TO anon, authenticated WITH CHECK (true)`,

  // industry_news: allow reading published news
  `DROP POLICY IF EXISTS "Anyone can read published news" ON public.industry_news`,
  `CREATE POLICY "Anyone can read published news" ON public.industry_news FOR SELECT TO anon, authenticated USING (is_published = true)`,

  // educational_resources: allow reading published resources
  `DROP POLICY IF EXISTS "Anyone can read published resources" ON public.educational_resources`,
  `CREATE POLICY "Anyone can read published resources" ON public.educational_resources FOR SELECT TO anon, authenticated USING (is_published = true)`,

  // members: allow reading all members
  `DROP POLICY IF EXISTS "Anyone can read members" ON public.members`,
  `CREATE POLICY "Anyone can read members" ON public.members FOR SELECT TO anon, authenticated USING (true)`,

  // user_profiles: users can manage their own profile
  `DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles`,
  `CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id)`,
  `DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles`,
  `CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`,
  `DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles`,
  `CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)`,

  // Admins: full access to all tables
  `DROP POLICY IF EXISTS "Admins full user_profiles" ON public.user_profiles`,
  `CREATE POLICY "Admins full user_profiles" ON public.user_profiles FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())`,
  `DROP POLICY IF EXISTS "Admins full contact_messages" ON public.contact_messages`,
  `CREATE POLICY "Admins full contact_messages" ON public.contact_messages FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())`,
  `DROP POLICY IF EXISTS "Admins full enterprise_requests" ON public.enterprise_requests`,
  `CREATE POLICY "Admins full enterprise_requests" ON public.enterprise_requests FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())`,
  `DROP POLICY IF EXISTS "Admins full industry_news" ON public.industry_news`,
  `CREATE POLICY "Admins full industry_news" ON public.industry_news FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())`,
  `DROP POLICY IF EXISTS "Admins full educational_resources" ON public.educational_resources`,
  `CREATE POLICY "Admins full educational_resources" ON public.educational_resources FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())`,
  `DROP POLICY IF EXISTS "Admins full members" ON public.members`,
  `CREATE POLICY "Admins full members" ON public.members FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())`,
];

async function runSQL(sql) {
  // Supabase exposes a SQL endpoint via the management API
  // We use the REST API with service_role to execute raw SQL
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  // Fallback: try via a custom RPC if available
  const { error } = await sb.rpc("exec_sql", { sql }).catch(() => ({ error: { message: "rpc not available" } }));
  if (!error) return { ok: true };
  
  // Try direct postgres query via management API
  const projectRef = env.VITE_SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  
  try {
    const resp = await fetch(mgmtUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (resp.ok) return { ok: true };
    return { ok: false, error: await resp.text() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log("\n  ══════════════════════════════════════════════════");
  console.log("    Flavor Experts Network — RLS Policy Fix");
  console.log("  ══════════════════════════════════════════════════\n");

  // First, verify the critical issue exists
  console.log("  Testing current state...");
  const { error: beforeErr } = await anonSb.from("contact_messages").insert({
    name: "Test", email: "test@test.com", message: "RLS test", status: "new",
  });
  
  if (!beforeErr) {
    // Clean up test insert
    await sb.from("contact_messages").delete().eq("email", "test@test.com").eq("name", "Test");
    console.log("  ✅ contact_messages INSERT already works");
  } else {
    console.log("  ❌ contact_messages INSERT blocked:", beforeErr.message.slice(0, 60));
    console.log("  → Need to apply SQL fix in Supabase\n");
  }

  // Try to apply fixes
  let applied = 0;
  let manual = 0;
  
  for (const sql of SQL_FIXES) {
    const { ok } = await runSQL(sql);
    if (ok) applied++;
    else manual++;
  }

  if (manual > 0) {
    console.log(`\n  ⚠️  ${manual} SQL statements need manual application.`);
    console.log("  Please run the MASTER-SETUP.sql in Supabase SQL Editor:");
    console.log("  → https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/sql\n");
    
    // Generate a targeted fix SQL
    const fixSQL = SQL_FIXES.join(";\n\n") + ";";
    const { writeFileSync } = await import("fs");
    writeFileSync(join(__dir, "fix-rls-manual.sql"), fixSQL);
    console.log("  📄 Fix SQL written to: fix-rls-manual.sql");
  } else {
    console.log(`  ✅ All ${applied} policies applied successfully!`);
  }

  // Verify after
  console.log("\n  Verifying fix...");
  const { error: afterErr } = await anonSb.from("contact_messages").insert({
    name: "Test", email: "test@test.com", message: "RLS test", status: "new",
  });
  
  if (!afterErr) {
    await sb.from("contact_messages").delete().eq("email", "test@test.com");
    console.log("  ✅ contact_messages INSERT: FIXED!");
  } else {
    console.log("  ⚠️  Still blocked — manual SQL fix required");
    console.log("  Run fix-rls-manual.sql in Supabase SQL Editor");
  }

  console.log("\n  ══════════════════════════════════════════════════\n");
}

main().catch(console.error);
