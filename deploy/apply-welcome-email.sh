#!/usr/bin/env bash
# Apply welcome+policy email migration and deploy send-email.
# Requires: SUPABASE_ACCESS_TOKEN
# Optional: SUPABASE_DB_PASSWORD
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-imucfofvdwfyexdwrsfe}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is required."
  echo "Create one at https://supabase.com/dashboard/account/tokens"
  exit 1
fi

npx --yes supabase@latest --version

if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  npx --yes supabase@latest link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
else
  npx --yes supabase@latest link --project-ref "$PROJECT_REF"
fi

echo "==> Applying welcome email migration"
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  npx --yes supabase@latest db push --include-all --yes
else
  npx --yes supabase@latest db query --linked \
    -f supabase/migrations/20260803120000_welcome_email_platform_policy.sql
fi

echo "==> Deploying send-email function"
npx --yes supabase@latest functions deploy send-email \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "==> Verifying function definition contains policy copy"
npx --yes supabase@latest db query --linked \
  "select pg_get_functiondef('public.notify_welcome_email()'::regprocedure) ilike '%سياسة المنصة%' as has_ar_policy, pg_get_functiondef('public.notify_welcome_email()'::regprocedure) ilike '%Platform policy summary%' as has_en_policy;"

echo "Done. New accounts will receive the bilingual welcome + platform policy email."
