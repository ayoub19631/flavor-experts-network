-- Harden SECURITY DEFINER grants + sync members directory from profiles

-- 1) Cron invoke must NOT be public
REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb) TO postgres;

-- 2) Trigger-only / helper RPCs — not for PostgREST clients
REVOKE ALL ON FUNCTION public.touch_social_post_likes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_social_post_likes() FROM anon;
REVOKE ALL ON FUNCTION public.touch_social_post_likes() FROM authenticated;

REVOKE ALL ON FUNCTION public.is_company_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_company_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_account() TO service_role;

-- Market briefing RPC: authenticated only (FlavorBot)
REVOKE ALL ON FUNCTION public.get_latest_market_briefing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_latest_market_briefing() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_latest_market_briefing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_market_briefing() TO service_role;

-- Prefer brand From address when Vault email_from missing
CREATE OR REPLACE FUNCTION public.send_resend_email(
  p_to text,
  p_subject text,
  p_html text,
  p_text text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  api_key text;
  request_id bigint;
  from_addr text;
BEGIN
  api_key := public.get_resend_api_key();
  IF api_key IS NULL OR length(api_key) < 10 THEN
    RAISE WARNING 'Resend API key missing in vault';
    RETURN NULL;
  END IF;

  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_from' LIMIT 1),
    'Flavor Experts Network <noreply@nexusflavor.com>'
  ) INTO from_addr;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', from_addr,
      'to', jsonb_build_array(p_to),
      'subject', p_subject,
      'html', p_html,
      'text', p_text
    )
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- 3) Sync public directory from user_profiles
CREATE OR REPLACE FUNCTION public.sync_member_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Soft-delete inactive users from directory
  IF COALESCE(NEW.is_active, true) = false THEN
    DELETE FROM public.members WHERE email = NEW.email;
    RETURN NEW;
  END IF;

  INSERT INTO public.members (
    full_name,
    email,
    role,
    specialty,
    linkedin_url,
    avatar_url,
    is_featured,
    title,
    company,
    location,
    bio,
    member_type,
    website,
    joined_at
  ) VALUES (
    COALESCE(NULLIF(trim(NEW.full_name), ''), split_part(NEW.email, '@', 1)),
    lower(trim(NEW.email)),
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
    -- email unique on members; if conflict on other constraints, skip
    RETURN NEW;
  WHEN undefined_column THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_from_profile ON public.user_profiles;
CREATE TRIGGER trg_sync_member_from_profile
  AFTER INSERT OR UPDATE OF full_name, email, role, company, location, bio,
    linkedin_url, website_url, avatar_url, account_type, is_admin, is_active
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_from_profile();

REVOKE ALL ON FUNCTION public.sync_member_from_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_member_from_profile() FROM anon;
REVOKE ALL ON FUNCTION public.sync_member_from_profile() FROM authenticated;

-- Ensure members.email is unique for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'members_email_key'
  ) THEN
    -- Clean duplicate emails first (keep earliest)
    DELETE FROM public.members m
    USING public.members m2
    WHERE m.email IS NOT NULL
      AND m.email = m2.email
      AND m.id > m2.id;

    BEGIN
      ALTER TABLE public.members ADD CONSTRAINT members_email_key UNIQUE (email);
    EXCEPTION WHEN others THEN
      CREATE UNIQUE INDEX IF NOT EXISTS members_email_unique_idx
        ON public.members (lower(email))
        WHERE email IS NOT NULL;
    END;
  END IF;
END $$;

-- Backfill directory from existing profiles
INSERT INTO public.members (
  full_name, email, role, linkedin_url, avatar_url, is_featured,
  title, company, location, bio, member_type, website, joined_at
)
SELECT
  COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1)),
  lower(trim(p.email)),
  COALESCE(NULLIF(trim(p.role), ''), 'Member'),
  NULLIF(trim(COALESCE(p.linkedin_url, '')), ''),
  NULLIF(trim(COALESCE(p.avatar_url, '')), ''),
  COALESCE(p.is_admin, false),
  NULLIF(trim(COALESCE(p.role, '')), ''),
  NULLIF(trim(COALESCE(p.company, '')), ''),
  NULLIF(trim(COALESCE(p.location, '')), ''),
  NULLIF(trim(COALESCE(p.bio, '')), ''),
  CASE WHEN p.account_type = 'company' THEN 'company' ELSE 'individual' END,
  NULLIF(trim(COALESCE(p.website_url, '')), ''),
  COALESCE(p.created_at, now())
FROM public.user_profiles p
WHERE p.email IS NOT NULL
  AND length(trim(p.email)) > 0
  AND COALESCE(p.is_active, true) = true
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  linkedin_url = EXCLUDED.linkedin_url,
  avatar_url = EXCLUDED.avatar_url,
  company = EXCLUDED.company,
  location = EXCLUDED.location,
  bio = EXCLUDED.bio,
  member_type = EXCLUDED.member_type,
  website = EXCLUDED.website;

-- 4) Seed professional starter forum topics (only if empty)
DO $$
DECLARE
  cat_career uuid;
  cat_tech uuid;
  cat_market uuid;
  admin_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.forum_topics LIMIT 1) THEN
    RETURN;
  END IF;

  SELECT id INTO cat_career FROM public.forum_categories WHERE slug = 'career-networking' LIMIT 1;
  SELECT id INTO cat_tech FROM public.forum_categories WHERE slug = 'flavor-science' LIMIT 1;
  SELECT id INTO cat_market FROM public.forum_categories WHERE slug = 'industry-news' LIMIT 1;
  SELECT id INTO admin_id FROM public.user_profiles WHERE is_admin = true ORDER BY created_at LIMIT 1;

  IF admin_id IS NULL OR cat_career IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.forum_topics (category_id, author_id, title, body, is_pinned)
  VALUES
    (
      cat_career,
      admin_id,
      'Welcome — introduce yourself to the Flavor Experts community',
      E'Welcome to Flavor Experts Network.\n\nShare a short introduction: your specialty (flavorist, sensory, QA, purchasing), region, and what you hope to learn or contribute.\n\nKeep it professional — this space is for industry peers.',
      true
    ),
    (
      COALESCE(cat_tech, cat_career),
      admin_id,
      'Natural vs nature-identical: how do you brief clients in 2026?',
      E'How do you explain the difference between natural and nature-identical aroma ingredients to brand/R&D teams without overselling either path?\n\nShare frameworks, labeling caveats (high-level), or common misconceptions you see in MENA / global projects.',
      false
    ),
    (
      COALESCE(cat_market, cat_career),
      admin_id,
      'Raw materials watchlist — what are you monitoring this quarter?',
      E'Which raw materials are on your radar (citrus oils, vanilla, menthol, cocoa notes, aroma chemicals)?\n\nShare qualitative trends only — no confidential pricing. Link observations to supply, freight, or regulatory context when possible.',
      false
    );
END $$;
