# Phase 4 implementation plan

Flavor Experts Network remains a free professional network. Phase 3 publications stay in place. No production migration or `main` publish in this branch.

## Identity source of truth

| Concern | Source | Compatibility |
|---|---|---|
| Login identity | `auth.users.id` | Never delete |
| Account/profile | `user_profiles.id = auth.users.id` | One profile per auth user |
| Public directory row | `member_directory_data` via `profile_id` | Overlay; deleting a directory row must not delete auth |
| Legacy `members` table | Separate directory IDs | Keep; do not assume `members.id = auth.users.id` |
| Public listing | `member_directory` view | No email/phone |
| Network graph | `member_connections`, `member_follows` | Keep pair uniqueness |

Production snapshot at planning time: 21 auth users, 19 profiles, 2 auth users without a profile (report only), 1 admin flag, 0 duplicate member emails. `members` rows do not share IDs with profiles.

## Delivery order

1. 4A roles, audit, soft delete, reports, blocks, mutes, notifications.
2. 4B community, profiles, verification, connections, messaging, forum, search.
3. 4C jobs, companies, enterprise, consultations, market, events.
4. 4D copy cleanup, dashboards, SEO/PWA/a11y/i18n, regression.

Public UI for a feature is shown only when its RLS helpers exist in code and the client degrades if the migration is not applied yet.
