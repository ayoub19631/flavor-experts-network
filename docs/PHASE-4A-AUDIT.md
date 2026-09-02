# Phase 4A identity audit

Read-only production counts on `imucfofvdwfyexdwrsfe` during planning. No rows were deleted.

| Check | Count | Action |
|---|---|---|
| `auth.users` | 21 | Keep |
| `user_profiles` | 19 | Source of truth for signed-in members |
| Auth users without profile | 2 | Manual review; do not auto-create or delete |
| Profiles without auth | 0 | Healthy |
| `members` | 19 | Legacy directory; IDs are not auth IDs |
| `members` matched to profiles by email | review in staging | Compatibility layer uses email/`profile_id`, not member PK |
| `member_directory_data` | 19 | Public card data; join via `profile_id` |
| `author_profiles` | 19 | Public author projection |
| Duplicate member emails | 0 | Healthy |
| `is_admin = true` | 1 | Backfill to `super_admin` + `platform_admin` |

Do not treat `members` as the account table. Soft-deleting a directory card must not cascade to `auth.users`.
