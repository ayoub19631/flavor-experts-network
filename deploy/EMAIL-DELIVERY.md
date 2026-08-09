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
   - Secret generated → copy into Edge secret `SEND_EMAIL_HOOK_SECRET` (include `v1,whsec_…` if shown)
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
| OTP works once then stops | Auth `rate_limit_email_sent` too low (e.g. 2) |
| Welcome never arrives | Vault `resend_api_key` missing, or `welcome_email_sent=true` after failed attempt (fixed in migration) |
| Resend 403 domain | `EMAIL_FROM` not on verified `nexusflavor.com` |

Check Resend dashboard → Emails, and `net._http_response` for DB-path status codes.
