# Phase 4 + Phase 5 — manual apply on the current database

Target: existing **Flavor Experts Network** Production project.  
Project ref: `imucfofvdwfyexdwrsfe`

This repository does not connect to Supabase and does not apply SQL. You paste files in the SQL Editor.

`supabase/tests/phase4_5_production_preflight.sql` and `supabase/tests/phase5_rls.sql` are **tests**, not migrations.

## Production apply path

### المرحلة الأولى — نسخة احتياطية

Take a current restorable backup from the Supabase dashboard before any Phase 4/5 file.

### المرحلة الثانية — Preflight

1. Open SQL Editor on this same project.
2. Paste `supabase/tests/phase4_5_production_preflight.sql`.
3. Run it. The result grid has four columns: `check_name`, `status`, `details`, `blocking`.
4. Copy the grid.

The preflight is read-only. It does not insert, update, delete, or change migration history. It does not delete orphan auth users.

### المرحلة الثالثة — توقف عند الفشل

Stop if any row has `status = FAIL` or `blocking = true`.

Typical blockers:

- Missing prerequisite tables (`user_profiles`, `notifications`, `forum_topics`, …)
- Duplicate `profile_slug`, job `slug`, or notification `idempotency_key`
- `verifications` bucket is public

Warnings (do not block by themselves):

- Phase 4/5 tables already present
- Orphan auth users (report only)
- Legacy `trg_notify_forum_reply_email`
- Missing `verifications` bucket (create it **Private**)
- 4A will add `member` / copy `is_admin` into `platform_roles` with `ON CONFLICT DO NOTHING` (additive)

### المرحلة الرابعة — تطبيق migrations واحدة تلو الأخرى

Apply **only files that are not already recorded**. Do not edit old files. Stop on the first error.

1. `supabase/migrations/20260902200000_phase4a_security_moderation.sql` — roles, audit, soft delete, reports  
2. `supabase/migrations/20260902210000_phase4b_network.sql` — network, mentions table, verification tables  
3. `supabase/migrations/20260902220000_phase4c_professional.sql` — jobs, events, market  
4. `supabase/migrations/20260902300000_phase4d_readiness.sql` — readiness helpers  
5. `supabase/migrations/20260907100000_phase5a_event_notifications.sql` — recipient-only notifications  
6. `supabase/migrations/20260907110000_phase5b_verification_workflow.sql` — verification RPC + private storage policies  
7. `supabase/migrations/20260907120000_phase5c_moderation_ops.sql` — moderation + trash  
8. `supabase/migrations/20260907130000_phase5d_mentions.sql` — mention search/write  
9. `supabase/migrations/20260907140000_phase5e_forum_mentions.sql` — forum mentions  
10. `supabase/migrations/20260907150000_phase5f_hardening.sql` — safe links + document path guard  
11. `supabase/migrations/20260907160000_phase5g_production_apply_guards.sql` — drop legacy forum email trigger, revoke client audit INSERT, force `verifications` private  

Create bucket `verifications` as **Private** if missing (before or right after 5B). Never make it public.

Auth Site URL / Redirect URLs stay on the live site host. Do not send real Phase 5 email; deliveries stay `skipped`.

### المرحلة الخامسة — اختبار RLS منفصل

Run `supabase/tests/phase5_rls.sql` as a **test**, not as schema.  
Optional: `supabase/tests/phase5e_forum_mentions.sql`.

### المرحلة السادسة — تحقق المنتج

Check sign-in, notification center, verification request, `/admin/ops`, and `/admin/verification`. Ordinary members must not open ops.

## Environment variable names only

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`
- `VITE_FEATURE_PHASE5_WORKFLOWS`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, never `VITE_*`)

## If a file fails

1. Stop.
2. Do not edit the failed historical file.
3. Keep the backup.
4. Add a new corrective migration later if needed.
