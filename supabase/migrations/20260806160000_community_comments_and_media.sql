-- Community media uploads + post comments (professional feed interactions)

-- ── Storage: allow authenticated members to upload community images ───────────
DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = 'avatars'
      OR (storage.foldername(name))[1] = 'community'
    )
  );

DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (
        owner = (select auth.uid())
        AND (storage.foldername(name))[1] IN ('avatars', 'community')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (
        owner = (select auth.uid())
        AND (storage.foldername(name))[1] IN ('avatars', 'community')
      )
    )
  );

DROP POLICY IF EXISTS storage_delete ON storage.objects;
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
CREATE POLICY storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (
        owner = (select auth.uid())
        AND (storage.foldername(name))[1] IN ('avatars', 'community')
      )
    )
  );

-- ── Comments on social posts ──────────────────────────────────────────────────
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.social_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_post_comments_post_idx
  ON public.social_post_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS social_post_comments_author_idx
  ON public.social_post_comments(author_id);

ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_comments_select ON public.social_post_comments;
CREATE POLICY social_comments_select ON public.social_post_comments
  FOR SELECT USING (
    is_hidden = false
    OR author_id = (select auth.uid())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS social_comments_insert ON public.social_post_comments;
CREATE POLICY social_comments_insert ON public.social_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (select auth.uid())
    AND public.is_email_verified()
  );

DROP POLICY IF EXISTS social_comments_update ON public.social_post_comments;
CREATE POLICY social_comments_update ON public.social_post_comments
  FOR UPDATE TO authenticated
  USING (
    author_id = (select auth.uid())
    OR public.is_platform_admin()
  )
  WITH CHECK (
    author_id = (select auth.uid())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS social_comments_delete ON public.social_post_comments;
CREATE POLICY social_comments_delete ON public.social_post_comments
  FOR DELETE TO authenticated
  USING (
    author_id = (select auth.uid())
    OR public.is_platform_admin()
  );

CREATE OR REPLACE FUNCTION public.touch_social_post_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_post_comments ON public.social_post_comments;
CREATE TRIGGER trg_social_post_comments
  AFTER INSERT OR DELETE ON public.social_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_social_post_comments();

COMMENT ON TABLE public.social_post_comments IS
  'Comments on community social posts.';
