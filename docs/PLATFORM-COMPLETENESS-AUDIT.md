# Platform Completeness Audit — Phase 9 closeout

Inventory from `app/frontend/src/App.tsx` and `app/frontend/src/lib/platform-routes.ts`.
88 router records. No guessed product areas.

This closeout **does not** treat HTTP 200 or a login redirect as functional success for a protected page.
Redirects and duplicate/legacy aliases are listed separately from unique functional pages.

Legend for evidence columns:

| Value | Meaning |
|---|---|
| YES | Present in router inventory |
| PLAYWRIGHT | Exercised in local Playwright (guest) |
| LIVE | Non-destructive Production GET |
| GUEST_DENY | Guest reached `/auth` or `/verify-email` — **not** a functional pass |
| UNIT | Isolated unit/contract test of the existing client workflow |
| SQL_CONTRACT | Existing rollback SQL (`supabase/tests/*_rls*.sql`) encodes the write path; not re-executed against Production |
| N/A | Redirect / alias has no independent operation |
| NOT_TESTED | No authorized session of the required role performed the save/write |

Environments:

- **Local isolated writes:** Vitest + existing SQL contracts. No new cloud Supabase project. No Production writes.
- **Production:** GET-only smoke. No messages, notifications, RFQs, quotes, or draft publishing to real members.

## Route evidence (88)

