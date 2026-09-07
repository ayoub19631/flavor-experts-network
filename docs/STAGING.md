# Staging environment

Production Supabase project ref `imucfofvdwfyexdwrsfe` is forbidden for migrations, write tests, and synthetic accounts.

## Guard

Before any `db push`, SQL write, Auth user create, or Storage write:

1. Read the target project ref.
2. If it equals `imucfofvdwfyexdwrsfe`, stop immediately.

## New Staging project

Create a separate project named `flavor-experts-network-staging` in the same organization, region `ap-southeast-1` (same region as production). Do not copy production user data.

A new empty Staging database does not need a prior application backup. After migrations succeed, take a first restorable backup.

## Auth and email

- Site URL and redirect URLs must point at the Staging/Preview host only.
- Do not send real email. Record email deliveries as skipped / mock.

## Frontend

Use `app/frontend/.env.staging.example`. The Staging build must not embed the production URL or project ref.
