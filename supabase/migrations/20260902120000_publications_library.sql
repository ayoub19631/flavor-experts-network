-- Phase 3 — Professional publications library (books + research)
-- Local / staging only until the product owner approves production apply.
-- Does not drop Academy tables, courses, users, posts, or catalog data.

-- ── Academy file locator compatibility (keep file_url) ───────────────────────
ALTER TABLE public.lesson_resources
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS bucket_name text;

ALTER TABLE public.lesson_resources
  ALTER COLUMN file_url DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lesson_resources_locator_check'
  ) THEN
    ALTER TABLE public.lesson_resources
      ADD CONSTRAINT lesson_resources_locator_check
      CHECK (file_url IS NOT NULL OR storage_path IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.legacy_file_url_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  file_url text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.legacy_file_url_review (source_table, source_id, file_url, notes)
SELECT
  'lesson_resources',
  id,
  file_url,
  'Possible signed or external URL. Do not auto-rewrite; map to storage_path manually.'
FROM public.lesson_resources
WHERE storage_path IS NULL
  AND file_url IS NOT NULL
  AND file_url <> ''
ON CONFLICT DO NOTHING;

-- ── Staff helpers (do not invent JWT roles; reuse is_admin + staff table) ────
CREATE TABLE IF NOT EXISTS public.publication_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('editor', 'reviewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.is_publication_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.publication_staff
      WHERE user_id = (SELECT auth.uid()) AND role = 'editor'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_publication_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publication_staff
    WHERE user_id = (SELECT auth.uid()) AND role = 'reviewer'
  );
$$;

-- ── Core publication record ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'book',
    'original_research',
    'review_article',
    'technical_note',
    'industrial_case_study',
    'formulation_study',
    'sensory_study',
    'regulatory_update',
    'white_paper',
    'method_protocol'
  )),
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'editorial_check',
    'under_review',
    'revision_required',
    'revised',
    'accepted',
    'scheduled',
    'published',
    'corrected',
    'retracted',
    'archived'
  )),
  visibility text NOT NULL DEFAULT 'members' CHECK (visibility IN ('public', 'members', 'private')),
  primary_language text NOT NULL DEFAULT 'en' CHECK (primary_language IN ('en', 'ar')),
  title text NOT NULL,
  subtitle text,
  abstract text,
  description text,
  cover_image_path text,
  license text,
  doi text,
  isbn text,
  version_number int NOT NULL DEFAULT 1,
  audience_level text CHECK (audience_level IN ('introductory', 'intermediate', 'advanced', 'specialist')),
  application_area text,
  regulatory_scope text,
  keywords text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  retraction_notice text,
  correction_notice text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  scheduled_at timestamptz,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(subtitle, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(abstract, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(keywords, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(application_area, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(regulatory_scope, '')), 'C')
  ) STORED,
  CONSTRAINT publications_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.publication_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'ar')),
  title text NOT NULL,
  subtitle text,
  abstract text,
  description text,
  body text,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title text,
  seo_description text,
  funding_statement text,
  conflict_of_interest text,
  data_availability text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(abstract, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'D')
  ) STORED,
  UNIQUE (publication_id, language)
);

CREATE TABLE IF NOT EXISTS public.publication_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  change_notes text,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (publication_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.publication_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  affiliation text,
  country text,
  orcid text,
  email text,
  author_order int NOT NULL DEFAULT 1,
  is_corresponding boolean NOT NULL DEFAULT false,
  contribution text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  slug text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  estimated_reading_minutes int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, slug)
);

CREATE TABLE IF NOT EXISTS public.book_chapter_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.book_chapters(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'ar')),
  title text NOT NULL,
  summary text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, language)
);

CREATE TABLE IF NOT EXISTS public.publication_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'publications',
  kind text NOT NULL CHECK (kind IN (
    'cover', 'full_pdf', 'chapter_pdf', 'supplementary', 'dataset', 'worksheet', 'figure', 'other'
  )),
  mime_type text,
  file_size bigint,
  language text CHECK (language IN ('en', 'ar')),
  is_downloadable boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'members' CHECK (visibility IN ('public', 'members', 'private')),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_name, storage_path)
);