| Route | Kind | Inventoried | Guest | Auth + role | Core operation saved | Result |
|---|---|---|---|---|---|---|
| `/` | page | YES | PLAYWRIGHT + LIVE | N/A public | Public render | PASS |
| `/welcome` | page | YES | LIVE (prior) | N/A public | Utility landing | PASS |
| `/auth` | page | YES | PLAYWRIGHT | NOT_TESTED — no authorized login in this closeout | Login/signup write | NOT_TESTED |
| `/verify-email` | page | YES | NOT_TESTED — needs a pending signup | NOT_TESTED | OTP verify | NOT_TESTED |
| `/email-verified` | page | YES | GUEST_DENY | NOT_TESTED | Callback confirm | NOT_TESTED |
| `/auth/callback` | page | YES | NOT_TESTED — OAuth provider | NOT_TESTED | OAuth exchange | NOT_TESTED |
| `/auth/error` | page | YES | NOT_TESTED | N/A | Error render | NOT_TESTED |
| `/terms` | page | YES | PLAYWRIGHT | N/A public | Public render | PASS |
| `/privacy` | page | YES | PLAYWRIGHT | N/A public | Public render | PASS |
| `/enterprise` | page | YES | PLAYWRIGHT | N/A public | Public render | PASS |
| `/community` | page | YES | PLAYWRIGHT | NOT_TESTED member write | Public read only | PARTIAL |
| `/insights` | page | YES | PLAYWRIGHT | N/A public | Public render | PASS |
| `/publications` | page | YES | PLAYWRIGHT + LIVE | N/A public | Public list | PASS |
| `/publications/books` | page | YES | PLAYWRIGHT | N/A public | Public list | PASS |
| `/publications/research` | page | YES | PLAYWRIGHT | N/A public | Public list | PASS |
| `/publications/:slug` | page | YES | PLAYWRIGHT unpublished slug hidden | N/A public | Draft stays hidden; published read | PARTIAL |
| `/library` | redirect | YES | PLAYWRIGHT → `/publications` | N/A | Query preserved | REDIRECT |
| `/books` | redirect | YES | PLAYWRIGHT → `/publications/books` | N/A | N/A | REDIRECT |
| `/books/:slug` | redirect | YES | Prior e2e | N/A | Drafts stay hidden via canonical page | REDIRECT |
| `/books/:slug/chapters/:chapterSlug` | page | YES | Prior e2e | N/A public | Reader | PASS |
| `/research` | redirect | YES | PLAYWRIGHT → `/publications/research` | N/A | N/A | REDIRECT |
| `/research/:slug` | redirect | YES | Prior e2e | N/A | N/A | REDIRECT |
| `/policies` | page | YES | PLAYWRIGHT | N/A public | Public list | PASS |
| `/policies/:slug` | page | YES | Prior / not this closeout | N/A public | Detail | PARTIAL |
| `/members` | page | YES | PLAYWRIGHT | N/A public | Directory | PASS |
| `/members/:id` | page | YES | Prior e2e | NOT_TESTED follow/connect | Public profile | PARTIAL |
| `/companies` | page | YES | PLAYWRIGHT | N/A public | Directory | PASS |
| `/companies/:slug` | page | YES | Prior e2e | NOT_TESTED company owner edit | Public profile | PARTIAL |
| `/jobs` | page | YES | PLAYWRIGHT | NOT_TESTED company post | Public list | PARTIAL |
| `/jobs/:slug` | page | YES | Prior e2e | NOT_TESTED apply/save | Public detail | PARTIAL |
| `/forum` | page | YES | PLAYWRIGHT | NOT_TESTED member post | Public read | PARTIAL |
| `/forum/c/:slug` | page | YES | Prior e2e | NOT_TESTED | Category | PARTIAL |
| `/forum/t/:id` | page | YES | Prior e2e | NOT_TESTED reply | Topic | PARTIAL |
| `/marketplace` | page | YES | PLAYWRIGHT + LIVE | N/A public | Hub | PASS |
| `/marketplace/suppliers` | page | YES | PLAYWRIGHT | N/A public | List + loading/empty | PASS |
| `/marketplace/suppliers/:slug` | page | YES | Prior e2e | N/A public | Public supplier | PARTIAL |
| `/marketplace/materials` | page | YES | PLAYWRIGHT | N/A public | List + loading/empty | PASS |
| `/marketplace/materials/:slug` | page | YES | Prior e2e | N/A public | Public material | PARTIAL |
| `/marketplace/rfq` | page | YES | GUEST_DENY | NOT_TESTED buyer | Create RFQ write | NOT_TESTED |
| `/market` | page | YES | PLAYWRIGHT | N/A public | Public render | PASS |
| `/blog` | page | YES | PLAYWRIGHT | N/A public | Public list | PASS |
| `/blog/:slug` | page | YES | Prior e2e | N/A public | Detail | PARTIAL |
| `/consultations` | page | YES | PLAYWRIGHT | N/A public | Hub | PASS |
| `/consultations/experts` | page | YES | PLAYWRIGHT | N/A public | List | PASS |
| `/consultations/experts/:id` | page | YES | Prior e2e | NOT_TESTED request | Detail | PARTIAL |
| `/events` | page | YES | PLAYWRIGHT | N/A public | List | PASS |
| `/events/:slug` | page | YES | Prior e2e | NOT_TESTED RSVP | Detail | PARTIAL |
| `/discover` | page | YES | PLAYWRIGHT + LIVE | N/A public | Discover | PASS |
| `/search` | page | YES | PLAYWRIGHT + LIVE | N/A public | Search UI | PASS |
| `/messages` | page | YES | GUEST_DENY | NOT_TESTED — would notify real members | Send/read thread | NOT_TESTED |
| `/dashboard` | page | YES | GUEST_DENY (`next=` keeps `tab=`) | NOT_TESTED member | Tabs/profile/posts | NOT_TESTED |
| `/dashboard/publications` | page | YES | GUEST_DENY | NOT_TESTED author | Author library | NOT_TESTED |
| `/dashboard/publications/:id` | page | YES | GUEST_DENY | NOT_TESTED author | Edit draft | NOT_TESTED |
| `/dashboard/connections` | page | YES | GUEST_DENY | NOT_TESTED | Accept/decline | NOT_TESTED |
| `/dashboard/saved-jobs` | page | YES | GUEST_DENY | NOT_TESTED | Unsave | NOT_TESTED |
| `/dashboard/applications` | page | YES | GUEST_DENY | NOT_TESTED | Withdraw | NOT_TESTED |
| `/dashboard/rfqs` | page | YES | GUEST_DENY | NOT_TESTED buyer | List own RFQs | NOT_TESTED |
| `/dashboard/rfqs/:id` | page | YES | GUEST_DENY | NOT_TESTED buyer | Compare/close | NOT_TESTED |
| `/dashboard/quotes` | page | YES | GUEST_DENY | NOT_TESTED buyer | List quotes | NOT_TESTED |
| `/dashboard/blocked` | page | YES | GUEST_DENY | NOT_TESTED | Unblock | NOT_TESTED |
| `/dashboard/privacy` | page | YES | GUEST_DENY | NOT_TESTED | Export / delete request | NOT_TESTED |
| `/notifications` | page | YES | GUEST_DENY | NOT_TESTED recipient | Mark read | NOT_TESTED |
| `/notifications/preferences` | page | YES | GUEST_DENY | NOT_TESTED | Save prefs | NOT_TESTED |
| `/verification` | page | YES | GUEST_DENY | NOT_TESTED member | Submit request | NOT_TESTED |
| `/submit-publication` | page | YES | GUEST_DENY | NOT_TESTED author | Create draft | NOT_TESTED |
| `/my-library` | redirect | YES | Prior e2e → `/dashboard/publications` | GUEST_DENY | N/A | REDIRECT |
| `/my-library/:id` | redirect | YES | Prior e2e | GUEST_DENY | N/A | REDIRECT |
| `/company/dashboard` | page | YES | GUEST_DENY | NOT_TESTED company owner | Company ops | NOT_TESTED |
| `/supplier/catalog` | page | YES | GUEST_DENY | NOT_TESTED supplier | Upsert catalog | NOT_TESTED |
| `/supplier/quotes` | page | YES | GUEST_DENY | NOT_TESTED supplier | Submit/revise quote | NOT_TESTED |
| `/expert/consultations` | page | YES | GUEST_DENY | NOT_TESTED professional | Expert inbox | NOT_TESTED |
| `/admin` | page | YES | GUEST_DENY | NOT_TESTED admin | Hub | NOT_TESTED |
| `/admin/ops` | page | YES | GUEST_DENY | NOT_TESTED moderator | Hide/restore | NOT_TESTED |
| `/admin/verification` | page | YES | GUEST_DENY | NOT_TESTED reviewer | Approve/reject | NOT_TESTED |
| `/admin/marketplace` | page | YES | GUEST_DENY | NOT_TESTED reviewer | Approve/hide | NOT_TESTED |
| `/admin/publications` | page | YES | GUEST_DENY | NOT_TESTED staff | Queue | NOT_TESTED |
| `/admin/publications/:id` | page | YES | GUEST_DENY | NOT_TESTED staff | Request revision / publish | NOT_TESTED |
| `/admin/academy/:courseId` | page | YES | GUEST_DENY | NOT_TESTED admin | Legacy builder | NOT_TESTED |
| `/admin/events` | redirect | YES | Alias of ops | GUEST_DENY | N/A | REDIRECT |
| `/pricing` | redirect | YES | PLAYWRIGHT → `/` | N/A | N/A | REDIRECT |
| `/courses` | page | YES | PLAYWRIGHT | N/A public | Legacy page; Insights is canonical | PASS |
| `/learn` | redirect | YES | PLAYWRIGHT → `/insights` | N/A | N/A | REDIRECT |
| `/certificates` | redirect | YES | PLAYWRIGHT → `/insights` | N/A | N/A | REDIRECT |
| `/dashboard/jobs` | redirect | YES | → `/jobs` | GUEST_DENY | N/A | REDIRECT |
| `/dashboard/consultations` | redirect | YES | → `/consultations` | GUEST_DENY | N/A | REDIRECT |
| `/dashboard/events` | redirect | YES | → `/events` | GUEST_DENY | N/A | REDIRECT |
| `/company/jobs/:id/applications` | redirect | YES | → `/jobs` | GUEST_DENY | N/A | REDIRECT |

