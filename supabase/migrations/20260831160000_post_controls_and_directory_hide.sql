-- Post owner can disable comments. Duplicate public listings can be hidden
-- without deleting the account.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS hide_from_directory boolean NOT NULL DEFAULT false;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS comments_disabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  NEW.is_admin := OLD.is_admin;
  NEW.is_test_account := OLD.is_test_account;
  NEW.is_verified := OLD.is_verified;
  NEW.verification_type := OLD.verification_type;
  NEW.verified_at := OLD.verified_at;
  NEW.platform_preview_access := OLD.platform_preview_access;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.subscription_active := OLD.subscription_active;
  NEW.hide_from_directory := OLD.hide_from_directory;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.member_is_publicly_listed(p_member_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (NOT COALESCE(p.is_test_account, false))
         AND COALESCE(p.is_active, true)
         AND NOT COALESCE(p.hide_from_directory, false)
      FROM public.user_profiles p
      WHERE p.id = COALESCE(p_profile_id, p_member_id)
      LIMIT 1
    ),
    true
  );
$$;

-- Keep the complete founder profile public. Hide the later incomplete duplicate.
-- Bypass the protect trigger because this session is not a platform admin.
ALTER TABLE public.user_profiles DISABLE TRIGGER trg_protect_privileged_profile_columns;
UPDATE public.user_profiles
SET hide_from_directory = true
WHERE id = '2dbdca0f-c480-4238-b9a5-57cce6d77654'
  AND COALESCE(is_admin, false) = false;
ALTER TABLE public.user_profiles ENABLE TRIGGER trg_protect_privileged_profile_columns;

DROP POLICY IF EXISTS social_comments_insert ON public.social_post_comments;
CREATE POLICY social_comments_insert ON public.social_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.is_email_verified()
    AND EXISTS (
      SELECT 1
      FROM public.social_posts p
      WHERE p.id = social_post_comments.post_id
        AND COALESCE(p.comments_disabled, false) = false
        AND COALESCE(p.is_hidden, false) = false
    )
  );
