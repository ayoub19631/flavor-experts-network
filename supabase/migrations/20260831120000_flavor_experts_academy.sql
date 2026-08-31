-- Flavor Experts Academy — Phase 1 LMS
-- Extends existing courses / learning_paths / course_enrollments.
-- Rollback: see docs/PLATFORM.md § Academy rollback (drop new tables in reverse
-- FK order, drop added columns, restore member_directory view definition).

-- ── Helpers ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.academy_set_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF to_jsonb(NEW) ? 'updated_by' AND auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  IF TG_OP = 'INSERT' AND to_jsonb(NEW) ? 'created_by' AND NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- ── Evolve existing course tables ────────────────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_minutes int,
  ADD COLUMN IF NOT EXISTS primary_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS has_capstone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.courses ALTER COLUMN is_published SET DEFAULT false;

UPDATE public.courses
SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END
WHERE status IS NULL OR status = 'draft' AND is_published = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_status_check'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_status_check
      CHECK (status IN ('draft', 'review', 'published', 'archived'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_slug_unique'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_slug_unique UNIQUE (slug);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_course_publish_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' THEN
    NEW.is_published = true;
    NEW.published_at = COALESCE(NEW.published_at, now());
  ELSE
    NEW.is_published = false;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_publish_flags ON public.courses;
CREATE TRIGGER trg_sync_course_publish_flags
  BEFORE INSERT OR UPDATE OF status, is_published ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_publish_flags();

ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS last_lesson_id uuid,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ── New LMS tables ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.course_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'ar')),
  title text NOT NULL,
  subtitle text,
  description text,
  outcomes text,
  audience text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (course_id, language)
);

CREATE TABLE IF NOT EXISTS public.course_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  notes text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (course_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  estimated_minutes int NOT NULL DEFAULT 20,
  has_lab boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.module_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'ar')),
  title text NOT NULL,
  objective text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (module_id, language)
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  estimated_minutes int NOT NULL DEFAULT 8
    CHECK (estimated_minutes BETWEEN 4 AND 30),
  has_lab boolean NOT NULL DEFAULT false,
  has_quiz boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lesson_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'ar')),
  title text NOT NULL,
  objective text,
  body text,
  worked_example text,
  knowledge_check jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (lesson_id, language)
);

CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'summary'
    CHECK (kind IN ('summary', 'worksheet', 'reading', 'other')),
  title text NOT NULL,
  title_ar text,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'module' CHECK (kind IN ('module', 'final')),
  pass_percent int NOT NULL DEFAULT 70 CHECK (pass_percent BETWEEN 50 AND 100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  title text,
  title_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  prompt_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  body text NOT NULL,
  body_ar text,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_position int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_percent int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text,
  brief text,
  brief_ar text,
  worksheet_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lab_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.lab_assignments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  file_url text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.capstone_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_code text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  course_title text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_enrollments
  DROP CONSTRAINT IF EXISTS course_enrollments_last_lesson_fk;
ALTER TABLE public.course_enrollments
  ADD CONSTRAINT course_enrollments_last_lesson_fk
  FOREIGN KEY (last_lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_course_instructor(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_instructors ci
    WHERE ci.course_id = p_course_id
      AND ci.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments e
    WHERE e.course_id = p_course_id
      AND e.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.course_is_published(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.status = 'published'
      AND c.is_published = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_academy_staff(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
      OR public.is_course_instructor(p_course_id)
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = p_course_id
          AND c.instructor_id = (SELECT auth.uid())
      );
$$;

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses(status, created_at DESC);
CREATE INDEX IF NOT EXISTS courses_slug_idx ON public.courses(slug);
CREATE INDEX IF NOT EXISTS course_modules_course_idx ON public.course_modules(course_id, sort_order);
CREATE INDEX IF NOT EXISTS lessons_module_idx ON public.lessons(module_id, sort_order);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON public.lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON public.quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS quizzes_course_idx ON public.quizzes(course_id, module_id);
CREATE INDEX IF NOT EXISTS lesson_resources_course_idx ON public.lesson_resources(course_id, lesson_id);
CREATE INDEX IF NOT EXISTS lab_assignments_course_idx ON public.lab_assignments(course_id);
CREATE INDEX IF NOT EXISTS course_certificates_code_idx ON public.course_certificates(verification_code);
CREATE INDEX IF NOT EXISTS lesson_comments_lesson_idx ON public.lesson_comments(lesson_id, created_at);

-- ── Audit triggers ───────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'course_translations','course_versions','course_modules','module_translations',
    'lessons','lesson_translations','lesson_resources','quizzes','quiz_questions',
    'quiz_answers','lesson_progress','lab_assignments','lab_submissions',
    'capstone_submissions','course_certificates'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_academy_audit ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_academy_audit BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.academy_set_audit()',
      t
    );
  END LOOP;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capstone_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_public_read ON public.courses;
CREATE POLICY courses_public_read ON public.courses
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR public.is_platform_admin()
    OR instructor_id = (SELECT auth.uid())
    OR public.is_course_instructor(id)
  );

DROP POLICY IF EXISTS course_enrollments_insert ON public.course_enrollments;
CREATE POLICY course_enrollments_insert ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_email_verified()
    AND public.course_is_published(course_id)
  );

-- Catalog / curriculum (no lesson bodies)
DROP POLICY IF EXISTS course_translations_select ON public.course_translations;
CREATE POLICY course_translations_select ON public.course_translations
  FOR SELECT TO anon, authenticated
  USING (public.course_is_published(course_id) OR public.is_academy_staff(course_id));

DROP POLICY IF EXISTS course_translations_staff ON public.course_translations;
CREATE POLICY course_translations_staff ON public.course_translations
  FOR ALL TO authenticated
  USING (public.is_academy_staff(course_id))
  WITH CHECK (public.is_academy_staff(course_id));

DROP POLICY IF EXISTS course_modules_select ON public.course_modules;
CREATE POLICY course_modules_select ON public.course_modules
  FOR SELECT TO anon, authenticated
  USING (
    (status = 'published' AND public.course_is_published(course_id))
    OR public.is_academy_staff(course_id)
  );

DROP POLICY IF EXISTS course_modules_staff ON public.course_modules;
CREATE POLICY course_modules_staff ON public.course_modules
  FOR ALL TO authenticated
  USING (public.is_academy_staff(course_id))
  WITH CHECK (public.is_academy_staff(course_id));

DROP POLICY IF EXISTS module_translations_select ON public.module_translations;
CREATE POLICY module_translations_select ON public.module_translations
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = module_id
        AND (
          (m.status = 'published' AND public.course_is_published(m.course_id))
          OR public.is_academy_staff(m.course_id)
        )
    )
  );

DROP POLICY IF EXISTS module_translations_staff ON public.module_translations;
CREATE POLICY module_translations_staff ON public.module_translations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = module_id AND public.is_academy_staff(m.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = module_id AND public.is_academy_staff(m.course_id)
    )
  );

