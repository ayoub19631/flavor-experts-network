-- Platform completion: partners, forum, newsletter, notifications, courses,
-- consultations, email preferences, welcome emails, fixed ACK triggers.

-- ─── Helpers ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- ─── user_profiles email prefs ───────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT true;

-- ─── Partners ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partners_public_read ON public.partners;
CREATE POLICY partners_public_read ON public.partners
  FOR SELECT USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS partners_admin_all ON public.partners;
CREATE POLICY partners_admin_all ON public.partners
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── Newsletter ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'unsubscribed')),
  source text DEFAULT 'footer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_admin_all ON public.newsletter_subscribers;
CREATE POLICY newsletter_admin_all ON public.newsletter_subscribers
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Inserts only via service role / edge function

-- ─── Email logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipient text NOT NULL,
  subject text,
  resend_id text,
  status text NOT NULL DEFAULT 'sent',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_admin_read ON public.email_logs;
CREATE POLICY email_logs_admin_read ON public.email_logs
  FOR SELECT USING (public.is_platform_admin());

-- ─── In-app notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_own_update ON public.notifications;
CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── Forum ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  slug text NOT NULL UNIQUE,
  description text,
  description_ar text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  reply_count int NOT NULL DEFAULT 0,
  last_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_topics_category_idx ON public.forum_topics(category_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_replies_topic_idx ON public.forum_replies(topic_id, created_at);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_cat_read ON public.forum_categories;
CREATE POLICY forum_cat_read ON public.forum_categories
  FOR SELECT USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_cat_admin ON public.forum_categories;
CREATE POLICY forum_cat_admin ON public.forum_categories
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS forum_topics_read ON public.forum_topics;
CREATE POLICY forum_topics_read ON public.forum_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forum_categories c
      WHERE c.id = category_id AND (c.is_published = true OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS forum_topics_insert ON public.forum_topics;
CREATE POLICY forum_topics_insert ON public.forum_topics
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND auth.uid() IS NOT NULL
    AND public.is_email_verified()
  );

DROP POLICY IF EXISTS forum_topics_update_own ON public.forum_topics;
CREATE POLICY forum_topics_update_own ON public.forum_topics
  FOR UPDATE USING (auth.uid() = author_id OR public.is_platform_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_topics_delete ON public.forum_topics;
CREATE POLICY forum_topics_delete ON public.forum_topics
  FOR DELETE USING (auth.uid() = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_replies_read ON public.forum_replies;
CREATE POLICY forum_replies_read ON public.forum_replies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS forum_replies_insert ON public.forum_replies;
CREATE POLICY forum_replies_insert ON public.forum_replies
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND auth.uid() IS NOT NULL
    AND public.is_email_verified()
    AND NOT EXISTS (
      SELECT 1 FROM public.forum_topics t
      WHERE t.id = topic_id AND t.is_locked = true
    )
  );

DROP POLICY IF EXISTS forum_replies_update ON public.forum_replies;
CREATE POLICY forum_replies_update ON public.forum_replies
  FOR UPDATE USING (auth.uid() = author_id OR public.is_platform_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_platform_admin());

DROP POLICY IF EXISTS forum_replies_delete ON public.forum_replies;
CREATE POLICY forum_replies_delete ON public.forum_replies
  FOR DELETE USING (auth.uid() = author_id OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.bump_topic_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_topics
  SET reply_count = reply_count + 1,
      last_reply_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_topic_on_reply ON public.forum_replies;
CREATE TRIGGER trg_bump_topic_on_reply
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.bump_topic_on_reply();

-- ─── Courses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  level text DEFAULT 'beginner',
  duration_hours numeric DEFAULT 1,
  image_url text,
  is_published boolean NOT NULL DEFAULT true,
  premium boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_public_read ON public.courses;
CREATE POLICY courses_public_read ON public.courses
  FOR SELECT USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS courses_admin_all ON public.courses;
CREATE POLICY courses_admin_all ON public.courses
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── Consultation requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL,
  preferred_date text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultation_insert_auth ON public.consultation_requests;
CREATE POLICY consultation_insert_auth ON public.consultation_requests
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS consultation_own_read ON public.consultation_requests;
CREATE POLICY consultation_own_read ON public.consultation_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS consultation_admin_all ON public.consultation_requests;
CREATE POLICY consultation_admin_all ON public.consultation_requests
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─── Contact reply tracking ──────────────────────────────────────────────────
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- ─── Fix ACK triggers: always acknowledge submitter ──────────────────────────
CREATE OR REPLACE FUNCTION public.notify_contact_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  admin_email text := coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'admin_notify_email' LIMIT 1),
    'ayobe895@gmail.com'
  );
  safe_name text := replace(coalesce(NEW.name, ''), '<', '');
  safe_email text := replace(coalesce(NEW.email, ''), '<', '');
  safe_subject text := replace(coalesce(NEW.subject, ''), '<', '');
  safe_message text := replace(coalesce(NEW.message, ''), '<', '');
BEGIN
  PERFORM public.send_resend_email(
    admin_email,
    '[Contact] ' || coalesce(NEW.subject, 'New message'),
    '<p><strong>From:</strong> ' || safe_name || ' &lt;' || safe_email || '&gt;</p>'
      || '<p><strong>Subject:</strong> ' || safe_subject || '</p><pre style="white-space:pre-wrap">' || safe_message || '</pre>',
    'From: ' || NEW.name || ' <' || NEW.email || E'>\nSubject: ' || coalesce(NEW.subject, '') || E'\n\n' || NEW.message
  );

  -- Always send acknowledgment to the submitter
  PERFORM public.send_resend_email(
    NEW.email,
    'We received your message — Flavor Experts Network',
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f2744">'
      || '<h2 style="color:#0a3d6b">Thank you, ' || safe_name || '</h2>'
      || '<p>We received your message'
      || CASE WHEN NEW.subject IS NOT NULL AND NEW.subject <> '' THEN ' about <strong>' || safe_subject || '</strong>' ELSE '' END
      || '.</p><p>Our team will get back to you shortly.</p>'
      || '<p style="color:#6b7280;font-size:13px">— Flavor Experts Network</p></div>',
    'Hi ' || NEW.name || ', thank you for contacting Flavor Experts Network. We will get back to you shortly.'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_enterprise_request_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  admin_email text := coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'admin_notify_email' LIMIT 1),
    'ayobe895@gmail.com'
  );
  safe_company text := replace(coalesce(NEW.company_name, ''), '<', '');
  safe_contact text := replace(coalesce(NEW.contact_name, ''), '<', '');
  safe_email text := replace(coalesce(NEW.email, ''), '<', '');
  safe_message text := replace(coalesce(NEW.message, ''), '<', '');
