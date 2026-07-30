-- Fix account completion: privilege defaults, richer handle_new_user, reliable members sync

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_platform_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.is_admin := false;
      NEW.platform_preview_access := false;
      -- Free accounts stay active; paid status is admin/webhook controlled
      NEW.subscription_active := true;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.is_admin := OLD.is_admin;
      NEW.platform_preview_access := OLD.platform_preview_access;
      NEW.subscription_active := OLD.subscription_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  parsed_name text;
  parsed_avatar text;
  parsed_linkedin text;
  parsed_account_type text;
  parsed_website text;
  parsed_phone text;
BEGIN
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
    parsed_website,
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
    account_type = COALESCE(EXCLUDED.account_type, user_profiles.account_type),
    website_url = CASE
      WHEN EXCLUDED.website_url <> '' THEN EXCLUDED.website_url
      ELSE user_profiles.website_url
    END,
    phone = CASE
      WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone
      ELSE user_profiles.phone
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_member_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_email text;
BEGIN
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  member_email := lower(trim(NEW.email));

  IF COALESCE(NEW.is_active, true) = false THEN
    DELETE FROM public.members WHERE lower(trim(email)) = member_email;
    RETURN NEW;
  END IF;

  INSERT INTO public.members (
    full_name, email, role, specialty, linkedin_url, avatar_url, is_featured,
    title, company, location, bio, member_type, website, joined_at
  ) VALUES (
    COALESCE(NULLIF(trim(NEW.full_name), ''), split_part(member_email, '@', 1)),
    member_email,
    COALESCE(NULLIF(trim(NEW.role), ''), 'Member'),
    NULL,
    NULLIF(trim(COALESCE(NEW.linkedin_url, '')), ''),
    NULLIF(trim(COALESCE(NEW.avatar_url, '')), ''),
    COALESCE(NEW.is_admin, false),
    NULLIF(trim(COALESCE(NEW.role, '')), ''),
    NULLIF(trim(COALESCE(NEW.company, '')), ''),
    NULLIF(trim(COALESCE(NEW.location, '')), ''),
    NULLIF(trim(COALESCE(NEW.bio, '')), ''),
    CASE WHEN NEW.account_type = 'company' THEN 'company' ELSE 'individual' END,
    NULLIF(trim(COALESCE(NEW.website_url, '')), ''),
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    linkedin_url = EXCLUDED.linkedin_url,
    avatar_url = EXCLUDED.avatar_url,
    is_featured = EXCLUDED.is_featured,
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    location = EXCLUDED.location,
    bio = EXCLUDED.bio,
    member_type = EXCLUDED.member_type,
    website = EXCLUDED.website;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN undefined_column THEN
    RETURN NEW;
END;
$$;
