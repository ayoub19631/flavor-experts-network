# GitHub Actions and Vercel environment variables

The frontend is Vite (`app/frontend`), not Next.js. Browser-exposed names use `VITE_*`. `NEXT_PUBLIC_SUPPORT_EMAIL` and `NEXT_PUBLIC_PRIVACY_EMAIL` are accepted as aliases.

## GitHub repository secrets

| Secret | Required for | Notes |
|---|---|---|
| `VERCEL_TOKEN` | Manual Vercel CLI fallback only | Never printed in logs. Automatic deploys use Vercel Git Integration |
| `VERCEL_ORG_ID` | Manual Vercel CLI fallback only | |
| `VERCEL_PROJECT_ID` | Manual Vercel CLI fallback only | |
| `VITE_SUPABASE_URL` | Manual CLI / Pages build | Public project URL |
| `VITE_SUPABASE_ANON_KEY` | Manual CLI / Pages build | Anon/publishable key only |
| `SUPABASE_ACCESS_TOKEN` | Manual `deploy-supabase.yml` | Personal access token |
| `SUPABASE_DB_PASSWORD` | Manual `deploy-supabase.yml` db push | Required if `apply_migrations` is selected |
| `CRON_SECRET` | Daily market workflow | |

Automatic frontend deploys come from **Vercel Git Integration** on `main` and pull-request previews. The Vercel CLI workflows are `workflow_dispatch` only and skip when secrets are missing.

Supabase migrations and Edge Function deploys are **manual** (`workflow_dispatch`) and use the GitHub `Production` environment with required reviewers. They never run on pull requests. Ordinary CI keeps `migration guard` and `fresh-db` offline.

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
