-- Phase 2: member connections + learning paths + course enrollments
-- Supports networking, structured learning, and talent matching UX.

-- ─── Member connections ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_connections_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT member_connections_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS member_connections_requester_idx
  ON public.member_connections(requester_id, status);
CREATE INDEX IF NOT EXISTS member_connections_addressee_idx
  ON public.member_connections(addressee_id, status);

ALTER TABLE public.member_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_connections_select ON public.member_connections;
CREATE POLICY member_connections_select ON public.member_connections
  FOR SELECT TO authenticated
  USING (
    requester_id = (select auth.uid())
    OR addressee_id = (select auth.uid())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS member_connections_insert ON public.member_connections;
CREATE POLICY member_connections_insert ON public.member_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = (select auth.uid())
    AND public.is_email_verified()
  );

DROP POLICY IF EXISTS member_connections_update ON public.member_connections;
CREATE POLICY member_connections_update ON public.member_connections
  FOR UPDATE TO authenticated
  USING (
    requester_id = (select auth.uid())
    OR addressee_id = (select auth.uid())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    requester_id = (select auth.uid())
    OR addressee_id = (select auth.uid())
    OR public.is_platform_admin()
  );

-- Notify addressee on new connection request
CREATE OR REPLACE FUNCTION public.notify_connection_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT coalesce(full_name, 'A member') INTO requester_name
    FROM public.user_profiles WHERE id = NEW.requester_id;
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.addressee_id,
      'New connection request',
      requester_name || ' wants to connect with you.',
      'connection',
      '/dashboard'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT coalesce(full_name, 'A member') INTO requester_name
    FROM public.user_profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.requester_id,
      'Connection accepted',
      requester_name || ' accepted your connection request.',
      'connection',
      '/members'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_connection_request ON public.member_connections;
CREATE TRIGGER trg_notify_connection_request
  AFTER INSERT OR UPDATE OF status ON public.member_connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_request();

-- ─── Learning paths ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_ar text,
  description text,
  description_ar text,
  level text NOT NULL DEFAULT 'beginner',
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_path_courses (
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (path_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  path_id uuid REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'in_progress', 'completed')),
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_paths_read ON public.learning_paths;
CREATE POLICY learning_paths_read ON public.learning_paths
  FOR SELECT USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS learning_paths_admin ON public.learning_paths;
CREATE POLICY learning_paths_admin ON public.learning_paths
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS learning_path_courses_read ON public.learning_path_courses;
CREATE POLICY learning_path_courses_read ON public.learning_path_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.learning_paths p
      WHERE p.id = path_id AND (p.is_published = true OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS learning_path_courses_admin ON public.learning_path_courses;
CREATE POLICY learning_path_courses_admin ON public.learning_path_courses
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS course_enrollments_own ON public.course_enrollments;
CREATE POLICY course_enrollments_own ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_platform_admin());

DROP POLICY IF EXISTS course_enrollments_insert ON public.course_enrollments;
CREATE POLICY course_enrollments_insert ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) AND public.is_email_verified());

DROP POLICY IF EXISTS course_enrollments_update ON public.course_enrollments;
CREATE POLICY course_enrollments_update ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_platform_admin())
  WITH CHECK (user_id = (select auth.uid()) OR public.is_platform_admin());

-- Seed starter learning paths (idempotent)
INSERT INTO public.learning_paths (slug, title, title_ar, description, description_ar, level, sort_order)
VALUES
  (
    'flavor-fundamentals',
    'Flavor Fundamentals',
    'أساسيات النكهات',
    'Core chemistry, sensory basics, and industry orientation for new practitioners.',
    'الكيمياء الأساسية، الحواس، ومدخل الصناعة للمبتدئين.',
    'beginner',
    1
  ),
  (
    'formulation-practice',
    'Formulation Practice',
    'ممارسة التركيب',
    'Hands-on formulation workflows, stability, and application systems.',
    'مسارات التركيب العملية، الثبات، وأنظمة التطبيق.',
    'intermediate',
    2
  ),
  (
    'industry-leadership',
    'Industry Leadership',
    'القيادة في الصناعة',
    'Market intelligence, regulatory awareness, and professional networking.',
    'ذكاء السوق، الوعي التنظيمي، والتواصل المهني.',
    'advanced',
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- Attach published courses into paths by level when available
INSERT INTO public.learning_path_courses (path_id, course_id, sort_order)
SELECT p.id, c.id, row_number() OVER (PARTITION BY p.id ORDER BY c.created_at)
FROM public.learning_paths p
JOIN public.courses c ON c.is_published = true
  AND (
    (p.slug = 'flavor-fundamentals' AND lower(c.level) IN ('beginner', 'intro', 'fundamental'))
    OR (p.slug = 'formulation-practice' AND lower(c.level) IN ('intermediate', 'mid', 'advanced'))
    OR (p.slug = 'industry-leadership' AND lower(c.level) IN ('advanced', 'expert', 'professional'))
  )
ON CONFLICT DO NOTHING;

-- Fallback: if a path has no courses, attach any published courses round-robin
INSERT INTO public.learning_path_courses (path_id, course_id, sort_order)
SELECT p.id, c.id, 100 + row_number() OVER (PARTITION BY p.id ORDER BY c.created_at)
FROM public.learning_paths p
CROSS JOIN LATERAL (
  SELECT id, created_at FROM public.courses
  WHERE is_published = true
  ORDER BY created_at
  LIMIT 3
) c
WHERE NOT EXISTS (
  SELECT 1 FROM public.learning_path_courses lpc WHERE lpc.path_id = p.id
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.member_connections IS 'Professional connection requests between authenticated members.';
COMMENT ON TABLE public.learning_paths IS 'Curated learning paths grouping free courses.';
COMMENT ON TABLE public.course_enrollments IS 'Per-user course enrollment and progress.';
