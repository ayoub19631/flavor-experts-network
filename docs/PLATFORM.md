# Flavor Experts Network — Platform Guide

دليل المنتج والتقنية للتطوير المستقبلي. اقرأ هذا الملف قبل أي تغيير كبير.

| | |
|---|---|
| **Product** | Flavor Experts Network — شبكة خبراء النكهات |
| **Live site** | https://flavorexpertsnetwork.com |
| **Supabase** | `imucfofvdwfyexdwrsfe` |
| **Publish** | Vercel GitHub integration on `origin/main` |
| **Policy** | Fully free educational / professional network |

---

## 1. Product identity

منصة مهنية تعليمية لعلماء النكهات وتقنيي الأغذية: مجتمع، وظائف، منتدى، دورات، معرفة سوقية، وملفات مهنية.

**ليست** منصة سياسية، وليست شبكة ترفيه أو مواعدة، وليست متجراً مدفوعاً.

The platform is for professional learning, scientific exchange, flavor/food-tech news, jobs, and company collaboration only.

---

## 2. Rules that must not be broken

These are product policy, not suggestions.

1. **Keep the platform fully free.** `PLATFORM_ALWAYS_FREE = true` in `app/frontend/src/lib/site-config.ts`. Database `has_active_subscription()` must remain “any signed-in user”. Do not sell paid plans in the live UI.
2. **Do not restore old project copies.** Nested typo folders, stash `wip-old-private-copy-do-not-restore-blindly`, and sibling backups are obsolete. Develop only in this repo.
3. **Database source of truth is `supabase/migrations/` only.** Never invent a new `MASTER-SETUP.sql` or re-run deleted `database/*.sql` archives on production.
4. **Login is Google + email only.** LinkedIn *login* is disabled. The LinkedIn *group* link in the footer may stay. Do not re-enable LinkedIn Sign In unless the product owner asks and OpenID Connect is enabled on the LinkedIn app.
5. **Secrets never go in `VITE_*`.** OpenAI, Resend, service role, and OAuth client secrets belong in Supabase Edge Function secrets / Vault only.
6. **Educational content policy is absolute:** no politics, no child-related content, no pornography. Terms version: `2026-08-30` (`app/frontend/src/lib/terms-policy.ts`). New accounts must accept terms. Changing terms requires a new `TERMS_VERSION` so existing users re-accept.
7. **Production Git remote for the live site is `origin`** → `ayoub19631/flavor-experts-network`. Do not confuse it with the older `private` remote.
8. **Visible login label stays English:** `Client Login` in every language (`nav.login`, `auth.login`).

---

## 3. Repository layout (current)

```
├── app/frontend/          React 18 + TypeScript + Vite + Capacitor
├── electron/              Desktop shell (copies latest web build into electron/web)
├── supabase/
│   ├── migrations/        Versioned SQL — only schema source of truth
│   └── functions/         Edge Functions
├── deploy/                Ops docs and scripts
├── docs/PLATFORM.md       This file
├── scripts/               Asset helpers
├── build.mjs              Unified web → Electron / Android / iOS
└── vercel.json            Production frontend deploy
```

Frontend entry: `app/frontend/src/App.tsx`  
Auth: `app/frontend/src/lib/auth.tsx`  
Branding / free-policy flags: `app/frontend/src/lib/site-config.ts`

---

## 4. Features catalog

### 4.1 Public marketing (`/welcome`)

Landing page: hero, about, news, educational resources, partners, contact, footer.  
Home for members is the community (`/`), not this page.

### 4.2 Authentication (`/auth`)

| Capability | Notes |
|---|---|
| Individual signup | Email + password + required terms checkbox |
| Company signup | Same + company metadata; `claim_company_account` after email confirm |
| Client Login | Email/password; button label always **Client Login** |
| Google OAuth | Edge Function `oauth` — start + callback |
| Password reset | Email recovery via `auth-email-hook` |
| Email verification | 6-digit OTP → `/verify-email` → `/email-verified` |
| Terms gate | `TermsAcceptanceGuard` for signed-in users whose `terms_version` ≠ current |
| Private preview | Optional `VITE_PLATFORM_PRIVATE` + allowlist; otherwise public |

After login / OAuth, land on community `/`.

### 4.3 Community (`/`, `/community`)

Professional feed: posts, photos, likes, comments, hashtags, share.  
Client-side policy filter in `content-policy.ts` blocks banned topics before publish.  
Guests can browse; publishing and interaction require Client Login.

### 4.4 Members (`/members`, `/members/:id`)

Directory, public profiles, talent matching (`matching.ts`), connection requests (`connections.ts`).  
Profile fields: cover, skills, experience, education, projects, LinkedIn *URL* (profile link, not login).

### 4.5 Jobs (`/jobs`)

Open listings for guests; apply and company posting after login. Skill-match hints. Free for companies.

### 4.6 Forum (`/forum`, `/forum/c/:slug`, `/forum/t/:id`)

Categories, topics, replies. Admin can manage categories. Login required to participate.

### 4.7 Courses (`/courses`)

Learning paths and enrollment. Access is free while `PLATFORM_ALWAYS_FREE` is true.

### 4.8 Market (`/market`)

Industry briefings and commodity filters. Refresh via Edge Function `refresh-market-briefing` and daily cron.

### 4.9 Knowledge

- Blog (`/blog/*`) — SEO articles in `app/frontend/seo/content/`
- News & resources on `/welcome` from `industry_news` and `educational_resources`
- Automated news curation: `curate-industry-news`

### 4.10 Consultations & enterprise

- `/consultations` — inquiry form
- `/enterprise` — company services page
- Public forms go through `submit-public-form`

### 4.11 Dashboard (`/dashboard`)

