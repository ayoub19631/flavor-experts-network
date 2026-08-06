# Flavor Experts Network — شبكة خبراء النكهات

Free professional network for flavor scientists and food technologists — jobs, community, education, and industry knowledge.

| | |
|---|---|
| **Website** | [flavorexpertsnetwork.com](https://flavorexpertsnetwork.com) |
| **Stack** | React 18 · TypeScript · Vite · Supabase |
| **Policy** | Fully free for individuals and companies |
| **Apps** | Web · Electron · Capacitor (Android + iOS) — see [deploy/MOBILE-APPS.md](deploy/MOBILE-APPS.md) |

---

## Repository layout

```
├── app/frontend/          React 18 + TypeScript + Vite
├── electron/              Desktop shell (Electron)
├── database/              SQL reference & setup scripts
├── supabase/
│   ├── functions/         Edge Functions (OAuth, FlavorBot, email, cron)
│   └── migrations/        Versioned database migrations
├── deploy/                Hosting, OAuth & ops docs/scripts
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

1. Run `database/MASTER-SETUP.sql` once (**new projects only** — do not re-run on production)
2. Apply versioned migrations in `supabase/migrations/` with `supabase db push`
3. Or use `deploy/apply-platform-updates.sh` with `SUPABASE_ACCESS_TOKEN`

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
| i18n | Custom EN/AR provider (RTL) |
| State | TanStack Query + React Context |
| Membership | Fully free (`PLATFORM_ALWAYS_FREE`) |
| Desktop / Mobile | Electron 32 + Capacitor 8 |
| Quality | ESLint, Vitest, Playwright, GitHub Actions |
| Observability | Sentry (optional via `VITE_SENTRY_DSN`) |

---

## Features

- Landing page with live DB content (News, Resources, Members)
- Authentication — individual & company accounts + OAuth
- Email verification flow
- Professional dashboard with cover photo, skills, experience, education, projects
- Members directory with search, filters, talent matching, and connection requests
- Jobs board with skill-match hints (free browse/apply; free company posting)
- Community feed with photo posts, likes, comments, share + forum moderation
- Market briefings with archive + commodity filters
- Learning paths and free course enrollment
- Admin analytics overview + broadcast + moderation
- Consultations inquiry form
- File uploads — images & PDFs (Supabase Storage, including `community/` media)
- FlavorBot assistant (Edge Function — OpenAI key server-side)
- Android / iOS shells via Capacitor (debug on emulator / Xcode simulator)
- Bilingual EN/AR with RTL support
- Dark / light mode
- Responsive design (mobile-first)

---

## Ops notes

- Production code deploys via Vercel GitHub integration on `main`.
- Apply pending Supabase migrations with `deploy/apply-platform-updates.sh` (needs `SUPABASE_ACCESS_TOKEN`).
- Legacy Stripe checkout UI was removed from the frontend. Older edge-function stubs may still exist under `supabase/functions/` but are unused while `PLATFORM_ALWAYS_FREE` is true.

## License

Private repository — all rights reserved.
