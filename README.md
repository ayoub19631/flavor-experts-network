# 🌿 Flavor Experts Network — شبكة خبراء النكهات

> منصة التواصل الاحترافية الأولى لعلماء النكهات ومتخصصي تقنية الأغذية في العالم العربي والخليجي.

**Live Site:** [localhost:3001](http://localhost:3001)  
**Supabase Project:** [imucfofvdwfyexdwrsfe](https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe)

---

## 📁 Project Structure

```
موقع خبراء النكهات احترافي/
│
├── app/frontend/              ← React 18 + TypeScript + Vite
├── electron/                  ← Desktop shell (Electron)
├── database/                  ← SQL reference scripts
├── supabase/
│   ├── functions/             ← Edge Functions (OAuth, Stripe, FlavorBot)
│   └── migrations/            ← Versioned DB migrations
├── deploy/                    ← Hosting / ops docs
└── build.mjs                  ← Unified web → electron/android build
```

---

## 🚀 Development Setup

### 1. Install dependencies
```bash
cd app/frontend
pnpm install
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in values from the Supabase dashboard:

```env
VITE_SUPABASE_URL=https://imucfofvdwfyexdwrsfe.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_TITLE=Flavor Experts Network
VITE_SITE_URL=https://flavorexpertsnetwork.com
```

> Never put secret API keys (OpenAI, Stripe secret, service role) in `VITE_*` variables — they are exposed to the browser. Store secrets in Supabase Edge Function secrets only.

### 3. Start development server
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

## 🗄️ Database Setup

1. Run **`database/MASTER-SETUP.sql`** once (new projects only)
2. Apply versioned migrations in `supabase/migrations/` (security + premium links)
3. Or re-run the phase files under `database/PHASE*.sql` if migrating manually

Admin access is controlled by `user_profiles.is_admin = true` (set only via service role / SQL — never from the client).

Admin panel: `/admin`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Routing | React Router v6 |
| i18n | Custom EN/AR context provider (RTL) |
| State | TanStack Query + React Context (+ Zustand for UI state) |
| Forms | react-hook-form + Zod |
| Payments | Stripe (Checkout + Webhooks) |
| Desktop / Mobile | Electron 32 + Capacitor 8 |
| Quality | ESLint, Vitest, Playwright, GitHub Actions |
| Observability | Sentry (optional via `VITE_SENTRY_DSN`) |

---

## 📋 Features

- Landing page with live DB content (News, Resources, Members)
- Authentication — Individual & Company accounts + OAuth
- Email verification flow
- Professional dashboard with profile editing & avatar upload
- Premium & Enterprise subscription tiers (Stripe)
- Admin control panel (News, Resources, Members, Users, Messages, Enterprise)
- File uploads — Images & PDFs (Supabase Storage)
- FlavorBot assistant (Edge Function — OpenAI key server-side)
- Bilingual EN/AR with RTL support
- Dark/Light mode
- Responsive design (mobile-first)