CREATE TABLE IF NOT EXISTS public.publication_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  citation_text text,
  title text,
  authors text,
  journal_or_publisher text,
  publication_year int,
  doi text,
  url text
);

CREATE TABLE IF NOT EXISTS public.publication_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.publication_category_map (
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.publication_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.publication_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.publication_tag_map (
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.publication_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.publication_review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.book_chapters(id) ON DELETE SET NULL,
  progress_percent numeric(5,2) NOT NULL DEFAULT 0,
  last_position text,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, publication_id)
);

CREATE TABLE IF NOT EXISTS public.publication_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.book_chapters(id) ON DELETE CASCADE,
  position text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('view', 'read', 'download', 'bookmark', 'citation_export')),
  file_id uuid REFERENCES public.publication_files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_publications_status_visibility
  ON public.publications (status, visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_publications_type_published
  ON public.publications (type, published_at DESC)
  WHERE status IN ('published', 'corrected', 'retracted');
CREATE INDEX IF NOT EXISTS idx_publications_featured
  ON public.publications (published_at DESC)
  WHERE is_featured = true AND status IN ('published', 'corrected');
CREATE INDEX IF NOT EXISTS idx_publications_created_by
  ON public.publications (created_by);
CREATE INDEX IF NOT EXISTS idx_publications_search
  ON public.publications USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_publication_translations_search
  ON public.publication_translations USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_publication_authors_pub
  ON public.publication_authors (publication_id, author_order);
CREATE INDEX IF NOT EXISTS idx_publication_authors_name
  ON public.publication_authors (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_book_chapters_pub
  ON public.book_chapters (publication_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_publication_files_pub
  ON public.publication_files (publication_id);
CREATE INDEX IF NOT EXISTS idx_publication_files_path
  ON public.publication_files (bucket_name, storage_path);
CREATE INDEX IF NOT EXISTS idx_publication_refs_pub
  ON public.publication_references (publication_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user
  ON public.reading_progress (user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_publication_events_pub
  ON public.publication_events (publication_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publication_events_user
  ON public.publication_events (user_id, created_at DESC);

-- ── Audit + workflow guards ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publications_set_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.publications_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publications_audit ON public.publications;
CREATE TRIGGER trg_publications_audit
  BEFORE INSERT OR UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.publications_set_audit();

DROP TRIGGER IF EXISTS trg_publication_translations_audit ON public.publication_translations;
CREATE TRIGGER trg_publication_translations_audit
  BEFORE INSERT OR UPDATE ON public.publication_translations
  FOR EACH ROW EXECUTE FUNCTION public.publications_touch_updated_at();

DROP TRIGGER IF EXISTS trg_book_chapters_audit ON public.book_chapters;
CREATE TRIGGER trg_book_chapters_audit
  BEFORE INSERT OR UPDATE ON public.book_chapters
  FOR EACH ROW EXECUTE FUNCTION public.publications_touch_updated_at();

CREATE OR REPLACE FUNCTION public.publications_guard_workflow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allow text;
  is_admin boolean := public.is_platform_admin();
  is_editor boolean := public.is_publication_editor();
BEGIN
  allow := current_setting('publications.allow_published_edit', true);

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' AND NOT is_admin AND NOT is_editor THEN
      RAISE EXCEPTION 'Authors may only create draft publications.';
    END IF;
    IF NEW.status IN ('published', 'corrected', 'retracted') AND NOT is_admin THEN
      RAISE EXCEPTION 'Only admins can insert a published publication.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('published', 'corrected')
     AND COALESCE(allow, '') <> 'on'
     AND (
       NEW.title IS DISTINCT FROM OLD.title
       OR NEW.subtitle IS DISTINCT FROM OLD.subtitle
       OR NEW.abstract IS DISTINCT FROM OLD.abstract
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.doi IS DISTINCT FROM OLD.doi
       OR NEW.isbn IS DISTINCT FROM OLD.isbn
     )
  THEN
    RAISE EXCEPTION 'Published publications cannot be edited directly. Create a correction or new version.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('published', 'corrected', 'retracted', 'archived') AND NOT is_admin THEN
      RAISE EXCEPTION 'Only admins can publish, correct, retract, or archive.';
    END IF;
    IF NEW.status IN ('accepted', 'scheduled', 'editorial_check', 'under_review', 'revision_required')
       AND NOT is_admin AND NOT is_editor THEN
      RAISE EXCEPTION 'Only editors or admins can advance editorial workflow.';
    END IF;
    IF NEW.status IN ('submitted', 'revised')
       AND NOT is_admin
       AND NOT is_editor
       AND OLD.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the author can submit or mark a revision.';
    END IF;
    IF NEW.status = 'published' THEN
      NEW.published_at := COALESCE(NEW.published_at, now());
      NEW.published_by := COALESCE(NEW.published_by, auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publications_workflow ON public.publications;
CREATE TRIGGER trg_publications_workflow
  BEFORE INSERT OR UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.publications_guard_workflow();

-- ── Readability helper used by RLS ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publication_is_assigned_reviewer(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.publication_review_assignments
    WHERE publication_id = p_id
      AND reviewer_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.publication_row_readable(
  p_status text,
  p_visibility text,
  p_created_by uuid,
  p_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR p_created_by = (SELECT auth.uid())
    OR public.publication_is_assigned_reviewer(p_id)
    OR (
      p_status IN ('published', 'corrected', 'retracted')
      AND (
        p_visibility = 'public'
        OR (p_visibility = 'members' AND (SELECT auth.uid()) IS NOT NULL)
      )
    );
$$;

-- ── RPCs ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_publication(p_id uuid)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
BEGIN
  SELECT * INTO rec FROM public.publications WHERE id = p_id;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF rec.created_by IS DISTINCT FROM auth.uid()
     AND NOT public.is_platform_admin()
     AND NOT public.is_publication_editor() THEN
    RAISE EXCEPTION 'Not allowed to submit this publication.';
  END IF;
  IF rec.status NOT IN ('draft', 'revision_required', 'revised') THEN
    RAISE EXCEPTION 'Publication cannot be submitted from the current status.';
  END IF;
  UPDATE public.publications
  SET status = 'submitted'
  WHERE id = p_id
  RETURNING * INTO rec;
  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_publication_version(p_id uuid, p_notes text DEFAULT NULL)
RETURNS public.publication_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
  ver public.publication_versions;
  next_no int;
BEGIN
  IF NOT public.is_platform_admin() AND NOT public.is_publication_editor() THEN
    RAISE EXCEPTION 'Not allowed to snapshot versions.';
  END IF;
  SELECT * INTO rec FROM public.publications WHERE id = p_id;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_no
  FROM public.publication_versions WHERE publication_id = p_id;
  INSERT INTO public.publication_versions (
    publication_id, version_number, status, change_notes, snapshot_data, created_by, published_at
  ) VALUES (
    p_id,
    next_no,
    rec.status,
    p_notes,
    jsonb_build_object(
      'title', rec.title,
      'subtitle', rec.subtitle,
      'abstract', rec.abstract,
      'description', rec.description,
      'status', rec.status,
      'visibility', rec.visibility,
      'version_number', rec.version_number
    ),
    auth.uid(),
    CASE WHEN rec.status IN ('published', 'corrected') THEN now() ELSE NULL END
  )
  RETURNING * INTO ver;
  RETURN ver;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_publication(p_id uuid, p_notes text DEFAULT NULL)
RETURNS public.publications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.publications;
  author_count int;
  chapter_count int;
  category_count int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only admins can publish publications.';
  END IF;
  SELECT * INTO rec FROM public.publications WHERE id = p_id FOR UPDATE;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'Publication not found.';
  END IF;
  IF length(trim(rec.title)) < 3 OR rec.slug IS NULL OR rec.type IS NULL OR rec.primary_language IS NULL THEN
    RAISE EXCEPTION 'Title, slug, type, and language are required before publishing.';
  END IF;
  IF coalesce(rec.abstract, rec.description, '') = '' THEN
    RAISE EXCEPTION 'Abstract or description is required before publishing.';
  END IF;
  SELECT count(*) INTO author_count FROM public.publication_authors WHERE publication_id = p_id;
  IF author_count < 1 THEN
    RAISE EXCEPTION 'At least one author is required before publishing.';
  END IF;
  SELECT count(*) INTO category_count FROM public.publication_category_map WHERE publication_id = p_id;
  IF category_count < 1 THEN
    RAISE EXCEPTION 'At least one category is required before publishing.';
  END IF;
  IF rec.type = 'book' THEN
    IF rec.cover_image_path IS NULL OR rec.cover_image_path = '' THEN
      RAISE EXCEPTION 'A cover image is required before publishing a book.';
    END IF;
    SELECT count(*) INTO chapter_count
    FROM public.book_chapters
    WHERE publication_id = p_id;
    IF chapter_count < 1 THEN
      RAISE EXCEPTION 'At least one chapter is required before publishing a book.';
    END IF;
  END IF;

  PERFORM public.snapshot_publication_version(p_id, coalesce(p_notes, 'Published'));
  PERFORM set_config('publications.allow_published_edit', 'on', true);
  UPDATE public.publications
  SET
    status = 'published',
    published_at = coalesce(published_at, now()),
    published_by = auth.uid()
  WHERE id = p_id
  RETURNING * INTO rec;
  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_publications(
  p_query text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  type text,
  slug text,
  title text,
  abstract text,
  primary_language text,
  published_at timestamptz,
  rank real
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  q tsquery;
BEGIN
  BEGIN
    IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
      q := NULL;
    ELSE
      q := websearch_to_tsquery('simple', trim(p_query));
    END IF;
  EXCEPTION WHEN others THEN
    q := plainto_tsquery('simple', trim(p_query));
  END;

  RETURN QUERY
  SELECT
    p.id,
    p.type,
    p.slug,
    p.title,
    p.abstract,
    p.primary_language,
    p.published_at,
    CASE
      WHEN q IS NULL THEN 0::real
      ELSE ts_rank(p.search_vector, q) + coalesce(ts_rank(t.search_vector, q), 0)
    END AS rank
  FROM public.publications p
  LEFT JOIN public.publication_translations t
    ON t.publication_id = p.id
   AND (p_language IS NULL OR t.language = p_language)
  WHERE (q IS NULL OR p.search_vector @@ q OR t.search_vector @@ q
         OR EXISTS (
           SELECT 1 FROM public.publication_authors a
           WHERE a.publication_id = p.id
             AND a.full_name ILIKE '%' || trim(p_query) || '%'
         ))
    AND (p_type IS NULL OR p.type = p_type)
    AND (p_language IS NULL OR p.primary_language = p_language OR t.language = p_language)
    AND (p_category IS NULL OR EXISTS (
      SELECT 1
      FROM public.publication_category_map m
      JOIN public.publication_categories c ON c.id = m.category_id
      WHERE m.publication_id = p.id AND c.slug = p_category
    ))
  ORDER BY rank DESC NULLS LAST, p.published_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(coalesce(p_limit, 12), 1), 50)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_publication_event(
  p_publication_id uuid,
  p_event_type text,
  p_file_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_type NOT IN ('view', 'read', 'download', 'bookmark', 'citation_export') THEN
    RAISE EXCEPTION 'Unsupported event type.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.publications p
    WHERE p.id = p_publication_id
      AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to record an event for this publication.';
  END IF;
  INSERT INTO public.publication_events (publication_id, user_id, event_type, file_id)
  VALUES (p_publication_id, auth.uid(), p_event_type, p_file_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_reading_progress(
  p_publication_id uuid,
  p_chapter_id uuid DEFAULT NULL,
  p_progress_percent numeric DEFAULT 0,
  p_last_position text DEFAULT NULL
)
RETURNS public.reading_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.reading_progress;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required to save reading progress.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.publications p
    WHERE p.id = p_publication_id
      AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to save progress for this publication.';
  END IF;
  INSERT INTO public.reading_progress (
    user_id, publication_id, chapter_id, progress_percent, last_position, last_read_at
  ) VALUES (
    auth.uid(), p_publication_id, p_chapter_id, GREATEST(LEAST(p_progress_percent, 100), 0), p_last_position, now()
  )
  ON CONFLICT (user_id, publication_id) DO UPDATE
  SET
    chapter_id = COALESCE(EXCLUDED.chapter_id, public.reading_progress.chapter_id),
    progress_percent = GREATEST(public.reading_progress.progress_percent, EXCLUDED.progress_percent),
    last_position = COALESCE(EXCLUDED.last_position, public.reading_progress.last_position),
    last_read_at = now()
  RETURNING * INTO rec;
  RETURN rec;
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.publication_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chapter_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_file_url_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_staff_admin ON public.publication_staff
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY publications_select ON public.publications
  FOR SELECT TO anon, authenticated
  USING (public.publication_row_readable(status, visibility, created_by, id));

CREATE POLICY publications_insert ON public.publications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR (created_by = (SELECT auth.uid()) AND status = 'draft')
  );

CREATE POLICY publications_update ON public.publications
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR (
      created_by = (SELECT auth.uid())
      AND status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR (
      created_by = (SELECT auth.uid())
      AND status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  );

CREATE POLICY publications_delete ON public.publications
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR (created_by = (SELECT auth.uid()) AND status = 'draft')
  );

CREATE POLICY publication_translations_select ON public.publication_translations
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

CREATE POLICY publication_translations_write ON public.publication_translations
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  );

CREATE POLICY publication_versions_select ON public.publication_versions
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY publication_versions_write ON public.publication_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR public.is_publication_editor());

CREATE POLICY publication_authors_select ON public.publication_authors
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

CREATE POLICY publication_authors_write ON public.publication_authors
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  );

CREATE POLICY book_chapters_select ON public.book_chapters
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

CREATE POLICY book_chapters_write ON public.book_chapters
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  );

CREATE POLICY book_chapter_translations_select ON public.book_chapter_translations
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.book_chapters c
      JOIN public.publications p ON p.id = c.publication_id
      WHERE c.id = chapter_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

CREATE POLICY book_chapter_translations_write ON public.book_chapter_translations
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1
      FROM public.book_chapters c
      JOIN public.publications p ON p.id = c.publication_id
      WHERE c.id = chapter_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1
      FROM public.book_chapters c
      JOIN public.publications p ON p.id = c.publication_id
      WHERE c.id = chapter_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  );

CREATE POLICY publication_files_select ON public.publication_files
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
        AND (
          visibility = 'public'
          OR (visibility = 'members' AND (SELECT auth.uid()) IS NOT NULL)
          OR visibility = 'private' AND (
            public.is_platform_admin()
            OR p.created_by = (SELECT auth.uid())
            OR uploaded_by = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY publication_files_write ON public.publication_files
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR uploaded_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY publication_references_select ON public.publication_references
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );

CREATE POLICY publication_references_write ON public.publication_references
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status IN ('draft', 'submitted', 'revision_required', 'revised')
    )
  );

CREATE POLICY publication_categories_select ON public.publication_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY publication_categories_write ON public.publication_categories
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY publication_tags_select ON public.publication_tags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY publication_tags_write ON public.publication_tags
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY publication_category_map_select ON public.publication_category_map
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );
CREATE POLICY publication_category_map_write ON public.publication_category_map
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY publication_tag_map_select ON public.publication_tag_map
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
    )
  );
CREATE POLICY publication_tag_map_write ON public.publication_tag_map
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_id AND p.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY publication_review_assignments_select ON public.publication_review_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_publication_editor()
    OR reviewer_id = (SELECT auth.uid())
  );
