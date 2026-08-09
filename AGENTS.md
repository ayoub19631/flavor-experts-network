# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single web product: the **Flavor Experts Network** frontend (React 18 + TypeScript + Vite 5 + Supabase) living entirely in `app/frontend`. The root `package.json` scripts are thin wrappers that delegate into `app/frontend` (e.g. `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`). `electron/`, `supabase/`, and `database/` are for desktop packaging, edge functions, and SQL reference — they are not needed to run/lint/test/build the web app.

Standard commands are already documented in `README.md` and defined in `app/frontend/package.json` scripts — use those as the source of truth. Key ones (run from `app/frontend`): `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright), `pnpm build`.

Non-obvious caveats for this environment:

- **Package manager is pinned to `pnpm@9.15.9`** via the `packageManager` field in `app/frontend/package.json` (this is what CI uses). The VM's default global pnpm may be newer; run `corepack prepare pnpm@9.15.9 --activate` before pnpm commands to stay CI-consistent. The update script already does this on startup.
- **A `.env` is required in `app/frontend`** or Vite logs "Missing Supabase environment variables". Copy `app/frontend/.env.example` to `app/frontend/.env`. Placeholder Supabase values (as used in `.github/workflows/frontend-ci.yml`) are enough to run the dev server, build, lint, unit tests, and E2E smoke tests — the UI, i18n (EN/AR RTL), theming, and SPA routing all work. `.env` is gitignored.
- **DB-backed features need a real Supabase project.** With placeholder credentials, anything hitting Supabase (sign up / login, contact form submission, live News/Members/Jobs data) will fail or show empty states — this is expected, not a bug. To exercise those flows, set real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env` (from a Supabase project). There is no local backend to start; dev runs against remote Supabase.
- **Dev server runs on port `3001`** (from `VITE_PORT`) bound to `0.0.0.0`. Playwright's config starts its own Vite server on `127.0.0.1:3001` with `--strictPort`, so stop any dev server on 3001 before `pnpm test:e2e` (or Playwright reuses the existing one locally).
- **E2E needs the Playwright Chromium browser.** Install once with `pnpm exec playwright install --with-deps chromium` (persists in the VM snapshot; not part of the startup update script).
