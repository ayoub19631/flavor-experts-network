# Edge Functions secrets & deploy

## Required secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Used by |
|--------|---------|
| `OPENAI_API_KEY` | `flavorbot` |
| `OPENAI_MODEL` | `flavorbot` (optional, default `gpt-4o-mini`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `oauth` |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | unused while LinkedIn login is disabled |
| `OAUTH_STATE_SECRET` | `oauth` (HMAC for OAuth state) |
| `RESEND_API_KEY` | `send-email`, `auth-email-hook` |
| `EMAIL_FROM` | `send-email`, `auth-email-hook` (must be verified: `Flavor Experts Network <noreply@nexusflavor.com>`) |
| `SEND_EMAIL_HOOK_SECRET` | `auth-email-hook` — must match Auth → Hooks → Send Email secret |
| `ADMIN_NOTIFY_EMAIL` | `send-email` |
| `SITE_URL` | branded emails |
| `INTERNAL_EMAIL_SECRET` | optional header auth for internal email types |

### Auth emails (OTP / verify / reset) via Resend

1. Deploy `auth-email-hook` (JWT verification **off**).
2. Supabase Dashboard → **Authentication → Hooks → Send Email** → enable HTTPS hook:
   `https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/auth-email-hook`
3. Ensure Auth uses **6-digit OTP** (Email OTP) so `/verify-email` works.
4. Domain in Resend must be verified; `EMAIL_FROM` must match that domain.

### Email types handled by `send-email`

| type | Who can call | Purpose |
|------|--------------|---------|
| `broadcast` | admin JWT | Batch newsletter/announcement via Resend |
| `reply` | admin JWT | Reply to contact message |
| `custom` | admin JWT | Ad-hoc email |
| `welcome` | internal/admin | Welcome + bilingual platform policy summary (Terms/Privacy) |
| `contact_ack` / `enterprise_ack` | internal | Form acknowledgments |
| `newsletter_welcome` | internal | Newsletter confirmation |
| `security_alert` | internal | Security notices |

DB triggers also send welcome, contact ACK, enterprise ACK, consultation, and newsletter emails via Vault `resend_api_key`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

## Deploy

```bash
# From repo root (requires Supabase CLI logged in)
supabase functions deploy flavorbot --project-ref imucfofvdwfyexdwrsfe
supabase functions deploy send-email --project-ref imucfofvdwfyexdwrsfe --no-verify-jwt
supabase functions deploy auth-email-hook --project-ref imucfofvdwfyexdwrsfe --no-verify-jwt
supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe
# Do not redeploy create-checkout-session / stripe-webhook — unused while the platform is free

# Email/OTP ops
bash deploy/fix-email-delivery.sh
# Full guide: deploy/EMAIL-DELIVERY.md
```

## Vercel production

Git-connected builds use root `vercel.json` (`pnpm --dir app/frontend …`).  
If dashboard Root Directory is set to `app/frontend`, prefer CLI/GHA deploy from that folder.

Optional GitHub Actions secrets for `.github/workflows/deploy-vercel.yml`:
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Security notes

- Never put OpenAI / Stripe / Resend / service-role keys in `VITE_*` env vars.
- OAuth state is HMAC-signed; set a dedicated `OAUTH_STATE_SECRET` in production.
- Premium resource URLs are stored in `resource_secure_links` (RLS: paid/admin only).