CREATE POLICY publication_review_assignments_write ON public.publication_review_assignments
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR public.is_publication_editor())
  WITH CHECK (public.is_platform_admin() OR public.is_publication_editor());

CREATE POLICY reading_progress_own ON public.reading_progress
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY publication_bookmarks_own ON public.publication_bookmarks
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY publication_events_insert ON public.publication_events
  FOR INSERT TO authenticated, anon
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY publication_events_select ON public.publication_events
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

CREATE POLICY legacy_file_url_review_admin ON public.legacy_file_url_review
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Hide author emails from the anonymous public API.
REVOKE ALL ON TABLE public.publication_authors FROM anon;
GRANT SELECT (
  id, publication_id, profile_id, full_name, affiliation, country, orcid,
  author_order, is_corresponding, contribution, created_at
) ON public.publication_authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_authors TO authenticated;

GRANT SELECT ON public.publications, public.publication_translations, public.book_chapters,
  public.book_chapter_translations, public.publication_files, public.publication_references,
  public.publication_categories, public.publication_category_map, public.publication_tags,
  public.publication_tag_map TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publications, public.publication_translations,
  public.publication_versions, public.book_chapters, public.book_chapter_translations,
  public.publication_files, public.publication_references, public.publication_category_map,
  public.publication_tag_map, public.publication_review_assignments, public.reading_progress,
  public.publication_bookmarks, public.publication_staff TO authenticated;

