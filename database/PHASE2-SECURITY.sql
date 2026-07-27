-- Phase 2: Harden RLS, storage, and function permissions
-- Apply via Supabase SQL Editor or migration

-- ── members: admin-only insert (was any authenticated user) ─────────────────
DROP POLICY IF EXISTS "members_insert" ON public.members;
CREATE POLICY "members_insert"
  ON public.members FOR INSERT
  WITH CHECK (public.is_platform_admin());

-- ── storage: admin for content uploads; avatars for authenticated users ───
DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] = 'avatars'
    )
  );

DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (auth.uid() = owner AND (storage.foldername(name))[1] = 'avatars')
    )
  );

-- ── restrict EXECUTE on security-sensitive functions ────────────────────────
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;
