# Edge Functions secrets & deploy

## Required secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Used by |
|--------|---------|
| `OPENAI_API_KEY` | `flavorbot` |
| `OPENAI_MODEL` | `flavorbot` (optional, default `gpt-4o-mini`) |
| `STRIPE_SECRET_KEY` | `create-checkout-session` |
| `STRIPE_PRICE_PRO_MONTHLY` / `_ANNUAL` | checkout |
| `STRIPE_PRICE_ENT_MONTHLY` / `_ANNUAL` | checkout |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `oauth` |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | `oauth` |
| `OAUTH_STATE_SECRET` | `oauth` (HMAC for OAuth state) |
| `RESEND_API_KEY` | `send-email`, `auth-email-hook` |
| `EMAIL_FROM` | `send-email`, `auth-email-hook` (e.g. `Flavor Experts <noreply@flavorexpertsnetwork.com>`) |
| `ADMIN_NOTIFY_EMAIL` | `send-email` |
| `SITE_URL` | checkout redirects + branded emails |
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
supabase functions deploy send-email --project-ref imucfofvdwfyexdwrsfe
supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe
supabase functions deploy create-checkout-session --project-ref imucfofvdwfyexdwrsfe
supabase functions deploy stripe-webhook --project-ref imucfofvdwfyexdwrsfe
```

## Security notes

- Never put OpenAI / Stripe / Resend / service-role keys in `VITE_*` env vars.
- OAuth state is HMAC-signed; set a dedicated `OAUTH_STATE_SECRET` in production.
- Premium resource URLs are stored in `resource_secure_links` (RLS: paid/admin only).
