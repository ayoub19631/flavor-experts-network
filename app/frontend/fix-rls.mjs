/**
 * DEPRECATED — do not run against production.
 *
 * This script previously recreated overly permissive RLS policies
 * (e.g. open SELECT on members including emails). Schema security is
 * owned exclusively by versioned files in supabase/migrations/.
 *
 * Apply updates with:
 *   SUPABASE_ACCESS_TOKEN=... bash deploy/apply-platform-updates.sh
 * or:
 *   npx supabase db push
 */
console.error(
  "[fix-rls.mjs] Disabled. Use supabase/migrations + deploy/apply-platform-updates.sh instead.",
);
process.exit(1);
