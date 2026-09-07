# Phase 4 + Phase 5 — manual Supabase setup

Apply these files yourself. This repository does not push migrations to a live project.

**Do not apply on Production until Staging succeeds.**  
Production project ref `imucfofvdwfyexdwrsfe` is forbidden for these writes.

`supabase/tests/phase5_rls.sql` and `supabase/tests/phase5e_forum_mentions.sql` are **tests**, not migrations. Do not run them as schema.

## 1. Apply order

These files assume a database that already matches the pre-Phase-4 platform. Apply **only unused files**, in timestamp order.

### Phase 4

| File | Purpose |
|---|---|
| `supabase/migrations/20260902200000_phase4a_security_moderation.sql` | Roles, capabilities, reports, soft-delete columns, audit |
| `supabase/migrations/20260902210000_phase4b_network.sql` | Network, forum search, connections |
| `supabase/migrations/20260902220000_phase4c_professional.sql` | Professional records, jobs, events |
| `supabase/migrations/20260902300000_phase4d_readiness.sql` | Readiness helpers and remaining Phase 4 RPCs |

### Phase 5

| File | Purpose | Status in repo |
|---|---|---|
| `supabase/migrations/20260907100000_phase5a_event_notifications.sql` | Central emitter, recipient-only notifications, mention/comment tables | New vs Production |
| `supabase/migrations/20260907110000_phase5b_verification_workflow.sql` | Verification drafts, review RPC, private `verifications` policies | New vs Production |
| `supabase/migrations/20260907120000_phase5c_moderation_ops.sql` | Moderation actions, trash, restore | New vs Production |
| `supabase/migrations/20260907130000_phase5d_mentions.sql` | Mention search + validated writes for posts/comments | New vs Production |
| `supabase/migrations/20260907140000_phase5e_forum_mentions.sql` | Forum topic/reply mention tables and RPC support | New vs Production |
| `supabase/migrations/20260907150000_phase5f_hardening.sql` | Safe notification paths, verification path guard | New vs Production |

If Phase 4 is already applied on the target database, start at `20260907100000`. Do not re-run or edit an already-applied file.

## 2. Storage

Create bucket `verifications` if missing:

- **Private**
- No public read
- Paths must start with `{auth.uid()}/`
- Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`
- Max object size: 10 MB

Existing public buckets (`avatars`, community images, and similar) stay unchanged.

## 3. Auth URLs

Set these on the **Staging** project only. Replace the host with the Staging/Preview site.

- Site URL: `https://<staging-host>`
- Redirect URLs:
  - `https://<staging-host>/auth/callback`
  - `http://127.0.0.1:3001/auth/callback`
  - `http://localhost:3001/auth/callback`

Do not send real email. Keep the Phase 5 email adapter skipped.

## 4. Environment variable names only

Frontend / Preview:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`
- `VITE_FEATURE_PHASE5_WORKFLOWS`
- `VITE_PLATFORM_PRIVATE`
- `VITE_OAUTH_ENABLED`
- `VITE_PAYMENTS_ENABLED`

Server / Supabase only (never `VITE_*`):

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

## 5. How to apply from the SQL Editor

1. Open the **Staging** project (confirm the project ref is not Production).
2. Open SQL Editor.
3. Paste **one** migration file.
4. Run it.
5. Stop if any statement errors.
6. Continue with the next unused file only.

Wrap is already inside each file where functions replace safely. Do not combine Phase 5 files into one paste unless you are sure none of them have been applied.

## 6. Checks after each file

After Phase 4A: `platform_roles` exists.  
After Phase 5A: `select public.unread_notification_count();` works for a signed-in user.  
After Phase 5B: `verifications` policies exist; `submit_verification_request` exists.  
After Phase 5C: `list_moderation_queue` exists.  
After Phase 5D: `search_member_mentions` exists.  
After Phase 5E: `select public.phase5_workflows_ready();` is true and forum mention tables exist.  
After Phase 5F: `safe_app_path` exists; verification path trigger exists.

## 7. If something fails

1. Stop. Do not continue to the next file.
2. Do not edit the failed historical file.
3. Copy the error.
4. Leave Production untouched.
5. Add a new corrective migration later if needed.

A brand-new empty Staging database does not need an application backup before first apply. Take a restorable backup after the Phase 5 files succeed.

## 8. Tests to run after apply

Run these as SQL tests, not as migrations:

- `supabase/tests/phase5_rls.sql`
- `supabase/tests/phase5e_forum_mentions.sql`

Expected: `phase5_ready = true` and forum mention schema OK. The 20 authenticated RLS cases need synthetic Staging accounts.

## 9. Frontend env after apply

Point a Staging/Preview build at the Staging URL and anon key only. The build must not embed the Production project ref.
