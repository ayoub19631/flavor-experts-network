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
| Views | Replaced SECURITY DEFINER views with `security_invoker=true` over public-safe tables (`member_directory_data`, `author_profiles`) — see `20260809180000_fix_security_definer_views.sql` |

## Do not run

- Any deleted legacy `database/*.sql` bootstrap archive
- One-off SQL pasted from old chats — use `supabase/migrations/` only

## Apply

```bash
SUPABASE_ACCESS_TOKEN=... bash deploy/apply-platform-updates.sh
# or
npx supabase db query --linked -f supabase/migrations/20260809160000_database_hardening_complete.sql
```
