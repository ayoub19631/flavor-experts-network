-- Phase 4C — jobs, companies, enterprise, consultations, market, events
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS workplace_type text CHECK (workplace_type IN ('on_site', 'hybrid', 'remote')),
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS salary_min numeric,
  ADD COLUMN IF NOT EXISTS salary_max numeric,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_period text,
  ADD COLUMN IF NOT EXISTS application_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_listings_status_check') THEN
    ALTER TABLE public.job_listings DROP CONSTRAINT job_listings_status_check;
  END IF;
  ALTER TABLE public.job_listings
    ADD CONSTRAINT job_listings_status_check
    CHECK (status IN ('open', 'closed', 'draft', 'pending_review', 'published', 'paused', 'expired', 'rejected'));
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS job_listings_slug_idx ON public.job_listings(slug) WHERE slug IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_status_check') THEN
    ALTER TABLE public.job_applications DROP CONSTRAINT job_applications_status_check;
  END IF;
  ALTER TABLE public.job_applications
    ADD CONSTRAINT job_applications_status_check
    CHECK (status IN ('submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn', 'reviewed', 'accepted'));
EXCEPTION WHEN others THEN
  NULL;
END $$;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS resume_path text,
  ADD COLUMN IF NOT EXISTS resume_bucket text,
  ADD COLUMN IF NOT EXISTS company_notes text,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.job_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_members (
  company_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'recruiter', 'content_manager', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_requests
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new'
    CHECK (lead_status IN ('new', 'contacted', 'qualified', 'proposal', 'in_progress', 'completed', 'declined', 'archived')),
  ADD COLUMN IF NOT EXISTS assigned_admin uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;

CREATE TABLE IF NOT EXISTS public.consultation_experts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  topics text[] NOT NULL DEFAULT '{}',
  duration_minutes int NOT NULL DEFAULT 45,
  timezone text NOT NULL DEFAULT 'UTC',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES public.consultation_experts(user_id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'accepted', 'declined', 'reschedule_requested', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  meeting_url text,
  private_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  EXCLUDE USING gist (expert_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
    WHERE (status IN ('accepted', 'confirmed'))
);

CREATE TABLE IF NOT EXISTS public.market_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text,
  reliability text NOT NULL DEFAULT 'unverified'
);

CREATE TABLE IF NOT EXISTS public.market_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  unit text
);

CREATE TABLE IF NOT EXISTS public.market_price_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.market_materials(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.market_sources(id) ON DELETE SET NULL,
  country text,
  currency text,
  unit text,
  price_min numeric,
  price_max numeric,
  price_ref numeric,
  observation_date date,
  published_at timestamptz,
  reliability text NOT NULL DEFAULT 'unverified',
  notes text,
  is_published boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.market_watchlists (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.market_materials(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, material_id)
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('webinar', 'workshop', 'conference', 'networking', 'exhibition', 'online_discussion')),
  organizer text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'UTC',
  mode text NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'physical', 'hybrid')),
  location text,
  registration_url text,
  capacity int,
  language text NOT NULL DEFAULT 'en',
  cover_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  recording_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_jobs_own ON public.saved_jobs FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY job_alerts_own ON public.job_alerts FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY company_members_read ON public.company_members FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR company_id = (SELECT auth.uid()) OR public.is_platform_admin());
CREATE POLICY company_members_write ON public.company_members FOR ALL TO authenticated
  USING (company_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (company_id = (SELECT auth.uid()) OR public.is_platform_admin());
CREATE POLICY consultation_experts_public ON public.consultation_experts FOR SELECT TO anon, authenticated
  USING (is_published = true OR user_id = (SELECT auth.uid()) OR public.is_platform_admin());
CREATE POLICY consultation_bookings_own ON public.consultation_bookings FOR ALL TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR expert_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (requester_id = (SELECT auth.uid()) OR expert_id = (SELECT auth.uid()) OR public.is_platform_admin());
CREATE POLICY market_materials_read ON public.market_materials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY market_prices_read ON public.market_price_points FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.is_platform_admin());
CREATE POLICY market_watchlists_own ON public.market_watchlists FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY events_read ON public.events FOR SELECT TO anon, authenticated
  USING ((status = 'published' AND deleted_at IS NULL) OR public.is_platform_admin());
CREATE POLICY events_admin ON public.events FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY event_reg_own ON public.event_registrations FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (user_id = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('application-docs', 'application-docs', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false;