## Counts

- Router records inventoried: **88**
- Unique functional pages (not redirects): **73**
- Redirect / alias records: **15**
- Unique pages with guest functional evidence (Playwright/live public render): **31**
- Protected unique pages with guest-deny only: **30**
- Protected unique pages with authorized-role write evidence in this closeout: **0**
- Redirects verified as redirects: **15**

## Existing operations — local vs live

| Operation | Local isolated | Production live |
|---|---|---|
| Profile edit → save payload → reload same fields | UNIT `buildProfileSavePayload` / `profileViewFromPayload` | NOT run (would write a real profile) |
| Posts / comments / mentions / notifications / messaging | UNIT mention extract, idempotency, skip self-notify | NOT run (would notify real members) |
| Verification request + review | UNIT file allow-list + `review_verification` staff-only | NOT run |
| Scholarly draft, PDF sniff, submit, revision, approve, publish | UNIT visibility + `validateForPublish` + PDF magic + owner-scoped path | NOT run; existing private draft **not** published |
| RFQ create, supplier quote, revision, compare, close | UNIT status machine + private field strip; SQL_CONTRACT `phase8_rls_production_safe.sql` | NOT run |
| Admin hide / restore | UNIT `moderate_community` staff-only | NOT run |
| Cross-party denial (owner/company/supplier) | UNIT visibility + stripped quote fields; SQL_CONTRACT buyer_id spoof + competitor quote isolation | NOT run against live rows |

