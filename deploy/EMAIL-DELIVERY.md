# Email + OTP delivery (Flavor Experts)

## Architecture

| Path | Messages | Pipeline |
|------|----------|----------|
| Auth OTP / reset / magic link | Signup code, password reset | Supabase Auth → **Send Email Hook** → `auth-email-hook` → Resend |
| Welcome / contact / newsletter | Welcome, form ACK, admin alert | DB trigger → Vault `resend_api_key` → `pg_net` → Resend |
| Admin broadcast | Newsletter / custom | Edge `send-email` → Resend |

**From address (verified):** `Flavor Experts Network <noreply@nexusflavor.com>`  
**Site:** `https://flavorexpertsnetwork.com`

## Required Edge secrets

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Send via Resend |
| `EMAIL_FROM` | Must use verified domain `nexusflavor.com` |
| `SITE_URL` | `https://flavorexpertsnetwork.com` |
| `SEND_EMAIL_HOOK_SECRET` | **Must match** Auth → Hooks → Send Email secret |
| `ADMIN_NOTIFY_EMAIL` | Admin alerts |

## Required Auth settings (Dashboard)

1. **Authentication → Hooks → Send Email**
   - Enabled
   - URL: `https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/auth-email-hook`
   - Secret generated → copy the **complete value** into Edge secret
     `SEND_EMAIL_HOOK_SECRET` (including `v1,whsec_…`).
   - The Edge Function removes both prefixes before passing the base64 value to
     `standardwebhooks`, as required by the official Supabase example.
2. **Email OTP** length = 6  
3. **Confirm email** = ON  
4. **Rate limit (email sent)** — set to **30** (or higher). A value of `2` blocks OTP resends.  
5. Redirect URLs include:
   - `https://flavorexpertsnetwork.com/**`
   - `https://flavorexpertsnetwork.com/auth/callback`
   - localhost variants for dev

## Vault secrets (DB triggers)

| Name | Purpose |
|------|---------|
| `resend_api_key` | Trigger emails |
| `email_from` | From header |
| `admin_notify_email` | Admin notify |
| `site_url` | Branded links |

## Deploy

```bash
supabase functions deploy auth-email-hook --project-ref imucfofvdwfyexdwrsfe --no-verify-jwt
supabase functions deploy send-email --project-ref imucfofvdwfyexdwrsfe --no-verify-jwt

# Apply reliability migration + pending welcomes
supabase db query --linked -f supabase/migrations/20260809170000_email_delivery_reliability.sql
supabase db query --linked "select public.resend_pending_welcome_emails(50);"
```

Or: `bash deploy/fix-email-delivery.sh`

## Quick diagnosis

| Symptom | Likely cause |
|---------|----------------|
| OTP never arrives | `SEND_EMAIL_HOOK_SECRET` missing/mismatched, or hook disabled |
| `Hook requires authorization token` | The hook returned 401. Usually the dashboard secret and `SEND_EMAIL_HOOK_SECRET` differ, or the `v1,whsec_` prefix was parsed incorrectly. Redeploy `auth-email-hook`, regenerate/sync the secret, then retry. |
| OTP works once then stops | Auth `rate_limit_email_sent` too low (e.g. 2) |
| Welcome never arrives | Vault `resend_api_key` missing, or `welcome_email_sent=true` after failed attempt (fixed in migration) |
| Resend 403 domain | `EMAIL_FROM` not on verified `nexusflavor.com` |

Check Resend dashboard → Emails, and `net._http_response` for DB-path status codes.

### End-to-end OTP probe

Use an existing account so this does not create test users:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/otp" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  --data '{"email":"you@example.com","options":{"shouldCreateUser":false}}'
```

An empty JSON response with HTTP `200` means Auth accepted the request and the
synchronous Send Email Hook completed successfully. A `500` means the hook
failed; do not treat the OTP as delivered.