GRANT SELECT, INSERT ON public.publication_events TO anon, authenticated;
GRANT SELECT ON public.publication_versions TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_publication_editor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_publication_reviewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.publication_is_assigned_reviewer(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publication_row_readable(text, text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_publication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_publication_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_publication(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_publications(text, text, text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_publication_event(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_reading_progress(uuid, uuid, numeric, text) TO authenticated;

-- ── Storage bucket ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'publications',
  'publications',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS publications_storage_read ON storage.objects;
CREATE POLICY publications_storage_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'publications'
    AND EXISTS (
      SELECT 1
      FROM public.publication_files pf
      JOIN public.publications p ON p.id = pf.publication_id
      WHERE pf.bucket_name = 'publications'
        AND pf.storage_path = name
        AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
        AND (
          pf.visibility = 'public'
          OR (pf.visibility = 'members' AND (SELECT auth.uid()) IS NOT NULL)
          OR (
            pf.visibility = 'private'
            AND (
              public.is_platform_admin()
              OR p.created_by = (SELECT auth.uid())
              OR pf.uploaded_by = (SELECT auth.uid())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS publications_storage_insert ON storage.objects;
CREATE POLICY publications_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'publications'
    AND (
      public.is_platform_admin()
      OR public.is_publication_editor()
      OR EXISTS (
        SELECT 1 FROM public.publications p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.created_by = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS publications_storage_update ON storage.objects;
CREATE POLICY publications_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'publications'
    AND (public.is_platform_admin() OR public.is_publication_editor())
  )
  WITH CHECK (
    bucket_id = 'publications'
    AND (public.is_platform_admin() OR public.is_publication_editor())
  );

DROP POLICY IF EXISTS publications_storage_delete ON storage.objects;
CREATE POLICY publications_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'publications'
    AND (public.is_platform_admin() OR public.is_publication_editor())
  );

-- ── Seed categories + draft book shell (no invented manuscript) ───────────────
INSERT INTO public.publication_categories (slug, name_en, name_ar, sort_order) VALUES
  ('flavor-chemistry', 'Flavor Chemistry', 'كيمياء النكهات', 10),
  ('savory-flavors', 'Savory Flavors', 'نكهات مالحة', 20),
  ('sweet-flavors', 'Sweet Flavors', 'نكهات حلوة', 30),
  ('beverages', 'Beverages', 'المشروبات', 40),
  ('dairy', 'Dairy', 'الألبان', 50),
  ('meat-applications', 'Meat Applications', 'تطبيقات اللحوم', 60),
  ('sensory-science', 'Sensory Science', 'علم الحواس', 70),
  ('encapsulation', 'Encapsulation', 'التغليف الدقيق', 80),
  ('stability', 'Stability', 'الثبات', 90),
  ('regulations', 'Regulations', 'التشريعات', 100),
  ('raw-materials', 'Raw Materials', 'المواد الخام', 110),
  ('manufacturing', 'Manufacturing', 'التصنيع', 120),
  ('quality-control', 'Quality Control', 'ضبط الجودة', 130)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.publications (
  type, slug, status, visibility, primary_language, title, subtitle, abstract, version_number
)
SELECT
  'book',
  'flavor-creation-fundamentals-volume-1',
  'draft',
  'private',
  'en',
  'Flavor Creation Fundamentals – Volume 1',
  NULL,
  'Draft catalog record only. The final manuscript, authors, ISBN, and files were not present in the repository and must be imported after review.',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.publications WHERE slug = 'flavor-creation-fundamentals-volume-1'
);

COMMENT ON TABLE public.publications IS
  'Books and technical research records. Academy/course tables remain untouched.';
COMMENT ON TABLE public.legacy_file_url_review IS
  'Academy/resource URLs that may be expired signed links. Manual mapping only.';
