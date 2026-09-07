# Phase 6 migration release

This document is the operator guide for Professional Publications migrations on Flavor Experts Network. It does not add product features. It records how the chain is ordered, how Production history was repaired, and how to create a new empty database without losing Production data.

Production project: `imucfofvdwfyexdwrsfe`.

## Correct apply order

Local files are applied in **filename timestamp order**. After Phase 6G that order is:

1. Historical platform files (`20260724` … `20260907180000`)
2. `20260902120000_publications_library.sql` — canonical library (safe search vector)
3. `20260907200000_phase6a_publication_domain.sql` — extends `public.publications`
4. `20260907201000_publications_library_immutable.sql` — idempotent copy of the library (no-op on a fresh database once step 2 succeeded)
5. `20260907210000_phase6b_review_workflow.sql`
6. `20260907220000_phase6d_publication_storage.sql`
7. `20260907230000_phase6e_citations_versions.sql`
8. `20260907240000_phase6f_publication_notifications.sql`
9. `20260907250000_phase6g_migration_hardening.sql` — advisor fixes only

Phase 6 dependencies:

| File | Requires | Creates / extends |
| --- | --- | --- |
| `20260902120000` | Academy `lesson_resources`, `user_profiles`, `auth`, `storage` | `publications` and library tables, private `publications` bucket |
| `20260907200000` | `public.publications` | contributors, review actions, related works, extra columns |
| `20260907201000` | `lesson_resources` | same library objects as `20260902120000` (`IF NOT EXISTS`) |
| `20260907210000` | `publications`, `publication_review_actions` | review / author RPCs |
| `20260907220000` | `publications`, `publication_files`, `publication_settings` | upload guards, bucket limits |
| `20260907230000` | `publications`, `publication_events` | citations, versions, related-work helpers |
| `20260907240000` | `publications`, `publication_staff`, `emit_event_notification` | in-app notification triggers |
| `20260907250000` | Phase 6 tables and RPCs | `search_path`, GRANT/REVOKE, FK indexes |

## Why Production order differed

On Production, `20260907201000` was applied **before** `20260907200000` because the original `20260902120000` file failed with `ERROR 42P17: generation expression is not immutable` (`to_tsvector(text, text)` / `array_to_string` are not immutable). Phase 6A raises if `public.publications` is missing, so the safe library had to exist first.

Filename order on disk was therefore unsafe:

- `20260902120000` (broken GENERATED column) would run first on a new database and abort
- `20260907200000` would run before `20260907201000` and abort if the library was missing

Production schema was **not** rewritten to match timestamps. History was aligned instead.

## Old file vs safe alternative

| Item | Detail |
| --- | --- |
| Old file | `20260902120000_publications_library.sql` with `search_vector tsvector GENERATED ALWAYS AS (to_tsvector(...))` |
| Why it was not applied | PostgreSQL rejected the generated expression |
| Safe alternative that **was** applied | `20260907201000_publications_library_immutable.sql` — plain `tsvector` columns plus `BEFORE INSERT OR UPDATE` triggers |
| Phase 6G local change | The never-applied old file was replaced with that same safe SQL. Editing it is allowed because it was never in `schema_migrations` |
| Files that must not be edited | Every already-applied migration, including `20260907200000`–`20260907240000` and `20260907201000` |

The applied helper `20260907201000` is kept so Production history stays honest. On a new database it is idempotent.

## Migration repair

Official CLI: `supabase migration repair --status applied <timestamp>`

That command inserts a row into `supabase_migrations.schema_migrations`. It does **not** run SQL and it does **not** change tables.

`20260902120000` was repaired as applied on Production because `20260907201000` already produced the equivalent library schema (tables, triggers, RLS, RPCs, bucket). Re-executing either file on Production is forbidden.

Older local files whose Dashboard timestamps differ (`20260724120000` vs `20260724105315`, and the rest listed in `supabase/approved-migration-history.json`) were also repaired as applied after confirming the remote name or the live objects already existed. Those repairs are history-only.

