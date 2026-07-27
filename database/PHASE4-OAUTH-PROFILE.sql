-- Phase 4: Improve OAuth profile creation (Google + LinkedIn metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  provider text := COALESCE(NEW.raw_app_meta_data->>'provider', '');
  parsed_name text;
  parsed_avatar text;
  parsed_linkedin text;
  parsed_account_type text;
BEGIN
  parsed_name := COALESCE(
    meta->>'full_name',
    meta->>'name',
    NULLIF(trim(COALESCE(meta->>'given_name', '') || ' ' || COALESCE(meta->>'family_name', '')), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'User'
  );

  parsed_avatar := COALESCE(
    meta->>'avatar_url',
    meta->>'picture',
    ''
  );

  parsed_linkedin := COALESCE(
    meta->>'linkedin_url',
    meta->>'profile',
    CASE WHEN provider IN ('linkedin', 'linkedin_oidc') THEN meta->>'sub' ELSE '' END,
    ''
  );

  parsed_account_type := COALESCE(meta->>'account_type', 'individual');

  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url,
    role, company, location, bio,
    account_type, linkedin_url, subscription_tier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    parsed_name,
    parsed_avatar,
    COALESCE(meta->>'role', ''),
    COALESCE(meta->>'company_name', meta->>'company', ''),
    COALESCE(meta->>'location', ''),
    COALESCE(meta->>'bio', ''),
    parsed_account_type,
    parsed_linkedin,
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    avatar_url = CASE
      WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url
      ELSE user_profiles.avatar_url
    END,
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    updated_at = now();

  RETURN NEW;
END;
$$;
