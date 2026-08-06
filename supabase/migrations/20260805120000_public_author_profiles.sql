-- Public-safe author profiles for forum + community enrichment.
-- Exposes only display fields (no email/phone/admin/tier).

CREATE OR REPLACE VIEW public.public_author_profiles AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  company,
  account_type
FROM public.user_profiles
WHERE COALESCE(is_active, true) = true;

GRANT SELECT ON public.public_author_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_author_profiles IS
  'Minimal public author fields for forum/community display. No PII beyond display name.';
