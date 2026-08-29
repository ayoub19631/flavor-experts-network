-- Prevent company signup rollback when website is missing https://

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  parsed_name text;
  parsed_avatar text;
  parsed_linkedin text;
  parsed_account_type text;
  parsed_website text;
  parsed_phone text;
BEGIN
  PERFORM set_config('app.allow_account_type', '1', true);

  parsed_name := COALESCE(
    NULLIF(trim(meta->>'full_name'), ''),
    NULLIF(trim(meta->>'name'), ''),
    NULLIF(trim(COALESCE(meta->>'given_name', '') || ' ' || COALESCE(meta->>'family_name', '')), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  parsed_avatar := COALESCE(NULLIF(trim(meta->>'avatar_url'), ''), NULLIF(trim(meta->>'picture'), ''), '');

  parsed_linkedin := COALESCE(
    NULLIF(trim(meta->>'linkedin_url'), ''),
    CASE
      WHEN COALESCE(meta->>'profile', '') ILIKE '%linkedin.com%' THEN trim(meta->>'profile')
      ELSE NULL
    END,
    ''
  );

  parsed_account_type := CASE
    WHEN lower(COALESCE(meta->>'account_type', 'individual')) = 'company' THEN 'company'
    ELSE 'individual'
  END;

  parsed_website := COALESCE(
    NULLIF(trim(meta->>'website_url'), ''),
    NULLIF(trim(meta->>'website'), ''),
    ''
  );
  IF parsed_website <> '' AND parsed_website !~* '^https://' THEN
    parsed_website := 'https://' || regexp_replace(parsed_website, '^https?://', '', 'i');
  END IF;
  IF parsed_website <> '' AND parsed_website !~* '^https://' THEN
    parsed_website := '';
  END IF;

  parsed_phone := COALESCE(NULLIF(trim(meta->>'phone'), ''), '');

  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url,
    role, company, location, bio,
    account_type, linkedin_url, website_url, phone,
    subscription_tier, subscription_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    parsed_name,
    parsed_avatar,
    COALESCE(NULLIF(trim(meta->>'role'), ''), NULLIF(trim(meta->>'industry'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'company_name'), ''), NULLIF(trim(meta->>'company'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'location'), ''), ''),
    COALESCE(NULLIF(trim(meta->>'bio'), ''), ''),
    parsed_account_type,
    parsed_linkedin,
    NULLIF(parsed_website, ''),
    parsed_phone,
    'free',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
    avatar_url = CASE
      WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url
      ELSE user_profiles.avatar_url
    END,
    email = COALESCE(NULLIF(EXCLUDED.email, ''), user_profiles.email),
    company = CASE
      WHEN EXCLUDED.company <> '' THEN EXCLUDED.company
      ELSE user_profiles.company
    END,
    account_type = CASE
      WHEN EXCLUDED.account_type = 'company' THEN 'company'
      ELSE user_profiles.account_type
    END,
    website_url = CASE
      WHEN EXCLUDED.website_url IS NOT NULL AND EXCLUDED.website_url <> '' THEN EXCLUDED.website_url
      ELSE user_profiles.website_url
    END,
    phone = CASE
      WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone
      ELSE user_profiles.phone
    END,
    updated_at = now();

  RETURN NEW;
END;
$function$;