-- Lesson bodies: enrolled students on published content, or staff
DROP POLICY IF EXISTS lessons_select ON public.lessons;
CREATE POLICY lessons_select ON public.lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = module_id
        AND (
          public.is_academy_staff(m.course_id)
          OR (
            status = 'published'
            AND m.status = 'published'
            AND public.course_is_published(m.course_id)
            AND public.is_enrolled_in_course(m.course_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS lessons_staff ON public.lessons;
CREATE POLICY lessons_staff ON public.lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = module_id AND public.is_academy_staff(m.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      WHERE m.id = module_id AND public.is_academy_staff(m.course_id)
    )
  );

DROP POLICY IF EXISTS lesson_translations_select ON public.lesson_translations;
CREATE POLICY lesson_translations_select ON public.lesson_translations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_modules m ON m.id = l.module_id
      WHERE l.id = lesson_id
        AND (
          public.is_academy_staff(m.course_id)
          OR (
            l.status = 'published'
            AND public.course_is_published(m.course_id)
            AND public.is_enrolled_in_course(m.course_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS lesson_translations_staff ON public.lesson_translations;
CREATE POLICY lesson_translations_staff ON public.lesson_translations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_modules m ON m.id = l.module_id
      WHERE l.id = lesson_id AND public.is_academy_staff(m.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_modules m ON m.id = l.module_id
      WHERE l.id = lesson_id AND public.is_academy_staff(m.course_id)
    )
  );

DROP POLICY IF EXISTS lesson_resources_select ON public.lesson_resources;
CREATE POLICY lesson_resources_select ON public.lesson_resources
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(course_id) OR public.is_enrolled_in_course(course_id));

DROP POLICY IF EXISTS lesson_resources_staff ON public.lesson_resources;
CREATE POLICY lesson_resources_staff ON public.lesson_resources
  FOR ALL TO authenticated
  USING (public.is_academy_staff(course_id))
  WITH CHECK (public.is_academy_staff(course_id));

-- Quizzes: staff full access; students never SELECT quiz_answers
DROP POLICY IF EXISTS quizzes_select ON public.quizzes;
CREATE POLICY quizzes_select ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    public.is_academy_staff(course_id)
    OR (status = 'published' AND public.course_is_published(course_id) AND public.is_enrolled_in_course(course_id))
  );

DROP POLICY IF EXISTS quizzes_staff ON public.quizzes;
CREATE POLICY quizzes_staff ON public.quizzes
  FOR ALL TO authenticated
  USING (public.is_academy_staff(course_id))
  WITH CHECK (public.is_academy_staff(course_id));

DROP POLICY IF EXISTS quiz_questions_select ON public.quiz_questions;
CREATE POLICY quiz_questions_select ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_id
        AND (
          public.is_academy_staff(q.course_id)
          OR (q.status = 'published' AND public.is_enrolled_in_course(q.course_id))
        )
    )
  );

DROP POLICY IF EXISTS quiz_questions_staff ON public.quiz_questions;
CREATE POLICY quiz_questions_staff ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND public.is_academy_staff(q.course_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND public.is_academy_staff(q.course_id))
  );

DROP POLICY IF EXISTS quiz_answers_staff ON public.quiz_answers;
CREATE POLICY quiz_answers_staff ON public.quiz_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = question_id AND public.is_academy_staff(q.course_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = question_id AND public.is_academy_staff(q.course_id)
    )
  );

DROP POLICY IF EXISTS lesson_progress_own ON public.lesson_progress;
CREATE POLICY lesson_progress_own ON public.lesson_progress
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_enrolled_in_course(course_id)
  );

DROP POLICY IF EXISTS quiz_attempts_own ON public.quiz_attempts;
CREATE POLICY quiz_attempts_own ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_academy_staff(course_id));

DROP POLICY IF EXISTS quiz_attempts_insert ON public.quiz_attempts;
CREATE POLICY quiz_attempts_insert ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_enrolled_in_course(course_id));

DROP POLICY IF EXISTS lab_assignments_select ON public.lab_assignments;
CREATE POLICY lab_assignments_select ON public.lab_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_academy_staff(course_id)
    OR (status = 'published' AND public.is_enrolled_in_course(course_id))
  );

DROP POLICY IF EXISTS lab_assignments_staff ON public.lab_assignments;
CREATE POLICY lab_assignments_staff ON public.lab_assignments
  FOR ALL TO authenticated
  USING (public.is_academy_staff(course_id))
  WITH CHECK (public.is_academy_staff(course_id));

DROP POLICY IF EXISTS lab_submissions_own ON public.lab_submissions;
CREATE POLICY lab_submissions_own ON public.lab_submissions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_academy_staff(course_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_enrolled_in_course(course_id));

DROP POLICY IF EXISTS capstone_submissions_own ON public.capstone_submissions;
CREATE POLICY capstone_submissions_own ON public.capstone_submissions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_academy_staff(course_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_enrolled_in_course(course_id));

DROP POLICY IF EXISTS course_certificates_own ON public.course_certificates;
CREATE POLICY course_certificates_own ON public.course_certificates
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS course_certificates_insert ON public.course_certificates;
CREATE POLICY course_certificates_insert ON public.course_certificates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS courses_instructor_update ON public.courses;
CREATE POLICY courses_instructor_update ON public.courses
  FOR UPDATE TO authenticated
  USING (
    instructor_id = (SELECT auth.uid())
    OR public.is_course_instructor(id)
  )
  WITH CHECK (
    instructor_id = (SELECT auth.uid())
    OR public.is_course_instructor(id)
  );

