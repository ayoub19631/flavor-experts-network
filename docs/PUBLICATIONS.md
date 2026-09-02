# Publications library (Phase 3)

Professional books and technical research for Flavor Experts Network. This is not an academy and not a scientific journal.

## Apply locally (do not run on production yet)

```bash
# From the repo root, against a local or staging database only
npx supabase db push --local
# or
npx supabase migration up --local
```

Production apply requires an explicit owner approval after this report.

Migration file: `supabase/migrations/20260902120000_publications_library.sql`

## Environment

No new `VITE_*` secrets. The frontend continues to use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The `publications` storage bucket is private. Signed URLs are created at read/download time and are not stored as permanent links.

## Legacy Academy files

`lesson_resources` now accepts `storage_path` + `bucket_name`. `file_url` is kept for compatibility. Rows that still have only a URL are copied into `legacy_file_url_review` for manual mapping. Production currently has zero `lesson_resources` rows.

## First book

`Flavor Creation Fundamentals – Volume 1` is seeded as a **private draft** slug only. The final manuscript, authors, ISBN, cover, and PDF were not in the repository, so they were not invented.

## Safe publish checklist

1. Run frontend `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
2. Apply the migration on local/staging only.
3. Confirm a visitor cannot open the draft book.
4. Confirm an ordinary user cannot call `publish_publication`.
5. Get explicit approval before `npx supabase db push` on project `imucfofvdwfyexdwrsfe`.
6. Do not merge to `origin/main` until that approval.
