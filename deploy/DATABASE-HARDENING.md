# Database hardening notes

## Applied by `20260809160000_database_hardening_complete.sql`

| Area | Fix |
|------|-----|
| Public RLS | `GRANT EXECUTE` on `is_platform_admin()` to `anon` |
| Jobs | Guests can count/read published open listings |
| Member sync | Trigger includes cover/skills/education/projects + backfill |
| Connections | Symmetric unique index + status transition trigger |
| Comments | Protect `comments_count`; lock comment identity / hide |
| Storage | Folder-scoped uploads (`avatars`, `community`, `covers`); drop permissive leftovers |
| SECURITY DEFINER | Revoke client EXECUTE on trigger helpers |
| Views | Pin `security_invoker = false` on directory/author views |

## Do not run

- `database/MASTER-SETUP.sql` on production
- Old permissive `database/STORAGE-ONLY-SETUP.sql` variants (file now hardened)
- `app/frontend/fix-rls.mjs` (exits with error)

## Apply

```bash
SUPABASE_ACCESS_TOKEN=... bash deploy/apply-platform-updates.sh
# or
npx supabase db query --linked -f supabase/migrations/20260809160000_database_hardening_complete.sql
```
