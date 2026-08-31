# GitHub Actions and Vercel environment variables

The frontend is Vite (`app/frontend`), not Next.js. Browser-exposed names use `VITE_*`. `NEXT_PUBLIC_SUPPORT_EMAIL` and `NEXT_PUBLIC_PRIVACY_EMAIL` are accepted as aliases.

## GitHub repository secrets

| Secret | Required for | Notes |
|---|---|---|
| `VERCEL_TOKEN` | Production + preview deploy workflows | Never printed in logs |
| `VERCEL_ORG_ID` | Production + preview deploy workflows | |
| `VERCEL_PROJECT_ID` | Production + preview deploy workflows | |
| `VITE_SUPABASE_URL` | Production CLI build | Public project URL |
| `VITE_SUPABASE_ANON_KEY` | Production CLI build | Anon/publishable key only |
| `SUPABASE_ACCESS_TOKEN` | `deploy-supabase.yml` | Personal access token |
| `SUPABASE_DB_PASSWORD` | `deploy-supabase.yml` db push | Prefer over Management API fallback |
| `CRON_SECRET` | Daily market workflow | |

Production deploy workflow runs only on `main`. Pull requests get preview builds from this repo’s preview workflow and/or Vercel Git integration.

## Vercel project environment variables

Set these on the Vercel project (Production + Preview):

| Variable | Exposed to browser | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase API |
| `VITE_SUPABASE_ANON_KEY` | Yes | Anon key only |
| `VITE_SITE_URL` | Yes | `https://flavorexpertsnetwork.com` |
| `VITE_APP_TITLE` | Yes | Document title |
| `VITE_APP_DESCRIPTION` | Yes | Default meta description |
| `VITE_SUPPORT_EMAIL` or `NEXT_PUBLIC_SUPPORT_EMAIL` | Yes | Footer / contact mailto |
| `VITE_PRIVACY_EMAIL` or `NEXT_PUBLIC_PRIVACY_EMAIL` | Yes | Privacy page mailto |
| `VITE_PLATFORM_PRIVATE` | Yes | `false` in production |
| `VITE_OAUTH_ENABLED` | Yes | Google button |
| `VITE_PAYMENTS_ENABLED` | Yes | Keep `false` |

Do **not** put these in Vercel or `VITE_*`:

| Secret | Where it belongs |
|---|---|
| `TRANSACTIONAL_FROM_EMAIL` / `EMAIL_FROM` | Supabase Edge Function secrets |
| `RESEND_API_KEY` | Supabase Edge Function secrets |
| `SUPABASE_SERVICE_ROLE` | Supabase / server only |
| `OPENAI_API_KEY` | `flavorbot` Edge Function secret |
| OAuth client secrets | `oauth` Edge Function secrets |

## DNS

Point `flavorexpertsnetwork.com` at Vercel. Configure `www.flavorexpertsnetwork.com` as a redirect host. `vercel.json` issues a permanent redirect to the non-www host and preserves path and query.