DROP POLICY IF EXISTS course_enrollments_update ON public.course_enrollments;
CREATE POLICY course_enrollments_update ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS lesson_comments_select ON public.lesson_comments;
CREATE POLICY lesson_comments_select ON public.lesson_comments
  FOR SELECT TO authenticated
  USING (public.is_enrolled_in_course(course_id) OR public.is_academy_staff(course_id));

DROP POLICY IF EXISTS lesson_comments_insert ON public.lesson_comments;
CREATE POLICY lesson_comments_insert ON public.lesson_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()) AND public.is_enrolled_in_course(course_id));

DROP POLICY IF EXISTS lesson_comments_delete ON public.lesson_comments;
CREATE POLICY lesson_comments_delete ON public.lesson_comments
  FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS course_versions_staff ON public.course_versions;
CREATE POLICY course_versions_staff ON public.course_versions
  FOR ALL TO authenticated
  USING (public.is_academy_staff(course_id))
  WITH CHECK (public.is_academy_staff(course_id));

DROP POLICY IF EXISTS course_instructors_select ON public.course_instructors;
CREATE POLICY course_instructors_select ON public.course_instructors
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS course_instructors_admin ON public.course_instructors;
CREATE POLICY course_instructors_admin ON public.course_instructors
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Public curriculum titles only (no bodies). Owner view on purpose so guests
-- can read published titles without a lesson-body SELECT grant.
DROP VIEW IF EXISTS public.academy_curriculum;
CREATE VIEW public.academy_curriculum
AS
SELECT
  l.id AS lesson_id,
  l.module_id,
  m.course_id,
  l.sort_order AS lesson_sort,
  m.sort_order AS module_sort,
  l.estimated_minutes,
  l.has_lab,
  l.has_quiz,
  lt.language,
  lt.title AS lesson_title,
  mt.title AS module_title
FROM public.lessons l
JOIN public.course_modules m ON m.id = l.module_id
JOIN public.courses c ON c.id = m.course_id
JOIN public.lesson_translations lt ON lt.lesson_id = l.id
JOIN public.module_translations mt ON mt.module_id = m.id AND mt.language = lt.language
WHERE c.status = 'published'
  AND m.status = 'published'
  AND l.status = 'published';

GRANT SELECT ON public.academy_curriculum TO anon, authenticated;

