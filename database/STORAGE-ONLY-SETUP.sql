-- ╔═══════════════════════════════════════════════════════════╗
-- ║  DEPRECATED for production                                ║
-- ║  Use supabase/migrations/* instead (especially             ║
-- ║  20260806160000 + 20260809160000).                        ║
-- ║  This file is kept only as a reference and now matches    ║
-- ║  the hardened storage policies (folder-scoped uploads).   ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-uploads',
  'platform-uploads',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Clean legacy permissive policies
DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_read" ON storage.objects;
DROP POLICY IF EXISTS "owner_update" ON storage.objects;
DROP POLICY IF EXISTS "owner_or_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
DROP POLICY IF EXISTS storage_delete ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "uploads_select" ON storage.objects;
DROP POLICY IF EXISTS "uploads_update" ON storage.objects;
DROP POLICY IF EXISTS "uploads_delete" ON storage.objects;
DROP POLICY IF EXISTS uploads_insert ON storage.objects;
DROP POLICY IF EXISTS uploads_update ON storage.objects;
DROP POLICY IF EXISTS uploads_delete ON storage.objects;

-- Public read
CREATE POLICY "storage_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'platform-uploads');

-- Authenticated upload only into allowed folders
CREATE POLICY "storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-uploads'
    AND (
      public.is_platform_admin()
      OR (storage.foldername(name))[1] IN ('avatars', 'community', 'covers')
    )
  );

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
