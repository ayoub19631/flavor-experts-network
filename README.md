# Flavor Experts Network — شبكة خبراء النكهات

Professional community platform for flavor scientists and food technologists across the Arab world and Gulf region.

| | |
|---|---|
| **Website** | [flavorexpertsnetwork.com](https://flavorexpertsnetwork.com) |
| **Stack** | React 18 · TypeScript · Vite · Supabase · Stripe |
| **Apps** | Web · Electron · Capacitor (Android) |

---

## Repository layout

```
├── app/frontend/          React 18 + TypeScript + Vite
├── electron/              Desktop shell (Electron)
├── database/              SQL reference & setup scripts
├── supabase/
│   ├── functions/         Edge Functions (OAuth, Stripe, FlavorBot, email)
│   └── migrations/        Versioned database migrations
├── deploy/                Hosting, OAuth, Stripe & ops docs
└── build.mjs              Unified web → electron / android build
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

Fill values from the Supabase dashboard. Never put secret API keys (OpenAI, Stripe secret, service role) in `VITE_*` variables — they ship to the browser. Store secrets only in Supabase Edge Function secrets.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_TITLE=Flavor Experts Network
VITE_SITE_URL=https://flavorexpertsnetwork.com
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

1. Run `database/MASTER-SETUP.sql` once (new projects only)
2. Apply versioned migrations in `supabase/migrations/`
3. Or re-run phase files under `database/PHASE*.sql` if migrating manually

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
| State | TanStack Query + React Context (+ Zustand) |
| Forms | react-hook-form + Zod |
| Payments | Stripe (Checkout + Webhooks) |
| Desktop / Mobile | Electron 32 + Capacitor 8 |
| Quality | ESLint, Vitest, Playwright, GitHub Actions |
| Observability | Sentry (optional via `VITE_SENTRY_DSN`) |

---

## Features

- Landing page with live DB content (News, Resources, Members)
- Authentication — individual & company accounts + OAuth
- Email verification flow
- Professional dashboard with profile editing & avatar upload
- Premium & Enterprise subscription tiers (Stripe)
- Admin control panel (News, Resources, Members, Users, Messages, Enterprise)
- File uploads — images & PDFs (Supabase Storage)
- FlavorBot assistant (Edge Function — OpenAI key server-side)
- Bilingual EN/AR with RTL support
- Dark / light mode
- Responsive design (mobile-first)

---

## License

Private repository — all rights reserved.
