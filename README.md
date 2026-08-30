# Flavor Experts Network — شبكة خبراء النكهات

Free professional network for flavor scientists and food technologists — jobs, community, education, and industry knowledge.

| | |
|---|---|
| **Website** | [flavorexpertsnetwork.com](https://flavorexpertsnetwork.com) |
| **Stack** | React 18 · TypeScript · Vite · Supabase |
| **Policy** | Fully free for individuals and companies |
| **Apps** | Web · Electron · Capacitor (Android + iOS) — see [deploy/MOBILE-APPS.md](deploy/MOBILE-APPS.md) |
| **Platform guide** | [docs/PLATFORM.md](docs/PLATFORM.md) — features, policy, and future-dev rules |

---

## Repository layout

```
├── app/frontend/          React 18 + TypeScript + Vite
├── electron/              Desktop shell (Electron)
├── supabase/
│   ├── functions/         Edge Functions (OAuth, FlavorBot, email, cron)
│   └── migrations/        Versioned database migrations
├── deploy/                Hosting, OAuth & ops docs/scripts
├── docs/PLATFORM.md       Product features & future-dev guide
└── build.mjs              Unified web → electron / android / ios build
```

---

## Quick start

### 1. Install

```bash
cd app/frontend
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
# For production builds:
cp .env.production.example .env.production
```

Fill values from the Supabase dashboard. Never put secret API keys (OpenAI, service role) in `VITE_*` variables — they ship to the browser. Store secrets only in Supabase Edge Function secrets.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_TITLE=Flavor Experts Network
VITE_SITE_URL=https://flavorexpertsnetwork.com
VITE_PAYMENTS_ENABLED=false
VITE_PLATFORM_PRIVATE=false
```

### 3. Develop

```bash
pnpm dev
# → http://localhost:3001
```

### 4. Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

---

## Database

**Source of truth:** versioned SQL in `supabase/migrations/` only.

```bash
# Preferred
npx supabase db push

# Or (access token; no DB password)
SUPABASE_ACCESS_TOKEN=... bash deploy/apply-platform-updates.sh
```

Do not invent a new bootstrap SQL file. Production already has the migrations applied.

Admin access: `user_profiles.is_admin = true` (service role / SQL only — never from the client).  
Admin panel: `/admin`

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Routing | React Router v6 |
| i18n | EN / AR (RTL) + FR, ES, DE, TR, ZH |
| State | TanStack Query + React Context |
| Membership | Fully free (`PLATFORM_ALWAYS_FREE`) |
| Desktop / Mobile | Electron 32 + Capacitor 8 |
| Quality | ESLint, Vitest, Playwright, GitHub Actions |
| Observability | Sentry (optional via `VITE_SENTRY_DSN`) |

---

## Features

Full catalog and future-dev rules: **[docs/PLATFORM.md](docs/PLATFORM.md)**

- Community home (`/`) with photo posts, likes, comments, and educational content policy
- Marketing landing at `/welcome` (news, resources, partners, contact)
- Client Login + individual/company signup — Google or email; LinkedIn login disabled
- Email verification, welcome email with full Terms, mandatory terms acceptance
- Professional dashboard, members directory, jobs, forum, courses, market briefings
- Admin panel (overview, content, users, broadcast, moderation)
- FlavorBot assistant (OpenAI key server-side only)
- Web + Electron + Capacitor (Android / iOS)
- Languages: EN, AR (RTL), FR, ES, DE, TR, ZH — login button stays **Client Login**
- Dark / light mode, responsive layout

---

## Mobile (debug)

```bash
# Web build + Capacitor sync
cd app/frontend && pnpm cap:android

# Open in Android Studio → select emulator → Run ▶
pnpm cap:open:android

# Or one-shot emulator helper (debug APK, no signing)
bash ../../deploy/run-android-emulator.sh
```

Full notes: [deploy/MOBILE-APPS.md](deploy/MOBILE-APPS.md)

## Ops notes

- Production code deploys via Vercel GitHub integration on `main`.
- Apply pending Supabase migrations with `deploy/apply-platform-updates.sh` (needs `SUPABASE_ACCESS_TOKEN`).
- Stripe checkout UI is removed. Deprecated `create-checkout-session` / `stripe-webhook` stubs stay unused while `PLATFORM_ALWAYS_FREE` is true.

## License

Private repository — all rights reserved.
