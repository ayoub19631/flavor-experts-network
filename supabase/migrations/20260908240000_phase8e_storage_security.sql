-- Phase 8E — private marketplace storage, RFQ threads, file access.
-- No public URLs. Random names. Soft archive on replace. Anon cannot read RFQ files.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace',
  'marketplace',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

CREATE TABLE IF NOT EXISTS public.marketplace_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  entity_type text NOT NULL CHECK (entity_type IN (
    'rfq', 'quote', 'material_document', 'supplier'
  )),
  entity_id uuid NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  original_name text,
  version int NOT NULL DEFAULT 1,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_files_entity_idx
  ON public.marketplace_files (entity_type, entity_id, archived_at);

CREATE TABLE IF NOT EXISTS public.rfq_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id),
  supplier_id uuid NOT NULL REFERENCES public.supplier_profiles(id),
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rfq_threads_unique UNIQUE (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.rfq_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.rfq_threads(id),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rfq_messages_thread_idx ON public.rfq_messages (thread_id, created_at);

CREATE OR REPLACE FUNCTION public.assert_marketplace_upload(
  p_mime text,
  p_ext text,
  p_size bigint
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  mime text := lower(coalesce(p_mime, ''));
  ext text := lower(regexp_replace(coalesce(p_ext, ''), '[^a-z0-9]', '', 'g'));
BEGIN
  IF p_size IS NULL OR p_size <= 0 OR p_size > 10485760 THEN
    RAISE EXCEPTION 'File must be 10 MB or smaller.';
  END IF;
  IF position('..' in coalesce(p_ext, '')) > 0 OR position('/' in coalesce(p_ext, '')) > 0 THEN
    RAISE EXCEPTION 'Unsafe file type.';
  END IF;
  IF ext = 'pdf' AND mime = 'application/pdf' THEN
    RETURN;
  END IF;
  IF ext IN ('jpg', 'jpeg') AND mime = 'image/jpeg' THEN
    RETURN;
  END IF;
  IF ext = 'png' AND mime = 'image/png' THEN
    RETURN;
  END IF;
  IF ext = 'docx' AND mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Allowed types are PDF, JPEG, PNG, and DOCX.';
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_safe_path(
  p_owner uuid,
  p_entity uuid,
  p_name text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  ext text;
  token text;
BEGIN
  IF p_owner IS NULL OR p_entity IS NULL THEN
    RAISE EXCEPTION 'Owner and entity are required.';
  END IF;
  IF p_name IS NULL OR p_name ~ '[\\/]' OR position('..' in p_name) > 0 THEN
    RAISE EXCEPTION 'Unsafe file name.';
  END IF;
  ext := lower(coalesce(nullif(split_part(p_name, '.', -1), p_name), 'bin'));
  ext := regexp_replace(ext, '[^a-z0-9]', '', 'g');
  token := encode(gen_random_bytes(16), 'hex');
  RETURN p_owner::text || '/' || p_entity::text || '/' || token || '.' || ext;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_can_access_file(p_file_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.marketplace_files%ROWTYPE;
  me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO rec FROM public.marketplace_files WHERE id = p_file_id AND archived_at IS NULL;
  IF rec.id IS NULL THEN
    RETURN false;
  END IF;
  IF public.marketplace_is_staff() OR rec.owner_id = me THEN
    RETURN true;
  END IF;
  IF rec.entity_type = 'rfq' THEN
    RETURN public.marketplace_can_see_rfq(me, rec.entity_id);
  END IF;
  IF rec.entity_type = 'quote' THEN
    RETURN public.marketplace_can_see_quote(me, rec.entity_id);
  END IF;
  IF rec.entity_type = 'material_document' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.supplier_material_documents d
      JOIN public.supplier_materials m ON m.id = d.material_id
      JOIN public.supplier_profiles s ON s.id = m.supplier_id
      WHERE d.id = rec.entity_id
        AND (s.owner_id = me OR public.marketplace_is_staff())
    );
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_storage_readable(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_files f
    WHERE f.storage_path = p_name
      AND f.archived_at IS NULL
      AND public.marketplace_can_access_file(f.id)
  );
$$;

CREATE OR REPLACE FUNCTION public.register_marketplace_file(
  p_entity_type text,
  p_entity_id uuid,
  p_original_name text,
  p_mime text,
  p_size bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  ext text;
  path text;
  new_id uuid := gen_random_uuid();
  version int := 1;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  ext := lower(coalesce(nullif(split_part(coalesce(p_original_name, ''), '.', -1), p_original_name), 'bin'));
  PERFORM public.assert_marketplace_upload(p_mime, ext, p_size);
  IF p_entity_type = 'rfq' AND NOT EXISTS (
    SELECT 1 FROM public.rfqs WHERE id = p_entity_id AND buyer_id = me
  ) THEN
    RAISE EXCEPTION 'Not allowed to attach this RFQ file.';
  ELSIF p_entity_type = 'quote' AND NOT EXISTS (
    SELECT 1 FROM public.rfq_quotes WHERE id = p_entity_id AND supplier_owner_id = me
  ) THEN
    RAISE EXCEPTION 'Not allowed to attach this quote file.';
  ELSIF p_entity_type = 'material_document' AND NOT EXISTS (
    SELECT 1 FROM public.supplier_material_documents d
    JOIN public.supplier_materials m ON m.id = d.material_id
    JOIN public.supplier_profiles s ON s.id = m.supplier_id
    WHERE d.id = p_entity_id AND s.owner_id = me
  ) THEN
    RAISE EXCEPTION 'Not allowed to attach this document.';
  ELSIF p_entity_type = 'supplier' AND NOT public.marketplace_owns_supplier(me, p_entity_id) THEN
    RAISE EXCEPTION 'Not allowed to attach this supplier file.';
  END IF;

  UPDATE public.marketplace_files
  SET archived_at = now()
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND archived_at IS NULL
  RETURNING version + 1 INTO version;
  version := coalesce(version, 1);
  path := public.marketplace_safe_path(me, p_entity_id, p_original_name);

  INSERT INTO public.marketplace_files (
    id, owner_id, entity_type, entity_id, storage_path, mime_type, byte_size, original_name, version
  ) VALUES (
    new_id, me, p_entity_type, p_entity_id, path, lower(p_mime), p_size, p_original_name, version
  );
  RETURN jsonb_build_object('id', new_id, 'path', path, 'bucket', 'marketplace', 'version', version);
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_file_access(p_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.marketplace_files%ROWTYPE;
BEGIN
  IF NOT public.marketplace_can_access_file(p_file_id) THEN
    RAISE EXCEPTION 'Not allowed to open this file.';
  END IF;
  SELECT * INTO rec FROM public.marketplace_files WHERE id = p_file_id;
  RETURN jsonb_build_object('bucket', 'marketplace', 'path', rec.storage_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_material_document(
  p_material_id uuid,
  p_doc_type text,
  p_original_name text,
  p_mime text,
  p_size bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  doc_id uuid := gen_random_uuid();
  file_info jsonb;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supplier_materials m
    JOIN public.supplier_profiles s ON s.id = m.supplier_id
    WHERE m.id = p_material_id AND s.owner_id = me AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Material not found.';
  END IF;
  IF p_doc_type NOT IN ('coa', 'tds', 'sds', 'halal', 'kosher', 'allergen', 'gmo', 'other') THEN
    RAISE EXCEPTION 'Unsupported document type.';
  END IF;
  UPDATE public.supplier_material_documents
  SET archived_at = now()
  WHERE material_id = p_material_id AND doc_type = p_doc_type AND archived_at IS NULL;

  INSERT INTO public.supplier_material_documents (
    id, material_id, doc_type, uploaded_by, review_status
  ) VALUES (doc_id, p_material_id, p_doc_type, me, 'pending');

  file_info := public.register_marketplace_file('material_document', doc_id, p_original_name, p_mime, p_size);
  UPDATE public.supplier_material_documents
  SET storage_path = file_info->>'path',
      mime_type = lower(p_mime),
      byte_size = p_size,
      original_name = p_original_name
  WHERE id = doc_id;
  RETURN jsonb_build_object('document_id', doc_id, 'file', file_info, 'review_status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_ensure_thread(p_rfq_id uuid, p_supplier_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rfq public.rfqs%ROWTYPE;
  thread_id uuid;
BEGIN
  SELECT * INTO rfq FROM public.rfqs WHERE id = p_rfq_id;
  IF rfq.id IS NULL THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  INSERT INTO public.rfq_threads (rfq_id, supplier_id, buyer_id)
  VALUES (p_rfq_id, p_supplier_id, rfq.buyer_id)
  ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET buyer_id = EXCLUDED.buyer_id
  RETURNING id INTO thread_id;
  RETURN thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_can_see_thread(p_uid uuid, p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfq_threads t
    JOIN public.supplier_profiles s ON s.id = t.supplier_id
    WHERE t.id = p_thread_id
      AND (
        public.marketplace_is_staff()
        OR t.buyer_id = p_uid
        OR s.owner_id = p_uid
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_rate_ok(p_kind text, p_limit int)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  seen int := 0;
BEGIN
  IF me IS NULL THEN
    RETURN false;
  END IF;
  IF p_kind = 'rfq_publish' THEN
    SELECT count(*) INTO seen FROM public.rfqs
    WHERE buyer_id = me AND published_at >= date_trunc('day', now());
  ELSIF p_kind = 'quote_submit' THEN
    SELECT count(*) INTO seen FROM public.rfq_quotes
    WHERE supplier_owner_id = me AND submitted_at >= date_trunc('day', now());
  ELSIF p_kind = 'rfq_message' THEN
    SELECT count(*) INTO seen FROM public.rfq_messages
    WHERE author_id = me AND created_at >= date_trunc('day', now());
  ELSE
    RETURN false;
  END IF;
  RETURN seen < GREATEST(coalesce(p_limit, 1), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_rfq_message(
  p_rfq_id uuid,
  p_supplier_id uuid,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  rfq public.rfqs%ROWTYPE;
  supplier public.supplier_profiles%ROWTYPE;
  thread_id uuid;
  msg_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) < 1 THEN
    RAISE EXCEPTION 'Message body is required.';
  END IF;
  IF length(p_body) > 4000 THEN
    RAISE EXCEPTION 'Message is too long.';
  END IF;
  IF NOT public.marketplace_rate_ok('rfq_message', 60) THEN
    RAISE EXCEPTION 'Daily message limit reached.';
  END IF;
  SELECT * INTO rfq FROM public.rfqs WHERE id = p_rfq_id AND deleted_at IS NULL;
  SELECT * INTO supplier FROM public.supplier_profiles WHERE id = p_supplier_id;
  IF rfq.id IS NULL OR supplier.id IS NULL THEN
    RAISE EXCEPTION 'Thread not found.';
  END IF;
  IF me IS DISTINCT FROM rfq.buyer_id AND me IS DISTINCT FROM supplier.owner_id THEN
    RAISE EXCEPTION 'You cannot join this conversation.';
  END IF;
  IF NOT public.marketplace_can_see_rfq(me, p_rfq_id) THEN
    RAISE EXCEPTION 'You cannot message on this RFQ.';
  END IF;
  thread_id := public.marketplace_ensure_thread(p_rfq_id, p_supplier_id);
  INSERT INTO public.rfq_messages (thread_id, author_id, body)
  VALUES (thread_id, me, trim(p_body))
  RETURNING id INTO msg_id;
  PERFORM public.marketplace_record_event('rfq_thread', thread_id, 'message', NULL, NULL, jsonb_build_object('message_id', msg_id));
  RETURN msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_rfq_thread(p_rfq_id uuid, p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread public.rfq_threads%ROWTYPE;
  me uuid := (SELECT auth.uid());
BEGIN
  SELECT * INTO thread FROM public.rfq_threads WHERE rfq_id = p_rfq_id AND supplier_id = p_supplier_id;
  IF thread.id IS NULL THEN
    IF public.marketplace_can_see_rfq(me, p_rfq_id) THEN
      RETURN jsonb_build_object('thread_id', NULL, 'messages', '[]'::jsonb);
    END IF;
    RETURN NULL;
  END IF;
  IF NOT public.marketplace_can_see_thread(me, thread.id) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'thread_id', thread.id,
    'messages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id,
        'author_id', m.author_id,
        'body', m.body,
        'created_at', m.created_at
      ) ORDER BY m.created_at), '[]'::jsonb)
      FROM public.rfq_messages m
      WHERE m.thread_id = thread.id
    )
  );
END;
$$;

ALTER TABLE public.marketplace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_files_select ON public.marketplace_files;
CREATE POLICY marketplace_files_select ON public.marketplace_files
  FOR SELECT TO authenticated
  USING (public.marketplace_can_access_file(id));

DROP POLICY IF EXISTS marketplace_files_insert ON public.marketplace_files;
CREATE POLICY marketplace_files_insert ON public.marketplace_files
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS rfq_threads_select ON public.rfq_threads;
CREATE POLICY rfq_threads_select ON public.rfq_threads
  FOR SELECT TO authenticated
  USING (public.marketplace_can_see_thread((SELECT auth.uid()), id));

DROP POLICY IF EXISTS rfq_messages_select ON public.rfq_messages;
CREATE POLICY rfq_messages_select ON public.rfq_messages
  FOR SELECT TO authenticated
  USING (public.marketplace_can_see_thread((SELECT auth.uid()), thread_id));

REVOKE ALL ON TABLE public.marketplace_files FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.rfq_threads FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.rfq_messages FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.marketplace_files TO authenticated;
GRANT SELECT ON TABLE public.rfq_threads TO authenticated;
GRANT SELECT ON TABLE public.rfq_messages TO authenticated;

DROP POLICY IF EXISTS marketplace_objects_select ON storage.objects;
CREATE POLICY marketplace_objects_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace' AND public.marketplace_storage_readable(name));

DROP POLICY IF EXISTS marketplace_objects_insert ON storage.objects;
CREATE POLICY marketplace_objects_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketplace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS marketplace_objects_update ON storage.objects;
CREATE POLICY marketplace_objects_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketplace'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

REVOKE ALL ON FUNCTION public.assert_marketplace_upload(text, text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_safe_path(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_can_access_file(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_storage_readable(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_marketplace_file(text, uuid, text, text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_file_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_material_document(uuid, text, text, text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_ensure_thread(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_can_see_thread(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_rfq_message(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_rfq_thread(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_rate_ok(text, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assert_marketplace_upload(text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_safe_path(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_can_access_file(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_storage_readable(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_marketplace_file(text, uuid, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_file_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_material_document(uuid, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_can_see_thread(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_rfq_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_rfq_thread(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_rate_ok(text, int) TO authenticated;
