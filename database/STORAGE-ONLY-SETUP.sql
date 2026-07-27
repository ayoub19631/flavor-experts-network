-- ╔═══════════════════════════════════════════════════════════╗
-- ║   STORAGE SETUP — platform-uploads bucket               ║
-- ║   Run separately in Supabase SQL Editor                 ║
-- ║   https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/sql/new  ║
-- ╚═══════════════════════════════════════════════════════════╝

-- Step 1: Create the bucket (safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-uploads',
  'platform-uploads',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 2: Drop ALL possible old policy names (clean slate)
DROP POLICY IF EXISTS "authenticated_upload"          ON storage.objects;
DROP POLICY IF EXISTS "public_read"                   ON storage.objects;
DROP POLICY IF EXISTS "owner_update"                  ON storage.objects;
DROP POLICY IF EXISTS "owner_or_admin_delete"         ON storage.objects;
DROP POLICY IF EXISTS "storage_upload"                ON storage.objects;
DROP POLICY IF EXISTS "storage_read"                  ON storage.objects;
DROP POLICY IF EXISTS "storage_update"                ON storage.objects;
DROP POLICY IF EXISTS "storage_delete"                ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert"                ON storage.objects;
DROP POLICY IF EXISTS "uploads_select"                ON storage.objects;
DROP POLICY IF EXISTS "uploads_update"                ON storage.objects;
DROP POLICY IF EXISTS "uploads_delete"                ON storage.objects;

-- Step 3: Create correct policies
-- Any authenticated user can upload
CREATE POLICY "uploads_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'platform-uploads');

-- Anyone (including public) can read/download files
CREATE POLICY "uploads_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'platform-uploads');

-- Uploader can update their own files
CREATE POLICY "uploads_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'platform-uploads' AND auth.uid() = owner);

-- Uploader OR admin can delete
CREATE POLICY "uploads_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'platform-uploads'
    AND (
      auth.uid() = owner
      OR (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid())
    )
  );

-- Step 4: Verify
SELECT
  id,
  name,
  public,
  file_size_limit,
  ARRAY_LENGTH(allowed_mime_types, 1) AS mime_types_count,
  created_at
FROM storage.buckets
WHERE id = 'platform-uploads';