## Previous issues (High 8 / Medium 10 / Low 6)

These are the Phase 9 polish findings from PR #16 / merge `2b56a76`. “No critical leftover” in that report did **not** mean every High write-path was proven.

### High (8)

| ID | Issue | Fate | Evidence |
|---|---|---|---|
| H1 | Admin verification page hidden from hub | CLOSED | `/admin` links + guest deny |
| H2 | Admin publications page hidden from hub | CLOSED | `/admin` links + guest deny |
| H3 | Marketplace empty looked like loading | CLOSED | loading/empty/error copy + e2e |
| H4 | Dashboard tab/deep link lost after auth | CLOSED | `next=` + `?tab=` e2e |
| H5 | Footer missing marketplace / events / discover | CLOSED | footer e2e |
| H6 | Job cards linked `id` instead of slug | CLOSED | `job.slug \|\| job.id` |
| H7 | Notifications missing from user menu | CLOSED | Navbar item |
| H8 | Dashboard satellites reachable without `ProtectedRoute` | CLOSED | App.tsx wraps + guest deny |

Remaining High: **none of the original 8**. Authenticated write coverage for those pages is still NOT_TESTED.

### Medium (10)

| ID | Issue | Fate | Evidence |
|---|---|---|---|
| M1 | Connections showed raw user ids | CLOSED | `fetchProfileNames` |
| M2 | RFQ quotes table unusable on small screens | CLOSED | card layout |
| M3 | Dashboard `lang === "ar"` chrome | CLOSED | remaining user-facing copy moved to `dashboardTranslations`; locale codes kept |
| M4 | Member profile used `/books` `/research` links | CLOSED | canonical `/publications/:slug` |
| M5 | Admin marketplace i18n / loading | CLOSED | `admin.mp.*` |
| M6 | RFQ create double-submit | CLOSED | `busy` guard |
| M7 | Horizontal overflow on narrow viewports | CLOSED | `overflow-x: clip` + 320px e2e |
| M8 | Unsafe `next=` redirect | CLOSED | `safeInternalPath` unit + e2e |
| M9 | Lighthouse not recorded as 3-run mobile median | THIS CLOSEOUT | `scripts/lighthouse-phase9.mjs` → `docs/lighthouse/phase9-median.json` |
| M10 | Advisor 401 treated as inconclusive | THIS CLOSEOUT | recorded as BLOCKED, not a pass |

### Low (6)

| ID | Issue | Fate | Evidence |
|---|---|---|---|
| L1 | Capacitor/Vite audit leftovers | REMAINING (documented) | `docs/security/audit-allowlist.json` reviewed 2026-09-09; **not expanded** |
| L2 | Vercel Preview SSO-protected | REMAINING | Production smoke is the live check |
| L3 | Password-reset email skipped | REMAINING | platform policy |
| L4 | Cursor Security Reviewer pending on prior PRs | REMAINING | no completed reviewer notes on PR #16 |
| L5 | Some dates forced `en-US` | CLOSED | Dashboard webinars use `ar-SA` / `en-US` from `lang` |
| L6 | Auth write flows untested on Production | REMAINING | this closeout still has 0 authorized-role writes |

