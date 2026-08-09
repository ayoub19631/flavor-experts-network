-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║          FLAVOR EXPERTS NETWORK — MASTER DATABASE SETUP v4              ║
-- ║      شبكة خبراء النكهات — الإعداد الشامل لقاعدة البيانات               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ⚠️  LEGACY / NEW PROJECTS ONLY — DO NOT RUN ON PRODUCTION
--     Production schema is owned by supabase/migrations/*.
--     Re-running this file can recreate permissive RLS/storage policies.
--     Use: npx supabase db push  OR  deploy/apply-platform-updates.sh
--
-- 🔗 Project: https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe
-- 📋 Bootstrap archive only (incomplete vs current migrations)
-- ✅ Historically used IF NOT EXISTS / OR REPLACE / ON CONFLICT
-- ⚠️  Run as: SQL Editor (has full privileges needed for policies & triggers)
--
-- WHAT THIS SCRIPT DOES:
--   1.  Creates all 6 tables with correct columns & indexes
--   2.  Creates signup trigger (auto-profile on new user)
--   3.  Enables RLS on all tables
--   4.  Sets correct public policies (SELECT/INSERT for everyone)
--   5.  Creates is_platform_admin() helper function
--   6.  Drops and recreates all admin policies (UPDATE/DELETE/full SELECT)
--   7.  Creates Supabase Storage bucket "platform-uploads"
--   8.  Sets storage policies (upload/read/delete)
--   9.  Grants admin role to ayoub@flavorexperts.net & talal@flavorexperts.net
--   10. Upgrades demo accounts to professional/enterprise for testing
--   11. Verifies everything with a final status report

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1.1 user_profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                  UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT        NOT NULL,
  full_name           TEXT        NOT NULL DEFAULT '',
  avatar_url          TEXT        DEFAULT '',
  subscription_tier   TEXT        NOT NULL DEFAULT 'free'
                                  CHECK (subscription_tier IN ('free','professional','enterprise')),
  subscription_active BOOLEAN     NOT NULL DEFAULT true,
  is_admin            BOOLEAN     NOT NULL DEFAULT false,
  -- Extended professional profile fields (v3)
  role                TEXT        DEFAULT '',
  company             TEXT        DEFAULT '',
  location            TEXT        DEFAULT '',
  bio                 TEXT        DEFAULT '',
  account_type        TEXT        DEFAULT 'individual'
                                  CHECK (account_type IN ('individual','company')),
  linkedin_url        TEXT        DEFAULT '',
  website_url         TEXT        DEFAULT '',
  phone               TEXT        DEFAULT '',
  is_verified         BOOLEAN     DEFAULT false,
  is_active           BOOLEAN     DEFAULT true,
  last_seen           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add v3 columns if they don't exist yet (safe migration)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role        TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS company     TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS location    TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio         TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS website_url  TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone        TEXT DEFAULT '';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_seen    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_up_email  ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_up_tier   ON public.user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_up_admin  ON public.user_profiles(is_admin) WHERE is_admin = true;


-- ── 1.2 members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.members (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name       TEXT        NOT NULL,
  email           TEXT        UNIQUE,
  role            TEXT        DEFAULT 'member',
  specialty       TEXT,
  linkedin_url    TEXT,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_url      TEXT,
  is_featured     BOOLEAN     DEFAULT false,
  -- Extended (v3)
  title           TEXT        DEFAULT '',
  company         TEXT        DEFAULT '',
  location        TEXT        DEFAULT '',
  bio             TEXT        DEFAULT '',
  member_type     TEXT        DEFAULT 'individual'
                              CHECK (member_type IN ('individual','company','expert')),
  years_experience INTEGER    DEFAULT 0,
  website         TEXT        DEFAULT ''
);

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS title            TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS company          TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location         TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS bio              TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS member_type      TEXT DEFAULT 'individual';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS website          TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_members_email      ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_featured   ON public.members(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_members_specialty  ON public.members(specialty);


-- ── 1.3 industry_news ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.industry_news (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL,
  content      TEXT,
  summary      TEXT,
  category     TEXT        DEFAULT 'general',
  image_url    TEXT,
  source_url   TEXT,
  author       TEXT        DEFAULT 'Flavor Experts Team',
  is_published BOOLEAN     DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_published  ON public.industry_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category   ON public.industry_news(category);
CREATE INDEX IF NOT EXISTS idx_news_is_pub     ON public.industry_news(is_published);


-- ── 1.4 educational_resources ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.educational_resources (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL,
  description  TEXT,
  type         TEXT        DEFAULT 'article',
  link         TEXT,
  category     TEXT        DEFAULT 'general',
  image_url    TEXT,
  premium      BOOLEAN     DEFAULT false,
  is_published BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_res_type     ON public.educational_resources(type);
CREATE INDEX IF NOT EXISTS idx_res_category ON public.educational_resources(category);
CREATE INDEX IF NOT EXISTS idx_res_premium  ON public.educational_resources(premium);
CREATE INDEX IF NOT EXISTS idx_res_is_pub   ON public.educational_resources(is_published);


-- ── 1.5 contact_messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT,
  message    TEXT        NOT NULL,
  status     TEXT        DEFAULT 'new'
                         CHECK (status IN ('new','read','replied','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_status  ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_msg_created ON public.contact_messages(created_at DESC);


-- ── 1.6 enterprise_requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enterprise_requests (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name        TEXT        NOT NULL,
  contact_name        TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  phone               TEXT,
  services_interested TEXT,
  message             TEXT,
  status              TEXT        DEFAULT 'new'
                                  CHECK (status IN ('new','contacted','converted','rejected')),
  -- Extended (v3)
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  company_size        TEXT        DEFAULT '',
  industry            TEXT        DEFAULT '',
  website             TEXT        DEFAULT '',
  contact_phone       TEXT        DEFAULT '',
  logo_url            TEXT        DEFAULT '',
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS company_size TEXT DEFAULT '';
ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS industry     TEXT DEFAULT '';
ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS website      TEXT DEFAULT '';
ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '';
ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS logo_url     TEXT DEFAULT '';
ALTER TABLE public.enterprise_requests ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ent_status  ON public.enterprise_requests(status);
CREATE INDEX IF NOT EXISTS idx_ent_created ON public.enterprise_requests(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: TRIGGER — Auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url,
    role, company, location, bio,
    account_type, linkedin_url, subscription_tier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             split_part(COALESCE(NEW.email,''), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual'),
    COALESCE(NEW.raw_user_meta_data->>'linkedin_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'subscription_tier', 'free')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: ROW LEVEL SECURITY — Enable on all tables
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_news      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_requests ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: ADMIN HELPER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

-- Returns true if the current user has is_admin = true in user_profiles
-- SECURITY DEFINER prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 5.1 user_profiles ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read_own_profile"    ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile"  ON public.user_profiles;
DROP POLICY IF EXISTS "users_select_own"          ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own"          ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_or_admin"   ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile"  ON public.user_profiles;
DROP POLICY IF EXISTS "users_insert_own"          ON public.user_profiles;

-- SELECT: own row OR admin
CREATE POLICY "profile_select"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id OR public.is_platform_admin());

-- INSERT: own row only (trigger also uses this)
CREATE POLICY "profile_insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: own row OR admin
CREATE POLICY "profile_update"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_platform_admin());

-- ── 5.2 members ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_read_members"   ON public.members;
DROP POLICY IF EXISTS "allow_insert_members" ON public.members;
DROP POLICY IF EXISTS "admin_update_members" ON public.members;
DROP POLICY IF EXISTS "admin_delete_members" ON public.members;

-- Anyone can read members
CREATE POLICY "members_select"
  ON public.members FOR SELECT USING (true);

-- Only authenticated users can submit (prevents anonymous spam)
CREATE POLICY "members_insert"
  ON public.members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admin can update / delete
CREATE POLICY "members_update"
  ON public.members FOR UPDATE USING (public.is_platform_admin());

CREATE POLICY "members_delete"
  ON public.members FOR DELETE USING (public.is_platform_admin());

-- ── 5.3 industry_news ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_read_news"   ON public.industry_news;
DROP POLICY IF EXISTS "allow_insert_news" ON public.industry_news;
DROP POLICY IF EXISTS "admin_update_news" ON public.industry_news;
DROP POLICY IF EXISTS "admin_delete_news" ON public.industry_news;

-- Public can read published articles; admin sees all
CREATE POLICY "news_select"
  ON public.industry_news FOR SELECT
  USING (is_published = true OR public.is_platform_admin());

-- Admin can insert
CREATE POLICY "news_insert"
  ON public.industry_news FOR INSERT
  WITH CHECK (public.is_platform_admin());

-- Admin can update
CREATE POLICY "news_update"
  ON public.industry_news FOR UPDATE
  USING (public.is_platform_admin());

-- Admin can delete
CREATE POLICY "news_delete"
  ON public.industry_news FOR DELETE
  USING (public.is_platform_admin());

-- ── 5.4 educational_resources ───────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_read_resources"   ON public.educational_resources;
DROP POLICY IF EXISTS "allow_insert_resources" ON public.educational_resources;
DROP POLICY IF EXISTS "admin_update_resources" ON public.educational_resources;
DROP POLICY IF EXISTS "admin_delete_resources" ON public.educational_resources;

CREATE POLICY "resources_select"
  ON public.educational_resources FOR SELECT
  USING (is_published = true OR public.is_platform_admin());

CREATE POLICY "resources_insert"
  ON public.educational_resources FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "resources_update"
  ON public.educational_resources FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "resources_delete"
  ON public.educational_resources FOR DELETE
  USING (public.is_platform_admin());

-- ── 5.5 contact_messages ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "allow_read_messages"   ON public.contact_messages;
DROP POLICY IF EXISTS "admin_update_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "admin_delete_messages" ON public.contact_messages;

-- Anyone can submit a contact message
CREATE POLICY "messages_insert"
  ON public.contact_messages FOR INSERT WITH CHECK (true);

-- Only admin can read messages
CREATE POLICY "messages_select"
  ON public.contact_messages FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "messages_update"
  ON public.contact_messages FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "messages_delete"
  ON public.contact_messages FOR DELETE
  USING (public.is_platform_admin());

-- ── 5.6 enterprise_requests ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_enterprise"  ON public.enterprise_requests;
DROP POLICY IF EXISTS "allow_read_enterprise"    ON public.enterprise_requests;
DROP POLICY IF EXISTS "admin_update_enterprise"  ON public.enterprise_requests;
DROP POLICY IF EXISTS "admin_delete_enterprise"  ON public.enterprise_requests;

-- Anyone can submit an enterprise request
CREATE POLICY "enterprise_insert"
  ON public.enterprise_requests FOR INSERT WITH CHECK (true);

-- Only admin can read / manage
CREATE POLICY "enterprise_select"
  ON public.enterprise_requests FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "enterprise_update"
  ON public.enterprise_requests FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "enterprise_delete"
  ON public.enterprise_requests FOR DELETE
  USING (public.is_platform_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: STORAGE BUCKET — platform-uploads
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-uploads',
  'platform-uploads',
  true,
  52428800,
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
DROP POLICY IF EXISTS "authenticated_upload"     ON storage.objects;
DROP POLICY IF EXISTS "public_read"              ON storage.objects;
DROP POLICY IF EXISTS "owner_update"             ON storage.objects;
DROP POLICY IF EXISTS "owner_or_admin_delete"    ON storage.objects;

CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'platform-uploads');

CREATE POLICY "storage_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'platform-uploads');

CREATE POLICY "storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'platform-uploads' AND auth.uid() = owner);

CREATE POLICY "storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (auth.uid() = owner OR public.is_platform_admin())
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: ADMIN ACCOUNTS & TEST DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Grant admin to platform founders & admin accounts
UPDATE public.user_profiles
  SET is_admin = true,
      is_verified = true,
      subscription_tier = 'enterprise',
      subscription_active = true
  WHERE email IN (
    'ayoub@flavorexperts.net',
    'talal@flavorexperts.net',
    'Ayobe895@gmail.com'
  );

-- Upgrade demo accounts for testing
UPDATE public.user_profiles
  SET subscription_tier = 'professional', subscription_active = true
  WHERE email = 'demo.user@flavorexperts.net';

UPDATE public.user_profiles
  SET subscription_tier = 'enterprise', subscription_active = true, account_type = 'company'
  WHERE email = 'demo.company@flavorexperts.net';

-- Grant admin to demo.user for testing admin panel
UPDATE public.user_profiles
  SET is_admin = true
  WHERE email = 'demo.user@flavorexperts.net';


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: SEED DATA (inserted only if tables are empty)
-- ═══════════════════════════════════════════════════════════════════════════

-- Members
INSERT INTO public.members (full_name, email, role, specialty, linkedin_url, avatar_url, is_featured)
SELECT * FROM (VALUES
  ('Talal Al Boushi',     'talal@flavorexperts.net',   'Founder & Senior Director',  'Strategic Leadership & Business Development', 'https://www.linkedin.com/in/talal-al-boushi',  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200', true),
  ('Ayoub Akbik',         'ayoub@flavorexperts.net',   'Founder & Flavor Science Expert','Food Technology & Flavor Science',          'https://www.linkedin.com/in/ayoub-akbik',      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', true),
  ('Dr. Sarah Chen',      'sarah.chen@example.com',    'Expert Member',              'Sensory Science & Consumer Research',         'https://linkedin.com/in/sarahchen',            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', false),
  ('Marco Rossi',         'marco.rossi@example.com',   'Expert Member',              'Natural Flavor Extraction',                   'https://linkedin.com/in/marcorossi',           'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', false),
  ('Dr. Fatima Al-Hassan','fatima@example.com',         'Research Lead',              'Flavor Chemistry & Molecular Gastronomy',     'https://linkedin.com/in/fatimaalhassan',        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200', false)
) AS v(full_name, email, role, specialty, linkedin_url, avatar_url, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM public.members LIMIT 1);

-- News (inserted only if news table is empty)
INSERT INTO public.industry_news (title, summary, content, category, image_url, source_url, author, published_at)
SELECT * FROM (VALUES
  ('Saudi Vision 2030 Drives 40% Surge in Food Tech Investment',
   'Saudi Arabia''s food technology sector is experiencing unprecedented growth, with investments reaching $2.4B in 2025.',
   'Saudi Arabia''s food technology ecosystem is undergoing a remarkable transformation driven by Vision 2030 initiatives. Private equity flows into the sector reached $2.4 billion in 2025.',
   'Market Trends','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
   'https://www.foodnavigator-asia.com','Flavor Experts Team', NOW() - INTERVAL '1 day'),

  ('New GCC Clean Label Regulations Effective 2026',
   'Gulf Cooperation Council introduces stricter requirements for natural flavoring declarations across all member states.',
   'The Gulf Cooperation Council has announced comprehensive clean label regulations that will take effect across all member states starting January 2026.',
   'Regulatory','https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
   'https://www.gulfnews.com','Regulatory Team', NOW() - INTERVAL '3 days'),

  ('AI-Powered Flavor Prediction Cuts R&D Time by 60%',
   'Leading flavor houses deploy machine learning models trained on 10M+ flavor combinations to accelerate innovation.',
   'The integration of artificial intelligence into flavor development workflows has reached a critical milestone. Major flavor houses are reporting R&D cycle reductions of up to 60%.',
   'Innovation','https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
   'https://www.foodtechconnect.com','Innovation Team', NOW() - INTERVAL '5 days'),

  ('Global Flavor Market Reaches $18.9B in 2025',
   'Industry report confirms strong growth trajectory with natural flavors accounting for 67% of all new product launches.',
   'The global flavor market has reached $18.9 billion in 2025, representing a 6.8% year-over-year growth. Natural flavors now dominate new product development.',
   'Market Trends','https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
   'https://www.foodingredientsfirst.com','Research Team', NOW() - INTERVAL '7 days'),

  ('Halal Flavor Innovation: New Standards for Global Markets',
   'Updated Halal certification framework creates new opportunities for flavor companies targeting Muslim-majority markets worldwide.',
   'A revised international Halal flavor certification framework is opening significant new market opportunities.',
   'Regulatory','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
   'https://www.halaljournal.com','Halal Desk', NOW() - INTERVAL '10 days'),

  ('MENA Beverage Market: Emerging Flavor Trends 2025-2026',
   'Functional beverages with regional flavors dominate consumer preference studies across UAE, KSA, and Egypt markets.',
   'Consumer preference studies across the Middle East and North Africa reveal a strong preference for functional beverages incorporating regional flavor profiles.',
   'Market Trends','https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800',
   'https://www.beveragedaily.com','MENA Research Team', NOW() - INTERVAL '12 days')
) AS v(title, summary, content, category, image_url, source_url, author, published_at)
WHERE NOT EXISTS (SELECT 1 FROM public.industry_news LIMIT 1);

-- Resources (inserted only if resources table is empty)
INSERT INTO public.educational_resources (title, description, type, link, category, image_url, premium, is_published)
SELECT * FROM (VALUES
  ('Fundamentals of Flavor Chemistry',
   'Comprehensive guide covering the chemical basis of taste and aroma perception, including key flavor compounds and their interactions.',
   'Course','https://www.coursera.org/learn/food-science',
   'Flavor Science','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600',false,true),

  ('Sensory Evaluation Methods in Food Science',
   'Learn professional sensory evaluation techniques: triangle tests, descriptive analysis, consumer panels.',
   'Guide','https://www.sciencedirect.com/topics/food-science/sensory-evaluation',
   'Sensory Science','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',false,true),

  ('Natural vs. Artificial Flavors: A Scientific Perspective',
   'In-depth analysis of regulatory, chemical, and consumer perception differences between natural and artificial flavoring.',
   'Article','https://www.ift.org/news-and-publications',
   'Regulatory','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600',false,true),

  ('Regulatory Compliance for Flavor Ingredients (EU & FDA)',
   'Complete guide to navigating EU and US regulatory frameworks for flavor ingredient approval and labeling.',
   'Whitepaper','https://www.fda.gov/food/food-ingredients-packaging',
   'Regulatory','https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600',false,true),

  ('Food Safety & Quality Management in Flavor Manufacturing',
   'Essential knowledge for flavor professionals on HACCP, GMP, and quality assurance protocols.',
   'Certification','https://www.fssc22000.com',
   'Quality & Safety','https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600',true,true),

  ('Emerging Trends in Beverage Flavoring (Premium)',
   'Explore the latest innovations in beverage flavor development — functional drinks, craft cocktails, reduced-sugar formulations.',
   'Webinar','https://www.beveragedaily.com',
   'Beverages','https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600',true,true),

  ('Introduction to Encapsulation Technology for Flavors',
   'Technical overview of microencapsulation and nanoencapsulation techniques to protect and deliver flavor compounds.',
   'Research Paper','https://www.sciencedirect.com/topics/food-science/microencapsulation',
   'Technology','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600',true,true),

  ('MENA Beverage Flavor Trends 2025-2030 (Premium Report)',
   'Exclusive market analysis covering flavor trends across GCC, Levant, and North Africa beverage markets.',
   'Research Paper','https://www.beveragedaily.com/trends',
   'Market Trends','https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600',true,true),

  ('Sensory Evaluation: A Practical Handbook',
   'Hands-on guide for setting up and running sensory panels in professional flavor evaluation settings.',
   'Guide','https://www.ift.org/sensory',
   'Sensory Science','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',false,true),

  ('Advanced Encapsulation Technologies (Premium)',
   'Deep-dive into cutting-edge encapsulation methods for heat-stable and release-on-demand flavor delivery.',
   'Course','https://www.encapsulation-tech.com',
   'Technology','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600',true,true),

  ('Halal Flavor Certification — Complete Guide',
   'Step-by-step certification guide covering JAKIM, ESMA, and MUI standards for flavor manufacturers.',
   'Whitepaper','https://www.halaljournal.com/certification',
   'Regulatory','https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600',false,true)
) AS v(title, description, type, link, category, image_url, premium, is_published)
WHERE NOT EXISTS (SELECT 1 FROM public.educational_resources LIMIT 1);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: VERIFICATION REPORT
-- ═══════════════════════════════════════════════════════════════════════════

-- Show table row counts
SELECT
  'user_profiles'         AS table_name, COUNT(*) AS rows FROM public.user_profiles
UNION ALL SELECT 'members',              COUNT(*) FROM public.members
UNION ALL SELECT 'industry_news',        COUNT(*) FROM public.industry_news
UNION ALL SELECT 'educational_resources',COUNT(*) FROM public.educational_resources
UNION ALL SELECT 'contact_messages',     COUNT(*) FROM public.contact_messages
UNION ALL SELECT 'enterprise_requests',  COUNT(*) FROM public.enterprise_requests
ORDER BY table_name;
