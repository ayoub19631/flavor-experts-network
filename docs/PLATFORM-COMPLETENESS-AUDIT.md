# Platform Completeness Audit — Phase 9

Inventory extracted from `app/frontend/src/App.tsx` and `app/frontend/src/lib/platform-routes.ts`.
No guessed product areas. Canonical library tree is `/publications` (`/books/:slug/chapters/:chapterSlug` stays the reader URL). Legacy `/library`, `/books`, `/research`, and `/my-library` redirect with query preservation.

Checks apply to existing pages only. Email delivery remains skipped. No payments, subscriptions, shipping, commission, or AI were added.

Legend: **PASS** already complete · **FIXED** corrected in Phase 9 · **BLOCKED** cannot complete without a new product feature or Production data.

| Route | Audience | UI access | Phone / Desktop | EN/AR | Light/Dark | Loading / Empty / Error | Permissions | Result |
|---|---|---|---|---|---|---|---|---|
| `/` | Public | Header logo | Pass | Pass | Pass | Pass | Public | PASS |
| `/welcome` | Public | Utility redirect | Pass | Pass | Pass | n/a | Public | PASS |
| `/auth` | Authentication | Header login / signup | Pass | Pass | Pass | Validation + error | Anon | PASS |
| `/verify-email` | Authentication | Post-signup / guard | Pass | Pass | Pass | Pass | Auth flow | PASS |
| `/email-verified` | Member | Email callback | Pass | Pass | Pass | Pass | Member | PASS |
| `/auth/callback` | Authentication | OAuth / magic link | Pass | Pass | Pass | Pass | Auth flow | PASS |
| `/auth/error` | Authentication | OAuth failure | Pass | Pass | Pass | Error | Auth flow | PASS |
| `/terms` | Public | Footer | Pass | Pass | Pass | Pass | Public | PASS |
| `/privacy` | Public | Footer | Pass | Pass | Pass | Pass | Public | PASS |
| `/enterprise` | Public | Explore + footer | Pass | Pass | Pass | Pass | Public | PASS |
| `/community` | Public | Header | Pass | Pass | Pass | Pass | Public read / member write | PASS |
| `/insights` | Public | Header | Pass | Pass | Pass | Pass | Public | PASS |
| `/publications` | Public | Header library | Pass | Pass | Pass | Pass | Public published only | PASS |
| `/publications/books` | Public | Explore + library links | Pass | Pass | Pass | Pass | Public | PASS |
| `/publications/research` | Public | Explore + library links | Pass | Pass | Pass | Pass | Public | PASS |
| `/publications/:slug` | Public | Cards / member profile | Pass | Pass | Pass | Not-found hides drafts | Public published | PASS |
| `/library` | Public | Legacy URL | Redirect | Pass | Pass | n/a | Public | FIXED |
| `/books` | Public | Legacy URL | Redirect | Pass | Pass | n/a | Public | FIXED |
| `/books/:slug` | Public | Legacy URL | Redirect | Pass | Pass | Drafts stay hidden | Public | FIXED |
| `/books/:slug/chapters/:chapterSlug` | Public | Book reader | Pass | Pass | Pass | Pass | Public published | PASS |
| `/research` | Public | Legacy URL | Redirect | Pass | Pass | n/a | Public | FIXED |
| `/research/:slug` | Public | Legacy URL | Redirect | Pass | Pass | Drafts stay hidden | Public | FIXED |
| `/policies` | Public | Footer + library | Pass | Pass | Pass | Pass | Public | PASS |
| `/policies/:slug` | Public | Policies list | Pass | Pass | Pass | Pass | Public | PASS |
| `/members` | Public | Header | Pass | Pass | Pass | Pass | Public directory | PASS |
| `/members/:id` | Public | Directory cards | Pass | Pass | Pass | Pass | Public profile | PASS |
| `/companies` | Public | Header | Pass | Pass | Pass | Pass | Public | PASS |
| `/companies/:slug` | Public | Directory cards | Pass | Pass | Pass | Pass | Public | PASS |
| `/jobs` | Public | Header | Pass | Pass | Pass | Pass | Public list / company post | FIXED |
| `/jobs/:slug` | Public | Job cards | Pass | Pass | Pass | Pass | Public + apply when signed in | PASS |
| `/forum` | Public | Header | Pass | Pass | Pass | Pass | Public read | PASS |
| `/forum/c/:slug` | Public | Forum | Pass | Pass | Pass | Pass | Public read | PASS |
| `/forum/t/:id` | Public | Forum | Pass | Pass | Pass | Pass | Public read | PASS |
| `/marketplace` | Public | Header + footer | Pass | Pass | Pass | Pass | Public hubs | PASS |
| `/marketplace/suppliers` | Public | Marketplace home | Pass | Pass | Pass | Loading / empty / error | Public approved | FIXED |
| `/marketplace/suppliers/:slug` | Public | Supplier cards | Pass | Pass | Pass | Loading / not-found | Public approved | FIXED |
| `/marketplace/materials` | Public | Marketplace home | Pass | Pass | Pass | Loading / empty / error | Public approved | FIXED |
| `/marketplace/materials/:slug` | Public | Material cards | Pass | Pass | Pass | Loading / not-found | Public approved | FIXED |
| `/marketplace/rfq` | Member | Marketplace CTA | Pass | Pass | Pass | Validation + busy | Member; RLS | FIXED |
| `/market` | Public | Header | Pass | Pass | Pass | Pass | Public | PASS |
| `/blog` | Public | Header + footer | Pass | Pass | Pass | Pass | Public | PASS |
| `/blog/:slug` | Public | Blog index | Pass | Pass | Pass | Pass | Public | PASS |
| `/consultations` | Public | Explore + dashboard + footer | Pass | Pass | Pass | Pass | Public | PASS |
| `/consultations/experts` | Public | Consultations | Pass | Pass | Pass | Pass | Public | PASS |
| `/consultations/experts/:id` | Public | Experts list | Pass | Pass | Pass | Pass | Public | PASS |
| `/events` | Public | Explore + dashboard + footer | Pass | Pass | Pass | Pass | Public | PASS |
| `/events/:slug` | Public | Events list | Pass | Pass | Pass | Pass | Public | PASS |
| `/discover` | Public | Explore + footer + mobile | Pass | Pass | Pass | Pass | Public | PASS |
| `/search` | Public | Header search | Pass | Pass | Pass | Pass | Public | PASS |
| `/messages` | Member | Header inbox | Pass | Pass | Pass | Pass | Member; RLS | PASS |
| `/dashboard` | Member | User menu | Pass | Pass | Pass | Pass | Member; tab query synced | FIXED |
| `/dashboard/publications` | Member | Dashboard sidebar | Pass | Pass | Pass | Pass | Owner | PASS |
| `/dashboard/publications/:id` | Member | Author library | Pass | Pass | Pass | Pass | Owner | PASS |
| `/dashboard/connections` | Member | Dashboard sidebar | Pass | Pass | Pass | Loading / empty / retry | Member | FIXED |
| `/dashboard/saved-jobs` | Member | Dashboard sidebar | Pass | Pass | Pass | Loading / empty / retry | Member | FIXED |
| `/dashboard/applications` | Member | Dashboard sidebar | Pass | Pass | Pass | Loading / empty / retry | Applicant | FIXED |
| `/dashboard/rfqs` | Member | Dashboard sidebar | Pass | Pass | Pass | Pass | Buyer | PASS |
| `/dashboard/rfqs/:id` | Member | RFQ list | Responsive cards | Pass | Pass | Loading / empty | Buyer; quotes private | FIXED |
| `/dashboard/quotes` | Member | Dashboard sidebar | Pass | Pass | Pass | Pass | Buyer | PASS |
| `/dashboard/blocked` | Member | Dashboard sidebar | Pass | Pass | Pass | Loading / empty | Member; block row only | FIXED |
| `/dashboard/privacy` | Member | Dashboard sidebar | Pass | Pass | Pass | Pass | Member; no hard delete | PASS |
| `/notifications` | Member | Bell + user menu | Pass | Pass | Pass | Pass | Recipient | FIXED |
| `/notifications/preferences` | Member | Notifications page | Pass | Pass | Pass | Pass | Recipient | PASS |
| `/verification` | Member | Dashboard sidebar | Pass | Pass | Pass | Pass | Member request | PASS |
| `/submit-publication` | Member | Library author CTA | Pass | Pass | Pass | Pass | Member | PASS |
| `/my-library` | Member | Legacy URL | Redirect | Pass | Pass | n/a | Member | FIXED |
| `/my-library/:id` | Member | Legacy URL | Redirect | Pass | Pass | n/a | Member | FIXED |
| `/company/dashboard` | Company | Dashboard when company | Pass | Pass | Pass | Pass | Company owner | PASS |
| `/supplier/catalog` | Supplier | Dashboard sidebar | Pass | Pass | Pass | Pass | Supplier owner | PASS |
| `/supplier/quotes` | Supplier | Dashboard sidebar | Pass | Pass | Pass | Pass | Supplier owner | PASS |
| `/expert/consultations` | Professional | Consultations signed-in | Pass | Pass | Pass | Pass | Member | PASS |
| `/admin` | Admin | User menu + dashboard | Pass | Pass | Pass | Pass | `is_admin` + RLS | PASS |
| `/admin/ops` | Moderator | Admin hub | Pass | Pass | Pass | Pass | `moderate_community` | PASS |
| `/admin/verification` | Reviewer | Admin hub | Pass | Pass | Pass | Pass | `review_verification` | FIXED |
| `/admin/marketplace` | Reviewer | Admin hub | Pass | Pass | Pass | Loading / empty | `review_marketplace` | FIXED |
| `/admin/publications` | Reviewer | Admin hub | Pass | Pass | Pass | Pass | Publications staff | FIXED |
| `/admin/publications/:id` | Reviewer | Publications admin | Pass | Pass | Pass | Pass | Staff | PASS |
| `/admin/academy/:courseId` | Admin | Admin courses | Pass | Pass | Pass | Pass | Admin | PASS |
| `/admin/events` | Moderator | Alias → ops | Pass | Pass | Pass | n/a | Moderator | PASS |
| `/pricing` | Public | Retired | Redirect home | n/a | n/a | n/a | Public | PASS |
| `/courses` | Public | Legacy academy page | Pass | Pass | Pass | Insights remains canonical | Public | PASS |
| `/learn` | Public | Legacy | Redirect `/insights` | n/a | n/a | n/a | Public | PASS |
| `/certificates` | Public | Legacy | Redirect `/insights` | n/a | n/a | n/a | Public | PASS |
| `/dashboard/jobs` | Member | Legacy | Redirect `/jobs` | n/a | n/a | n/a | Member | PASS |
| `/dashboard/consultations` | Member | Legacy | Redirect `/consultations` | n/a | n/a | n/a | Member | PASS |
| `/dashboard/events` | Member | Legacy | Redirect `/events` | n/a | n/a | n/a | Member | PASS |
| `/company/jobs/:id/applications` | Company | Legacy | Redirect `/jobs` | n/a | n/a | n/a | Company | PASS |