## Security

### Supabase Advisor

**BLOCKED.** `SUPABASE_ACCESS_TOKEN` is not present in this closeout environment. A previous Management API Advisor call returned **HTTP 401**. 401 means the Advisor check was **not executed**. It is not a security pass.

Required to unblock: an authorized Supabase Management token that can read Advisors for project `imucfofvdwfyexdwrsfe`, used once, never printed, never retried after 401.

### Cursor Security

No completed Cursor Security Review notes on the merged Phase 9 PR. Treated as **not available**, not as a pass.

### Sensitive RPCs (code review of applied migrations)

Granted to `authenticated` only (not a public write surface): `create_rfq`, `publish_rfq`, `close_rfq`, `submit_rfq_quote`, `decide_rfq_quote`, `compare_rfq_quotes`, `send_rfq_message`, `marketplace_file_access`, `apply_soft_delete`, `apply_restore`, `review_marketplace_item`.

`anon` may execute public listing helpers only (`list_public_suppliers`, `list_public_materials`, `get_public_*`, `marketplace_search`). Phase 8i/8j/8k revoke anon from sensitive file/RFQ RPCs.

Signed marketplace file URLs remain 120 seconds in `openMarketplaceFile`. Publication signed TTL default is 900 seconds.

### Audit allowlist

26 existing exceptions. Review date **2026-09-09**. No new advisory was added to pass CI. All listed items are development/transitive (`@capacitor/assets`, Vite 5 Windows `fs.deny`). None are claimed as production-bundle vulnerabilities.

## Performance

Recorded 2026-09-09 against Production **before** this closeout's hero/bundle patches.

Device: desktop Chrome driving Lighthouse **mobile** emulation. Throttling: Lighthouse default simulated Slow 4G. **TBT is a lab proxy, not INP.**

| Page | Perf | A11y | BP | SEO | LCP ms | CLS | TBT ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 61 | 90 | 96 | 100 | 4781 | 0 | 596 |
| `/publications` | 88 | 90 | 100 | 100 | 2942 | 0.004 | 104 |
| `/search` | 89 | 95 | 100 | 69 | 2899 | 0 | 150 |
| `/marketplace` | 90 | 90 | 100 | 100 | 2808 | 0 | 126 |
| `/discover` | 74 | 94 | 100 | 100 | 3324 | 0.166 | 289 |

Proven, not guessed:

- Homepage LCP is `/brand/flavor-expertise-science.webp`. Load delay + render delay dominate. Decorative `hero-flavor-lab.webp` had `fetchPriority=high` and stole priority. `blog-routes` (191 KiB) was statically imported on every first load.
- FlavorBot was **not** in bootup-time or third-party main-thread. `supabase.co` transfer only; `third_party_ms` null/0.
- `/search` SEO 69 is **`noindex` by design** (query URLs). Sitemap already excludes `/search`.
- Discover CLS 0.166 matches skeleton-to-cards swap without reserved height.

Fixes in this closeout (existing components only): lazy `BlogRoutes`, hero `fetchPriority` on the LCP logo, preload the logo, Discover 6-slot skeletons, named icon buttons, footer contrast, contact heading order.

## Canonical library

Unchanged: `/publications` is canonical. Reader URL `/books/:slug/chapters/:chapterSlug` stays.

## Role matrix

UI gates are early exits. Writes still depend on RLS. No PUBLIC/anon grant expansion in this closeout.

## Remaining blockers

- No authorized member/supplier/admin session for isolated local **or** Production writes.
- Advisor API unauthorized.
- Password-reset email remains skipped by policy.
- Vercel Preview remains SSO-protected.

Platform Completeness is **not PASS** while essential Advisor and authorized-role write checks stay BLOCKED or NOT_TESTED.
