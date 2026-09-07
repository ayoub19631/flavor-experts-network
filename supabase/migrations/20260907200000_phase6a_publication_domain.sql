-- Phase 6A — extend the existing publications domain.
-- Additive only. Do not edit 20260902120000_publications_library.sql.

DO $$
BEGIN
  IF to_regclass('public.publications') IS NULL THEN
    RAISE EXCEPTION 'Apply 20260902120000_publications_library.sql before Phase 6A.';
  END IF;
END $$;

ALTER TABLE public.publications
  ADD COLUMN IF NOT EXISTS publisher text,
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS doi_url text,
  ADD COLUMN IF NOT EXISTS edition text,
  ADD COLUMN IF NOT EXISTS page_count int,
  ADD COLUMN IF NOT EXISTS reading_minutes int,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS publication_date date,
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publications_type_check') THEN
    ALTER TABLE public.publications DROP CONSTRAINT publications_type_check;
  END IF;
  ALTER TABLE public.publications
    ADD CONSTRAINT publications_type_check CHECK (type IN (
      'book', 'original_research', 'review_article', 'technical_note',
      'industrial_case_study', 'formulation_study', 'sensory_study',
      'regulatory_update', 'white_paper', 'method_protocol',
      'technical_article', 'industry_report', 'guide'
    ));
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publications_status_check') THEN
    ALTER TABLE public.publications DROP CONSTRAINT publications_status_check;
  END IF;
  ALTER TABLE public.publications
    ADD CONSTRAINT publications_status_check CHECK (status IN (
      'draft', 'submitted', 'editorial_check', 'under_review',
      'revision_required', 'revision_requested', 'revised',
      'accepted', 'approved', 'scheduled', 'published',
      'rejected', 'corrected', 'retracted', 'archived'
    ));
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.publication_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'contributor' CHECK (role IN (
    'contributor', 'editor', 'translator', 'illustrator', 'advisor'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publication_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publication_related (
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  related_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, related_id),
  CHECK (publication_id <> related_id)
);

CREATE TABLE IF NOT EXISTS public.publication_settings (
  key text PRIMARY KEY,
  value_int int,
  value_text text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.publication_settings (key, value_int) VALUES
  ('cover_max_bytes', 5242880),
  ('pdf_max_bytes', 52428800),
  ('signed_url_ttl_seconds', 900)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS publication_contributors_pub_idx
  ON public.publication_contributors (publication_id);
CREATE INDEX IF NOT EXISTS publication_review_actions_pub_idx
  ON public.publication_review_actions (publication_id, created_at DESC);
CREATE INDEX IF NOT EXISTS publication_related_idx
  ON public.publication_related (related_id);

ALTER TABLE public.publication_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_related ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS publication_contributors_select ON public.publication_contributors;
CREATE POLICY publication_contributors_select ON public.publication_contributors
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

DROP POLICY IF EXISTS publication_contributors_write ON public.publication_contributors;
CREATE POLICY publication_contributors_write ON public.publication_contributors
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revision_requested', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revision_requested', 'revised')
    )
  );

DROP POLICY IF EXISTS publication_review_actions_select ON public.publication_review_actions;
CREATE POLICY publication_review_actions_select ON public.publication_review_actions
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR public.is_publication_reviewer()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS publication_related_select ON public.publication_related;
CREATE POLICY publication_related_select ON public.publication_related
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

DROP POLICY IF EXISTS publication_related_write ON public.publication_related;
CREATE POLICY publication_related_write ON public.publication_related
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_publication_editor())
  WITH CHECK (public.is_platform_admin() OR public.is_publication_editor());

DROP POLICY IF EXISTS publication_settings_select ON public.publication_settings;
CREATE POLICY publication_settings_select ON public.publication_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS publication_settings_admin ON public.publication_settings;
CREATE POLICY publication_settings_admin ON public.publication_settings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT ON public.publication_contributors, public.publication_related TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_contributors TO authenticated;
GRANT SELECT ON public.publication_review_actions, public.publication_settings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.publication_related TO authenticated;

CREATE OR REPLACE FUNCTION public.publication_is_public_status(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('published', 'corrected', 'retracted');
$$;

CREATE OR REPLACE FUNCTION public.publications_set_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_platform_admin() AND NOT public.is_publication_editor() THEN
      NEW.created_by := (SELECT auth.uid());
    ELSIF NEW.created_by IS NULL THEN
      NEW.created_by := (SELECT auth.uid());
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.created_by IS DISTINCT FROM OLD.created_by
    AND NOT public.is_platform_admin() THEN
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE SELECT ON TABLE public.publications FROM anon;
GRANT SELECT (
  id, type, slug, status, visibility, primary_language, title, subtitle, abstract, description,
  cover_image_path, license, doi, isbn, version_number, audience_level, application_area,
  regulatory_scope, keywords, is_featured, retraction_notice, correction_notice,
  created_by, published_by, created_at, updated_at, published_at, scheduled_at,
  publisher, institution, doi_url, edition, page_count, reading_minutes,
  publication_date, view_count, download_count, search_vector
) ON public.publications TO anon;

CREATE INDEX IF NOT EXISTS publications_view_count_idx
  ON public.publications (view_count DESC, published_at DESC);