Do not repair a file whose SQL is not already reflected in the schema.

## How to create a new empty database

Do not create a new hosted Supabase project for this check. Use local Postgres.

```bash
python scripts/apply-fresh-migrations.py
```

That script:

1. Starts a temporary `postgres:17` container
2. Applies `supabase/tests/fresh_db/bootstrap.sql` (roles, `auth`, `storage`, `vault`, `cron`, `net` stubs)
3. Applies `supabase/tests/fresh_db/pre_phase6_tables.sql` (schema-only squash of pre-publication public tables, including PKs/uniques)
4. Applies `supabase/tests/fresh_db/bootstrap_functions.sql`
5. Applies the Phase 6 files in timestamp order: `20260902120000`, `20260907200000`, then `20260907210000`–`20260907250000`. `20260907201000` is skipped here because it is the Production-applied duplicate of `20260902120000` and its `CREATE POLICY` statements are not prefixed with `DROP POLICY IF EXISTS`. Do not edit that applied file. On Production it already ran once.

Earlier local files (`20260724`–`20260907180000`, including Phase 4/5 between the library file and 6A) are not replayed on a new database. They were written against a Dashboard-created schema, and their effect is already in the squash baseline. Replaying them on that baseline fails on missing Dashboard-only helpers such as `public.rls_auto_enable()` or `public.has_active_subscription()`. Production keeps those files and their repaired history rows.

Those three `fresh_db` files are **not** Production migrations. Never run them on `imucfofvdwfyexdwrsfe`.

## How to compare migration history

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Compare that list with `supabase/approved-migration-history.json` and with filenames in `supabase/migrations`.

- Every local filename version must exist in Production history after this release
- Production also has older Dashboard-only versions (`20260723192739`, academy draft splits, Phase 4/5 re-records). Leave them. Do not delete history rows
- `production_status` of `repaired_applied` means history was inserted without re-running SQL
- `production_status` of `applied` means the local file version was executed (or already matched)

CI runs `node scripts/check-migration-chain.mjs`. It fails when:

- timestamps are not strictly increasing
- a Phase 6 file requires a table first created by a later timestamp
- a local file is missing from the history lock
- an applied/immutable file hash changed without `documented_edit`
- the old non-immutable `GENERATED ALWAYS AS (to_tsvector` pattern returns

## Dry-run before deploy

From a linked CLI (this branch only; do not push or merge):

```bash
supabase db push --dry-run
```

After Phase 6G, that dry-run must not list pending local versions and must not propose drops. `--include-all` on `main` is still dangerous if a new unrecorded file is added.

## Safe rollback

There is no hard delete and no table drop.

- **Product rollback:** stop publishing; keep tables. Use `review_publication` / `archive_own_publication` / visibility. Do not `DROP TABLE`
- **6G grant rollback:** re-grant `EXECUTE` only if a needed RPC was revoked by mistake. Do not drop the new indexes
- **History rollback:** do not delete `schema_migrations` rows to “undo” a repair. That would make `db push` re-run SQL
- **PITR / physical backup:** use the existing Dashboard backup / WAL. Latest known Dashboard physical backup before Phase 6 was `2026-09-06T22:24:25Z`

## Files that must not be run by hand on Production

- The pre-6G copy of `20260902120000` that contained `GENERATED ALWAYS AS (to_tsvector`
- `supabase/tests/fresh_db/*.sql`
- `supabase/tests/phase5_rls.sql` (write cases; use `phase5_rls_production_safe.sql`)
- `supabase/tests/phase6_rls_production_safe.sql` is a `DO`/`RAISE` rollback test, not a migration
- Any already-recorded migration in `schema_migrations`
- Random Dashboard SQL that drops publications, users, Academy, or storage objects

## Seeded draft

Production has one library row: `flavor-creation-fundamentals-volume-1` (`draft` / `private`). Phase 6G does not modify it.
