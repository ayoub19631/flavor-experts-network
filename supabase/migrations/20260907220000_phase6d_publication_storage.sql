-- Phase 6D — private publication files, signed URLs, path and MIME guards.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'publications',
  'publications',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = COALESCE(storage.buckets.file_size_limit, 52428800),
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

CREATE OR REPLACE FUNCTION public.publication_setting_int(p_key text, p_default int)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT value_int FROM public.publication_settings WHERE key = p_key), p_default);
$$;

CREATE OR REPLACE FUNCTION public.assert_publication_upload(
  p_kind text,
  p_mime text,
  p_ext text,
  p_size bigint
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cover_max int := public.publication_setting_int('cover_max_bytes', 5242880);
  pdf_max int := public.publication_setting_int('pdf_max_bytes', 52428800);
BEGIN
  IF p_kind = 'cover' THEN
    IF p_size IS NULL OR p_size <= 0 OR p_size > cover_max THEN
      RAISE EXCEPTION 'Cover must be % bytes or smaller.', cover_max;
    END IF;
    IF lower(coalesce(p_ext, '')) NOT IN ('jpg', 'jpeg', 'png', 'webp') THEN
      RAISE EXCEPTION 'Cover must be JPEG, PNG, or WebP.';
    END IF;
    IF lower(coalesce(p_mime, '')) NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
      RAISE EXCEPTION 'Cover MIME type is not allowed.';
    END IF;
  ELSE
    IF p_size IS NULL OR p_size <= 0 OR p_size > pdf_max THEN
      RAISE EXCEPTION 'Document must be % bytes or smaller.', pdf_max;
    END IF;
    IF lower(coalesce(p_ext, '')) <> 'pdf' OR lower(coalesce(p_mime, '')) <> 'application/pdf' THEN
      RAISE EXCEPTION 'Documents must be PDF in this release.';
    END IF;
  END IF;
  IF position('..' in coalesce(p_ext, '')) > 0 THEN
    RAISE EXCEPTION 'Unsafe file type.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_publication_path(p_owner uuid, p_publication uuid, p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ext text;
  token text;
BEGIN
  IF p_owner IS NULL OR p_publication IS NULL THEN
    RAISE EXCEPTION 'Owner and publication are required.';
  END IF;
  IF p_name IS NULL OR p_name ~ '[\\/]' OR position('..' in p_name) > 0 THEN
    RAISE EXCEPTION 'Unsafe file name.';
  END IF;
  ext := lower(coalesce(nullif(split_part(p_name, '.', -1), p_name), 'bin'));
  ext := regexp_replace(ext, '[^a-z0-9]', '', 'g');
  token := encode(gen_random_bytes(16), 'hex');
  RETURN p_owner::text || '/' || p_publication::text || '/' || token || '.' || ext;
END;
$$;

CREATE OR REPLACE FUNCTION public.publication_file_signed_url(p_file_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  rec public.publication_files%ROWTYPE;
  pub public.publications%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.publication_files WHERE id = p_file_id;
  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'File not found.';
  END IF;
  SELECT * INTO pub FROM public.publications WHERE id = rec.publication_id;
  IF NOT public.publication_row_readable(pub.status, pub.visibility, pub.created_by, pub.id) THEN
    RAISE EXCEPTION 'Not allowed to open this file.';
  END IF;
  IF rec.visibility = 'private'
     AND rec.uploaded_by IS DISTINCT FROM (SELECT auth.uid())
     AND pub.created_by IS DISTINCT FROM (SELECT auth.uid())
     AND NOT public.has_capability('review_publications') THEN
    RAISE EXCEPTION 'This file is private.';
  END IF;
  RETURN rec.storage_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.publications_guard_file_replace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND EXISTS (
       SELECT 1 FROM public.publications p
       WHERE p.id = OLD.publication_id
         AND p.status IN ('published', 'corrected')
     )
     AND (
       NEW.storage_path IS DISTINCT FROM OLD.storage_path
       OR NEW.bucket_name IS DISTINCT FROM OLD.bucket_name
     )
  THEN
    RAISE EXCEPTION 'Replace a published file by creating a new version.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publication_files_no_replace ON public.publication_files;
CREATE TRIGGER trg_publication_files_no_replace
  BEFORE UPDATE ON public.publication_files
  FOR EACH ROW EXECUTE FUNCTION public.publications_guard_file_replace();

DROP POLICY IF EXISTS publications_storage_read ON storage.objects;
CREATE POLICY publications_storage_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'publications'
    AND name NOT LIKE '%..%'
    AND (
      EXISTS (
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
                OR public.is_publication_editor()
                OR public.is_publication_reviewer()
                OR p.created_by = (SELECT auth.uid())
                OR pf.uploaded_by = (SELECT auth.uid())
              )
            )
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.publications p
        WHERE p.cover_image_path = name
          AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
      )
    )
  );

DROP POLICY IF EXISTS publications_storage_insert ON storage.objects;
CREATE POLICY publications_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'publications'
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%\\%'
    AND (
      public.is_platform_admin()
      OR public.is_publication_editor()
      OR (
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
        AND EXISTS (
          SELECT 1 FROM public.publications p
          WHERE p.id::text = (storage.foldername(name))[2]
            AND p.created_by = (SELECT auth.uid())
        )
      )
    )
  );

GRANT EXECUTE ON FUNCTION public.assert_publication_upload(text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_publication_path(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publication_file_signed_url(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.publication_setting_int(text, int) TO authenticated;