## Canonical library

| Legacy | Canonical |
|---|---|
| `/library` | `/publications` |
| `/books` | `/publications/books` |
| `/research` | `/publications/research` |
| `/books/:slug` | `/publications/:slug` |
| `/research/:slug` | `/publications/:slug` |
| `/my-library` | `/dashboard/publications` |
| `/my-library/:id` | `/dashboard/publications/:id` |

Reader URL `/books/:slug/chapters/:chapterSlug` is unchanged. Sitemap still lists `/library`, `/books`, and `/research`.

## Navigation changes

- Library nav stays active on `/library`, `/books`, `/research`, and `/policies`.
- Explore trigger stays active on discover / events / consultations / enterprise / books / research.
- Footer now includes Marketplace, Events, and Discover.
- User menu includes Notifications.
- Admin hub now links Verification and Publications review.
- Dashboard tabs write `?tab=` and restore it on back / refresh.
- Protected routes keep a safe `next=` return path after login.

## Role matrix (UI + server)

| Role | Sees |
|---|---|
| anon | Public hubs only; auth required for dashboard, messages, RFQ, admin |
| member | Dashboard, messages, notifications, RFQ create, author library |
| professional | Member surfaces + expert consultations |
| company owner | Company dashboard + job posting |
| supplier | Catalog and supplier quotes |
| reviewer | Capability-gated admin review pages |
| moderator | Ops / community moderation |
| admin / super_admin | Admin hub; RLS remains the authority |

UI gates are early exits. Writes still depend on Supabase RLS. No PUBLIC/anon expansion was added.

## Remaining known limits

- Live Lighthouse against Production may be pulled down by third-party analytics / fonts. Document the real blocker if a score misses the target.
- Vercel Preview is SSO-protected; Production smoke is the live check.
- Cursor Security Reviewer may stay pending, as on prior Phase PRs.
- Password-reset email stays skipped by platform policy.

## Counts

- Routes inventoried: **88**
- Phase 9 result for hidden-but-working pages: **FIXED** (admin verification / publications, footer hubs, notifications menu)
- Platform Completeness after Phase 9 work: **PASS** when CI, Production smoke, and no critical leftover defects