Signed-in professional profile editor (photo, cover, skills, experience, education, projects).

### 4.12 Admin (`/admin`)

Requires `user_profiles.is_admin = true` (set via service role / `create-admin.mjs`, never from the client).

Tabs: Overview, News, Resources, Members, Users, Messages, Enterprise, Settings, Broadcast, Moderation, Courses, Consultations, Forum.

### 4.13 FlavorBot

In-app assistant (`ChatAssistant.tsx` + `supabase/functions/flavorbot`). OpenAI key is server-side only.

### 4.14 Legal

- `/terms` and `/privacy`
- Welcome email includes full bilingual Terms (AR + EN)
- Absolute bans: politics, children, pornography

### 4.15 Apps

| Surface | How |
|---|---|
| Web | Vercel → flavorexpertsnetwork.com |
| Desktop | Electron (`electron/`, `node build.mjs --electron`) |
| Android / iOS | Capacitor 8 under `app/frontend/android` and `ios` — see `deploy/MOBILE-APPS.md` |

---

## 5. Languages and UX

| Code | Language | Direction |
|---|---|---|
| `en` | English | LTR |
| `ar` | Arabic | RTL |
| `fr` `es` `de` `tr` `zh` | Extra UI locales | LTR |

Core strings: `app/frontend/src/lib/i18n.tsx`  
Extra locales: `app/frontend/src/lib/locales/extra.ts`  
Chat / some APIs map any language to `ar` or `en` via `bilingualLang()`.  
Many inner pages still fall back to English if a key is missing — add keys there when localizing further.

Theme: dark / light (`theme.tsx`).

---

## 6. Backend

### 6.1 Apply schema

```bash
npx supabase db push
# or
SUPABASE_ACCESS_TOKEN=... bash deploy/apply-platform-updates.sh
```

Important live behaviors:

- `has_active_subscription()` → signed-in user (free platform)
- `accept_platform_terms(p_version)` + trigger from signup metadata
- `claim_company_account` + website sanitize
- Welcome email trigger `notify_welcome_email()` with full Terms copy
- Storage folders: `avatars`, `covers`, `community`

### 6.2 Active Edge Functions

| Function | Role |
|---|---|
| `oauth` | Google start/callback. LinkedIn start/callback rejected |
| `auth-email-hook` | Auth emails (signup OTP, recovery, magic link) + terms block |
| `send-email` | Broadcast, replies, acks (admin / internal) |
| `flavorbot` | AI assistant |
| `submit-public-form` | Contact / newsletter / enterprise / consultations |
| `refresh-market-briefing` | Market data refresh |
| `curate-industry-news` | Industry news cron |

### 6.3 Unused payment stubs (do not revive)

`create-checkout-session` and `stripe-webhook` are deprecated. Frontend checkout was removed. Leave them unused unless the owner explicitly asks to sell plans.

### 6.4 Email

- Provider: Resend (`noreply@nexusflavor.com` / verified domain)
- Docs: `deploy/EMAIL-DELIVERY.md`, `deploy/RESEND-DNS-SETUP.md`
- New accounts receive a professional welcome email with the full Terms

---

## 7. Routes map

| Path | Page | Access |
|---|---|---|
| `/` `/community` | Community feed | Public browse |
| `/welcome` | Marketing site | Public |
| `/auth` | Client Login / signup | Public |
| `/auth/callback` `/auth/error` | OAuth result | Public |
| `/verify-email` `/email-verified` | OTP verify | Session |
| `/dashboard` | Profile | Signed-in + verified + terms |
| `/members` `/members/:id` | Directory / profile | Public |
| `/jobs` | Jobs | Public browse |
| `/forum` … | Forum | Public browse |
| `/courses` | Courses | Public browse |
| `/market` | Market briefings | Public |
| `/consultations` `/enterprise` | Inquiries | Public |
| `/blog/*` | SEO blog | Public |
| `/terms` `/privacy` | Legal | Public |
| `/admin` | Admin | `is_admin` |
| `/pricing` | Redirects to `/` | — |

Guards (outer → inner): `EmailVerificationGuard` → `TermsAcceptanceGuard` → `PlatformAccessGuard`.

---

## 8. Local development

```bash
cd app/frontend
pnpm install
cp .env.example .env
pnpm dev
```

Quality: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e`

Desktop launcher (optional): `تشغيل المنصة.ps1` (Vite + Electron).

Never commit `.env`, `deploy/oauth.env`, or `*.secret.txt`.

---

## 9. Publish checklist

1. Change only the current tree (`app/frontend`, `supabase`, `electron` sources, `deploy`).
2. Keep free-platform and terms policy intact unless the owner asks otherwise.
3. `pnpm typecheck` + `pnpm test` + `pnpm build` in `app/frontend`.
4. Push to `origin/main` for Vercel.
5. New SQL goes in a new file under `supabase/migrations/` and is applied with `db push` / `apply-platform-updates.sh`.
6. After a web release, refresh the desktop copy with `node build.mjs --electron` when shipping Electron.

---

## 10. What was cleaned out (do not restore)

Removed as unused leftovers:

- Nested typo copies of this project inside the repo
- `.atoms/` early landing-page notes and `.wiki.md`
- Legacy `database/*.sql` bootstrap archives
- Dead scripts: `fix-rls.mjs`, `upgrade-demo.mjs`, `seed-fix.mjs`, `seed-test-users.mjs`
- Unused `PricingPage.tsx` (`/pricing` still redirects home)
- Dev-only `DatabaseStatus` widget on the welcome page
- `deploy/STRIPE-SETUP.md` and Netlify frontend config
- Local `uploads/` and empty `Video/` leftovers
- Git stash of the old private copy

If you need history, use `git log` on this repository — not those folders.
