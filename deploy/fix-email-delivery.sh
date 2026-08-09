#!/usr/bin/env bash
# Fix / verify email + OTP delivery for Flavor Experts.
# Requires: SUPABASE_ACCESS_TOKEN
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-imucfofvdwfyexdwrsfe}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is required"
  exit 1
fi

npx --yes supabase@latest link --project-ref "$PROJECT_REF"

echo "==> Deploy auth-email-hook + send-email"
npx --yes supabase@latest functions deploy auth-email-hook --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy send-email --project-ref "$PROJECT_REF" --no-verify-jwt

echo "==> Apply email reliability migration"
npx --yes supabase@latest db query --linked -f supabase/migrations/20260809170000_email_delivery_reliability.sql

echo "==> Resend pending welcome emails"
npx --yes supabase@latest db query --linked "select public.resend_pending_welcome_emails(50) as resent;"

echo "==> Test DB → Resend path"
npx --yes supabase@latest db query --linked "
select public.send_resend_email(
  (select decrypted_secret from vault.decrypted_secrets where name='admin_notify_email' limit 1),
  'Flavor Experts — delivery check',
  '<p>Email path OK</p>',
  'Email path OK'
) as request_id;
"

echo ""
echo "Done."
echo "IMPORTANT (Dashboard manual step if OTP still blocked):"
echo "  Auth → Rate Limits → Email sent → set to 30+"
echo "  Auth → Hooks → Send Email → ensure secret matches Edge SEND_EMAIL_HOOK_SECRET"
echo "See deploy/EMAIL-DELIVERY.md"
