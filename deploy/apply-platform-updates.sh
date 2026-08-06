#!/usr/bin/env bash
# Apply free-platform + professional profile migrations and redeploy send-email.
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
  echo "==> Pushing all pending migrations"
  npx --yes supabase@latest db push --include-all --yes
else
  npx --yes supabase@latest link --project-ref "$PROJECT_REF"
  echo "==> Applying migrations via linked SQL (no DB password)"
  for f in \
    supabase/migrations/20260804140000_platform_fully_free.sql \
    supabase/migrations/20260804140100_welcome_email_fully_free.sql \
    supabase/migrations/20260804150000_professional_member_profile.sql \
    supabase/migrations/20260805120000_public_author_profiles.sql \
    supabase/migrations/20260805140000_phase2_network_learning.sql \
    supabase/migrations/20260806160000_community_comments_and_media.sql
  do
    echo "---- $f"
    npx --yes supabase@latest db query --linked -f "$f"
  done
fi

echo "==> Deploying send-email function"
npx --yes supabase@latest functions deploy send-email \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "Done. Free access, profiles, author privacy, and Phase 2 network/learning tables are live."