BEGIN
  PERFORM public.send_resend_email(
    admin_email,
    '[Enterprise] ' || NEW.company_name,
    '<p><strong>Company:</strong> ' || safe_company || '</p>'
      || '<p><strong>Contact:</strong> ' || safe_contact || ' &lt;' || safe_email || '&gt;</p>'
      || '<pre style="white-space:pre-wrap">' || safe_message || '</pre>',
    'Company: ' || NEW.company_name || E'\nContact: ' || NEW.contact_name || ' <' || NEW.email || E'>\n\n' || coalesce(NEW.message, '')
  );

  PERFORM public.send_resend_email(
    NEW.email,
    'Enterprise request received — Flavor Experts Network',
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f2744">'
      || '<h2 style="color:#0a3d6b">Thank you, ' || safe_contact || '</h2>'
      || '<p>We received your enterprise inquiry for <strong>' || safe_company || '</strong>.</p>'
      || '<p>A specialist will contact you soon.</p>'
      || '<p style="color:#6b7280;font-size:13px">— Flavor Experts Network</p></div>',
    'We received your enterprise request for ' || NEW.company_name || '. A specialist will contact you soon.'
  );

  RETURN NEW;
END;
$$;

-- ─── Welcome email on new profile ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  safe_name text := replace(coalesce(NEW.full_name, split_part(NEW.email, '@', 1), 'Member'), '<', '');
  site_url text := 'https://flavorexpertsnetwork.com';
BEGIN
  IF NEW.welcome_email_sent = true THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public.send_resend_email(
    NEW.email,
    'Welcome to Flavor Experts Network',
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f2744">'
      || '<div style="background:linear-gradient(135deg,#0a3d6b,#0f2744);padding:28px;border-radius:12px 12px 0 0;color:#f5f0e6">'
      || '<h1 style="margin:0;font-size:22px">Welcome, ' || safe_name || '</h1>'
      || '<p style="margin:8px 0 0;opacity:.85">Flavor Experts Network</p></div>'
      || '<div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">'
      || '<p>Your account is ready. Explore industry news, educational resources, our community forum, and expert consultations.</p>'
      || '<p><a href="' || site_url || '/dashboard" style="display:inline-block;background:#0a3d6b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open your dashboard</a></p>'
      || '<p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not create this account, ignore this email.</p>'
      || '</div></div>',
    'Welcome to Flavor Experts Network, ' || safe_name || '! Visit ' || site_url || '/dashboard to get started.'
  );

  UPDATE public.user_profiles SET welcome_email_sent = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_welcome_email ON public.user_profiles;
CREATE TRIGGER trg_notify_welcome_email
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_email();