-- ── RPCs ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.academy_enroll(p_course_id uuid, p_path_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  enrollment_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_email_verified() THEN
    RAISE EXCEPTION 'Email verification required';
  END IF;
  IF NOT public.course_is_published(p_course_id) THEN
    RAISE EXCEPTION 'Course is not published';
  END IF;

  INSERT INTO public.course_enrollments (user_id, course_id, path_id, status, progress_pct)
  VALUES (uid, p_course_id, p_path_id, 'enrolled', 0)
  ON CONFLICT (user_id, course_id) DO UPDATE
    SET path_id = COALESCE(EXCLUDED.path_id, public.course_enrollments.path_id),
        updated_at = now()
  RETURNING id INTO enrollment_id;

  RETURN enrollment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_recalc_progress(p_course_id uuid, p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lesson_total int;
  lesson_done int;
  quiz_total int;
  quiz_done int;
  lab_total int;
  lab_done int;
  capstone_req int;
  capstone_done int;
  total int;
  done int;
  pct int;
  complete boolean;
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM p_user_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*) INTO lesson_total
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  WHERE m.course_id = p_course_id AND l.status = 'published' AND m.status = 'published';

  SELECT count(*) INTO lesson_done
  FROM public.lesson_progress lp
  WHERE lp.course_id = p_course_id AND lp.user_id = p_user_id AND lp.status = 'completed';

  SELECT count(*) INTO quiz_total
  FROM public.quizzes q
  WHERE q.course_id = p_course_id AND q.status = 'published';

  SELECT count(DISTINCT qa.quiz_id) INTO quiz_done
  FROM public.quiz_attempts qa
  WHERE qa.course_id = p_course_id AND qa.user_id = p_user_id AND qa.passed;

  SELECT count(*) INTO lab_total
  FROM public.lab_assignments la
  WHERE la.course_id = p_course_id AND la.status = 'published';

  SELECT count(*) INTO lab_done
  FROM public.lab_submissions ls
  WHERE ls.course_id = p_course_id AND ls.user_id = p_user_id AND ls.status IN ('submitted', 'reviewed');

  SELECT CASE WHEN has_capstone THEN 1 ELSE 0 END INTO capstone_req
  FROM public.courses WHERE id = p_course_id;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.capstone_submissions cs
    WHERE cs.course_id = p_course_id AND cs.user_id = p_user_id AND cs.status IN ('submitted', 'reviewed')
  ) THEN 1 ELSE 0 END INTO capstone_done;

  total := lesson_total + quiz_total + lab_total + capstone_req;
  done := least(lesson_done, lesson_total) + least(quiz_done, quiz_total) + least(lab_done, lab_total) + least(capstone_done, capstone_req);
  IF total = 0 THEN
    pct := 0;
  ELSE
    pct := round((done::numeric / total::numeric) * 100);
  END IF;
  complete := lesson_total > 0 AND lesson_done >= lesson_total AND quiz_done >= quiz_total
    AND lab_done >= lab_total AND capstone_done >= capstone_req;

  UPDATE public.course_enrollments
  SET progress_pct = pct,
      status = CASE
        WHEN complete THEN 'completed'
        WHEN pct > 0 THEN 'in_progress'
        ELSE 'enrolled'
      END,
      completed_at = CASE WHEN complete THEN coalesce(completed_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE user_id = p_user_id AND course_id = p_course_id;

  RETURN pct;
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_complete_lesson(p_lesson_id uuid, p_position int DEFAULT 0)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT m.course_id INTO cid
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id AND l.status = 'published';

  IF cid IS NULL THEN
    RAISE EXCEPTION 'Lesson not available';
  END IF;
  IF NOT public.is_enrolled_in_course(cid) THEN
    RAISE EXCEPTION 'Enrollment required';
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, course_id, status, last_position, completed_at)
  VALUES (uid, p_lesson_id, cid, 'completed', greatest(p_position, 0), now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'completed',
        last_position = greatest(public.lesson_progress.last_position, EXCLUDED.last_position),
        completed_at = coalesce(public.lesson_progress.completed_at, now()),
        updated_at = now();

  UPDATE public.course_enrollments
  SET last_lesson_id = p_lesson_id, updated_at = now()
  WHERE user_id = uid AND course_id = cid;

  RETURN public.academy_recalc_progress(cid, uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_save_lesson_progress(p_lesson_id uuid, p_position int DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT m.course_id INTO cid
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id;
  IF cid IS NULL OR NOT public.is_enrolled_in_course(cid) THEN
    RAISE EXCEPTION 'Enrollment required';
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, course_id, status, last_position)
  VALUES (uid, p_lesson_id, cid, 'in_progress', greatest(p_position, 0))
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET last_position = greatest(public.lesson_progress.last_position, EXCLUDED.last_position),
        status = CASE WHEN public.lesson_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
        updated_at = now();

  UPDATE public.course_enrollments
  SET last_lesson_id = p_lesson_id, updated_at = now()
  WHERE user_id = uid AND course_id = cid;

  PERFORM public.academy_recalc_progress(cid, uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_get_quiz(p_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quizzes%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO q FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  IF q.status <> 'published' AND NOT public.is_academy_staff(q.course_id) THEN
    RAISE EXCEPTION 'Quiz not available';
  END IF;
  IF NOT public.is_enrolled_in_course(q.course_id) AND NOT public.is_academy_staff(q.course_id) THEN
    RAISE EXCEPTION 'Enrollment required';
  END IF;

  SELECT jsonb_build_object(
    'id', q.id,
    'course_id', q.course_id,
    'module_id', q.module_id,
    'kind', q.kind,
    'pass_percent', q.pass_percent,
    'title', q.title,
    'title_ar', q.title_ar,
    'questions', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'sort_order', qq.sort_order,
          'prompt', qq.prompt,
          'prompt_ar', qq.prompt_ar,
          'choices', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', qa.id,
                'sort_order', qa.sort_order,
                'body', qa.body,
                'body_ar', qa.body_ar
              ) ORDER BY qa.sort_order
            )
            FROM public.quiz_answers qa
            WHERE qa.question_id = qq.id
          )
        ) ORDER BY qq.sort_order
      )
      FROM public.quiz_questions qq
      WHERE qq.quiz_id = q.id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_submit_quiz(p_quiz_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  q public.quizzes%ROWTYPE;
  total int := 0;
  correct int := 0;
  pct int := 0;
  passed boolean := false;
  attempt_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT * INTO q FROM public.quizzes WHERE id = p_quiz_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not available';
  END IF;
  IF NOT public.is_enrolled_in_course(q.course_id) THEN
    RAISE EXCEPTION 'Enrollment required';
  END IF;

  SELECT count(*) INTO total FROM public.quiz_questions WHERE quiz_id = p_quiz_id;
  SELECT count(*) INTO correct
  FROM jsonb_to_recordset(COALESCE(p_answers, '[]'::jsonb)) AS a(question_id uuid, answer_id uuid)
  JOIN public.quiz_answers qa ON qa.id = a.answer_id AND qa.question_id = a.question_id
  WHERE qa.is_correct = true
    AND EXISTS (SELECT 1 FROM public.quiz_questions qq WHERE qq.id = a.question_id AND qq.quiz_id = p_quiz_id);

  IF total = 0 THEN
    pct := 0;
  ELSE
    pct := round((correct::numeric / total::numeric) * 100);
  END IF;
  passed := pct >= q.pass_percent;

  INSERT INTO public.quiz_attempts (user_id, quiz_id, course_id, answers, score_percent, passed)
  VALUES (uid, p_quiz_id, q.course_id, COALESCE(p_answers, '[]'::jsonb), pct, passed)
  RETURNING id INTO attempt_id;

  PERFORM public.academy_recalc_progress(q.course_id, uid);

  RETURN jsonb_build_object(
    'attempt_id', attempt_id,
    'total', total,
    'correct', correct,
    'percent', pct,
    'passed', passed,
    'pass_percent', q.pass_percent
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_issue_certificate(p_course_id uuid)
RETURNS public.course_certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  enroll public.course_enrollments%ROWTYPE;
  course_title text;
  recipient text;
  rec public.course_certificates%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM public.academy_recalc_progress(p_course_id, uid);
  SELECT * INTO enroll FROM public.course_enrollments
  WHERE user_id = uid AND course_id = p_course_id;
  IF NOT FOUND OR enroll.status <> 'completed' THEN
    RAISE EXCEPTION 'Course is not complete';
  END IF;

  SELECT COALESCE(ct.title, c.title) INTO course_title
  FROM public.courses c
  LEFT JOIN public.course_translations ct ON ct.course_id = c.id AND ct.language = 'en'
  WHERE c.id = p_course_id;

  SELECT COALESCE(full_name, email, 'Member') INTO recipient
  FROM public.user_profiles WHERE id = uid;

  INSERT INTO public.course_certificates (
    course_id, user_id, verification_code, recipient_name, course_title
  ) VALUES (
    p_course_id,
    uid,
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    recipient,
    COALESCE(course_title, 'Flavor Experts Academy')
  )
  ON CONFLICT (course_id, user_id) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_verify_certificate(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN rec.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'valid', true,
      'verification_code', rec.verification_code,
      'recipient_name', rec.recipient_name,
      'course_title', rec.course_title,
      'issued_at', rec.issued_at
    )
  END
  FROM (SELECT * FROM public.course_certificates WHERE verification_code = upper(trim(p_code)) LIMIT 1) rec;
$$;

CREATE OR REPLACE FUNCTION public.academy_publish_course(p_course_id uuid, p_notes text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.courses
  SET status = 'published', updated_at = now()
  WHERE id = p_course_id;

  UPDATE public.course_modules SET status = 'published' WHERE course_id = p_course_id AND status <> 'archived';
  UPDATE public.lessons l
  SET status = 'published'
  FROM public.course_modules m
  WHERE l.module_id = m.id AND m.course_id = p_course_id AND l.status <> 'archived';
  UPDATE public.quizzes SET status = 'published' WHERE course_id = p_course_id AND status <> 'archived';
  UPDATE public.lab_assignments SET status = 'published' WHERE course_id = p_course_id AND status <> 'archived';

  SELECT coalesce(max(version_number), 0) + 1 INTO next_version
  FROM public.course_versions WHERE course_id = p_course_id;

  UPDATE public.courses SET version_number = next_version WHERE id = p_course_id;

  INSERT INTO public.course_versions (course_id, version_number, status, notes, snapshot, created_by)
  SELECT
    p_course_id,
    next_version,
    'published',
    p_notes,
    jsonb_build_object(
      'modules', (SELECT count(*) FROM public.course_modules WHERE course_id = p_course_id),
      'lessons', (
        SELECT count(*) FROM public.lessons l
        JOIN public.course_modules m ON m.id = l.module_id
        WHERE m.course_id = p_course_id
      ),
      'quizzes', (SELECT count(*) FROM public.quizzes WHERE course_id = p_course_id)
    ),
    auth.uid();

  RETURN next_version;
END;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.is_course_instructor(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_is_published(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_academy_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_enroll(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_complete_lesson(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_save_lesson_progress(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_get_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_submit_quiz(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_issue_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_verify_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_publish_course(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_recalc_progress(uuid, uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.course_instructors,
  public.course_translations,
  public.course_versions,
  public.course_modules,
  public.module_translations,
  public.lessons,
  public.lesson_translations,
  public.lesson_resources,
  public.quizzes,
  public.quiz_questions,
  public.quiz_answers,
  public.lesson_progress,
  public.quiz_attempts,
  public.lab_assignments,
  public.lab_submissions,
  public.capstone_submissions,
  public.course_certificates,
  public.lesson_comments
TO authenticated;

GRANT SELECT ON public.course_translations TO anon;
GRANT SELECT ON public.course_modules TO anon;
GRANT SELECT ON public.module_translations TO anon;

-- ── Storage ──────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy',
  'academy',
  false,
  20971520,
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
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public = false;

DROP POLICY IF EXISTS academy_storage_read ON storage.objects;
CREATE POLICY academy_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'academy'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = 'resources'
        AND (
          public.is_academy_staff(((storage.foldername(name))[2])::uuid)
          OR public.is_enrolled_in_course(((storage.foldername(name))[2])::uuid)
        )
      )
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

DROP POLICY IF EXISTS academy_storage_staff_write ON storage.objects;
CREATE POLICY academy_storage_staff_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy'
    AND (
      (
        (storage.foldername(name))[1] = 'resources'
        AND public.is_academy_staff(((storage.foldername(name))[2])::uuid)
      )
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

DROP POLICY IF EXISTS academy_storage_update ON storage.objects;
CREATE POLICY academy_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = 'resources'
        AND public.is_academy_staff(((storage.foldername(name))[2])::uuid)
      )
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'academy'
    AND (
      public.is_platform_admin()
      OR (
        (storage.foldername(name))[1] = 'resources'
        AND public.is_academy_staff(((storage.foldername(name))[2])::uuid)
      )
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

-- ── Hide QA / test accounts from the public directory ────────────────────────
CREATE OR REPLACE FUNCTION public.is_hidden_test_member(p_name text, p_company text DEFAULT NULL, p_bio text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(p_name, '') ~* '(\+companyqa|ayobe895\+|qaautomation|companyqa[0-9]{6,}|\btest account\b)'
      OR coalesce(p_company, '') ~* '(qa automation|\+companyqa)'
      OR coalesce(p_bio, '') ~* '(\+companyqa|synthetic test account)';
$$;

CREATE OR REPLACE VIEW public.member_directory
  WITH (security_invoker = true)
AS
SELECT
  id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, cover_url,
  is_featured, title, company, location, bio, member_type, years_experience,
  website, profile_id, skills, education, work_experience, projects
FROM public.member_directory_data
WHERE NOT public.is_hidden_test_member(full_name, company, bio);

GRANT SELECT ON public.member_directory TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_hidden_test_member(text, text, text) TO anon, authenticated;

COMMENT ON TABLE public.course_modules IS 'Academy modules. Draft rows are invisible to the public.';
COMMENT ON FUNCTION public.academy_submit_quiz(uuid, jsonb) IS 'Scores a quiz server-side. Students cannot read quiz_answers.is_correct.';
