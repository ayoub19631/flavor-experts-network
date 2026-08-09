-- =============================================================================
-- Complete database hardening for Flavor Experts Network
-- Idempotent. Safe to re-apply.
-- =============================================================================

-- ── 1. Anon-safe admin helper for public RLS policies ─────────────────────────
-- Public SELECT policies call is_platform_admin(); anon must be able to EXECUTE
-- (function is SECURITY DEFINER and only returns boolean).
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;

-- ── 2. Jobs: allow guests to see published open listings (teaser / count) ─────
DROP POLICY IF EXISTS jobs_select ON public.job_listings;
CREATE POLICY jobs_select ON public.job_listings
  FOR SELECT TO anon, authenticated
  USING (
    public.is_platform_admin()
    OR (
      (select auth.uid()) IS NOT NULL
      AND company_id = (select auth.uid())
    )
    OR (
      is_published = true
      AND status = 'open'
      AND (
        (select auth.uid()) IS NULL
        OR public.has_active_subscription()
      )
    )
  );

-- ── 3. Member sync: fire on professional profile columns + backfill ───────────
DROP TRIGGER IF EXISTS trg_sync_member_from_profile ON public.user_profiles;
CREATE TRIGGER trg_sync_member_from_profile
  AFTER INSERT OR UPDATE OF
    full_name, email, role, company, location, bio,
    linkedin_url, website_url, avatar_url, cover_url,
    account_type, is_admin, is_active,
    specialty, years_experience, skills, education,
    work_experience, projects
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_from_profile();

-- Force member directory sync for all active profiles (fires sync trigger)
DO $$
DECLARE
  rid uuid;
BEGIN
  FOR rid IN
    SELECT id FROM public.user_profiles
    WHERE COALESCE(is_active, true) = true
      AND email IS NOT NULL
      AND length(btrim(email)) > 0
  LOOP
    UPDATE public.user_profiles
    SET full_name = full_name
    WHERE id = rid;
  END LOOP;
END;
$$;

-- ── 4. Connections: symmetric uniqueness + safe status transitions ────────────
-- Deduplicate reverse pairs (keep earliest)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.member_connections
)
DELETE FROM public.member_connections c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS member_connections_symmetric_pair_uidx
  ON public.member_connections (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

CREATE OR REPLACE FUNCTION public.enforce_member_connection_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := public.is_platform_admin();
BEGIN
  -- Identity columns are immutable
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id THEN
    RAISE EXCEPTION 'connection participants cannot be changed';
  END IF;

  IF is_admin THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Addressee may accept or decline a pending request
  IF uid = OLD.addressee_id THEN
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') THEN
      NEW.message := OLD.message;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'addressee can only accept or decline a pending request';
  END IF;

  -- Requester may cancel a pending request
  IF uid = OLD.requester_id THEN
    IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
      NEW.message := OLD.message;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'requester can only cancel a pending request';
  END IF;

  RAISE EXCEPTION 'not allowed to update this connection';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_connection_update ON public.member_connections;
CREATE TRIGGER trg_enforce_member_connection_update
  BEFORE UPDATE ON public.member_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_connection_update();

-- Keep RLS but rely on trigger for transition rules
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

-- ── 5. Community comments: ensure schema + harden moderation ──────────────────
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

CREATE OR REPLACE FUNCTION public.enforce_social_comment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.post_id IS DISTINCT FROM OLD.post_id
     OR NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'comment post/author cannot be changed';
  END IF;

  IF NOT public.is_platform_admin() THEN
    -- Authors may edit body only; cannot unhide/hide
    NEW.is_hidden := OLD.is_hidden;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_social_comment_update ON public.social_post_comments;
CREATE TRIGGER trg_enforce_social_comment_update
  BEFORE UPDATE ON public.social_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_social_comment_update();

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

-- Protect likes_count / comments_count / moderation flags from non-admins
CREATE OR REPLACE FUNCTION public.protect_post_moderation_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    NEW.likes_count := OLD.likes_count;
    IF NEW.comments_count IS DISTINCT FROM OLD.comments_count THEN
      NEW.comments_count := OLD.comments_count;
    END IF;
    NEW.is_hidden := OLD.is_hidden;
    NEW.is_published := OLD.is_published;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_post_moderation ON public.social_posts;
CREATE TRIGGER protect_post_moderation
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_moderation_columns();

-- Storage: community + avatars for authenticated members (hardened)
DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = 'avatars'
      OR (storage.foldername(name))[1] = 'community'
      OR (storage.foldername(name))[1] = 'covers'
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
        AND (storage.foldername(name))[1] IN ('avatars', 'community', 'covers')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (
        owner = (select auth.uid())
        AND (storage.foldername(name))[1] IN ('avatars', 'community', 'covers')
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
        AND (storage.foldername(name))[1] IN ('avatars', 'community', 'covers')
      )
    )
  );

-- Drop legacy permissive storage policies if present
DROP POLICY IF EXISTS uploads_insert ON storage.objects;
DROP POLICY IF EXISTS uploads_update ON storage.objects;
DROP POLICY IF EXISTS uploads_delete ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;

-- ── 6. REVOKE client EXECUTE on SECURITY DEFINER trigger helpers ──────────────
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.touch_social_post_comments()',
    'public.notify_connection_request()',
    'public.enforce_member_connection_update()',
    'public.enforce_social_comment_update()',
    'public.protect_post_moderation_columns()',
    'public.sync_member_from_profile()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXCEPTION
      WHEN undefined_function THEN
        NULL;
    END;
  END LOOP;
END;
$$;

-- ── 7. Views: pin security_invoker = false (directory/author privacy model) ───
DO $$
BEGIN
  IF to_regclass('public.member_directory') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.member_directory SET (security_invoker = false)';
  END IF;
  IF to_regclass('public.public_author_profiles') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.public_author_profiles SET (security_invoker = false)';
  END IF;
EXCEPTION
  WHEN others THEN
    -- Older Postgres builds may not support the option; ignore.
    NULL;
END;
$$;

COMMENT ON FUNCTION public.enforce_member_connection_update() IS
  'Enforces connection status transitions: addressee accept/decline, requester cancel.';
COMMENT ON FUNCTION public.enforce_social_comment_update() IS
  'Locks comment identity columns; only admins may change is_hidden.';