-- Consultation admin notify
CREATE OR REPLACE FUNCTION public.notify_consultation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  admin_email text := coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'admin_notify_email' LIMIT 1),
    'ayobe895@gmail.com'
  );
BEGIN
  PERFORM public.send_resend_email(
    admin_email,
    '[Consultation] ' || NEW.topic,
    '<p><strong>From:</strong> ' || replace(NEW.name, '<', '') || ' &lt;' || replace(NEW.email, '<', '') || '&gt;</p>'
      || '<p><strong>Topic:</strong> ' || replace(NEW.topic, '<', '') || '</p>'
      || '<p><strong>Preferred date:</strong> ' || replace(coalesce(NEW.preferred_date, '—'), '<', '') || '</p>'
      || '<pre style="white-space:pre-wrap">' || replace(NEW.message, '<', '') || '</pre>',
    'Consultation from ' || NEW.name || ' <' || NEW.email || '>: ' || NEW.topic || E'\n\n' || NEW.message
  );

  PERFORM public.send_resend_email(
    NEW.email,
    'Consultation request received — Flavor Experts Network',
    '<p>Hi ' || replace(NEW.name, '<', '') || ',</p><p>We received your consultation request about <strong>'
      || replace(NEW.topic, '<', '') || '</strong>. Our team will follow up soon.</p>',
    'We received your consultation request. Our team will follow up soon.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_consultation_email ON public.consultation_requests;
CREATE TRIGGER trg_notify_consultation_email
  AFTER INSERT ON public.consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_consultation_email();

-- Newsletter welcome
CREATE OR REPLACE FUNCTION public.notify_newsletter_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.send_resend_email(
      NEW.email,
      'Subscribed — Flavor Experts Network Newsletter',
      '<p>Thanks for subscribing to the Flavor Experts Network newsletter.</p><p>You will receive industry news, resources, and community updates.</p>',
      'Thanks for subscribing to the Flavor Experts Network newsletter.'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_newsletter_welcome ON public.newsletter_subscribers;
CREATE TRIGGER trg_notify_newsletter_welcome
  AFTER INSERT ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.notify_newsletter_welcome();

-- ─── Seed data ───────────────────────────────────────────────────────────────
INSERT INTO public.forum_categories (name, name_ar, slug, description, description_ar, sort_order)
VALUES
  ('Flavor Science', 'علم النكهات', 'flavor-science', 'Discuss chemistry, sensory science, and formulation.', 'ناقش الكيمياء والعلوم الحسية والصياغة.', 1),
  ('Industry News', 'أخبار الصناعة', 'industry-news', 'Share and discuss industry updates.', 'شارك وناقش مستجدات الصناعة.', 2),
  ('Career & Networking', 'المهنة والتواصل', 'career-networking', 'Jobs, mentorship, and professional growth.', 'وظائف وإرشاد ونمو مهني.', 3),
  ('General', 'عام', 'general', 'Open discussions for the community.', 'نقاشات مفتوحة للمجتمع.', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.partners (name, logo_url, website_url, description, is_featured, sort_order, is_published)
SELECT * FROM (VALUES
  ('Flavor Science Alliance', NULL::text, 'https://flavorexpertsnetwork.com', 'Strategic knowledge partner for sensory science.', true, 1, true),
  ('Food Tech Collective', NULL::text, 'https://flavorexpertsnetwork.com', 'Industry collaboration network.', false, 2, true),
  ('Sensory Labs Hub', NULL::text, 'https://flavorexpertsnetwork.com', 'Research and evaluation partner.', false, 3, true)
) AS v(name, logo_url, website_url, description, is_featured, sort_order, is_published)
WHERE NOT EXISTS (SELECT 1 FROM public.partners LIMIT 1);

INSERT INTO public.courses (title, title_ar, description, description_ar, level, duration_hours, premium, sort_order, is_published)
SELECT * FROM (VALUES
  ('Introduction to Flavor Chemistry', 'مقدمة في كيمياء النكهات', 'Core principles of aroma compounds and perception.', 'المبادئ الأساسية لمركبات الرائحة والإدراك.', 'beginner', 4::numeric, false, 1, true),
  ('Sensory Evaluation Methods', 'طرق التقييم الحسي', 'Panel design, discrimination tests, and descriptive analysis.', 'تصميم اللجان واختبارات التمييز والتحليل الوصفي.', 'intermediate', 6::numeric, false, 2, true),
  ('Advanced Formulation Studio', 'استوديو الصياغة المتقدم', 'Premium workshop on complex flavor systems.', 'ورشة متقدمة لأنظمة النكهات المعقدة.', 'advanced', 12::numeric, true, 3, true)
) AS v(title, title_ar, description, description_ar, level, duration_hours, premium, sort_order, is_published)
WHERE NOT EXISTS (SELECT 1 FROM public.courses LIMIT 1);
