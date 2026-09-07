-- Phase 5B — private verification submission and review
-- Local/staging only. No DROP TABLE. No production apply.

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS attestation_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'verification_requests_status_check'
  ) THEN
    ALTER TABLE public.verification_requests DROP CONSTRAINT verification_requests_status_check;
  END IF;
  ALTER TABLE public.verification_requests
    ADD CONSTRAINT verification_requests_status_check
    CHECK (status IN (
      'draft', 'submitted', 'under_review', 'more_information_required',
      'needs_more_information', 'approved', 'rejected', 'revoked'
    ));
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS verification_requests_one_open_idx
  ON public.verification_requests (user_id, kind)
  WHERE status IN ('draft', 'submitted', 'under_review', 'more_information_required', 'needs_more_information');

ALTER TABLE public.verification_documents
  ADD COLUMN IF NOT EXISTS original_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS checksum text;

CREATE TABLE IF NOT EXISTS public.verification_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_review_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verification_review_actions_read ON public.verification_review_actions;
CREATE POLICY verification_review_actions_read ON public.verification_review_actions
  FOR SELECT TO authenticated
  USING (
    public.has_capability('review_verification')
    OR EXISTS (
      SELECT 1 FROM public.verification_requests r
      WHERE r.id = request_id AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS verification_requests_own ON public.verification_requests;
CREATE POLICY verification_requests_select ON public.verification_requests
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_capability('review_verification'));

CREATE POLICY verification_requests_insert ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY verification_requests_update_own ON public.verification_requests
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status IN ('draft', 'needs_more_information', 'more_information_required'))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS verification_documents_own ON public.verification_documents;
CREATE POLICY verification_documents_select ON public.verification_documents
  FOR SELECT TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.has_capability('review_verification')
    OR EXISTS (
      SELECT 1 FROM public.verification_requests r
      WHERE r.id = request_id AND r.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY verification_documents_insert ON public.verification_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND storage_path LIKE ((SELECT auth.uid())::text || '/%')
    AND EXISTS (
      SELECT 1 FROM public.verification_requests r
      WHERE r.id = request_id
        AND r.user_id = (SELECT auth.uid())
        AND r.status IN ('draft', 'needs_more_information', 'more_information_required')
    )
  );

CREATE POLICY verification_documents_delete ON public.verification_documents
  FOR DELETE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.verification_requests r
      WHERE r.id = request_id
        AND r.user_id = (SELECT auth.uid())
        AND r.status IN ('draft', 'needs_more_information', 'more_information_required')
    )
  );

CREATE OR REPLACE FUNCTION public.sanitize_verification_filename(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(lower(coalesce(p_name, 'document')), '[^a-z0-9._-]+', '-', 'g'), ''),
    'document'
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_verification_upload(
  p_mime text,
  p_ext text,
  p_size bigint
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_size IS NULL OR p_size <= 0 OR p_size > 10485760 THEN
    RAISE EXCEPTION 'File must be 10 MB or smaller.';
  END IF;
  IF lower(coalesce(p_ext, '')) NOT IN ('pdf', 'jpg', 'jpeg', 'png') THEN
    RAISE EXCEPTION 'Only PDF, JPEG, and PNG files are allowed.';
  END IF;
  IF lower(coalesce(p_mime, '')) NOT IN ('application/pdf', 'image/jpeg', 'image/png') THEN
    RAISE EXCEPTION 'MIME type is not allowed.';
  END IF;
  IF lower(coalesce(p_ext, '')) IN ('svg', 'html', 'htm', 'js', 'exe', 'msi', 'bat', 'cmd', 'sh') THEN
    RAISE EXCEPTION 'This file type is not allowed.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_verification_draft(
  p_kind text,
  p_full_name text DEFAULT NULL,
  p_organization_name text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  existing uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_kind NOT IN ('professional', 'company') THEN
    RAISE EXCEPTION 'Request type must be professional or company.';
  END IF;

  SELECT id INTO existing
  FROM public.verification_requests
  WHERE user_id = me AND kind = p_kind
    AND status IN ('draft', 'submitted', 'under_review', 'more_information_required', 'needs_more_information')
  ORDER BY updated_at DESC
  LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO public.verification_requests (
      user_id, kind, status, full_name, organization_name, country, website, notes
    ) VALUES (
      me, p_kind, 'draft', p_full_name, p_organization_name, p_country, p_website, p_notes
    )
    RETURNING id INTO existing;
  ELSE
    UPDATE public.verification_requests
    SET
      full_name = COALESCE(p_full_name, full_name),
      organization_name = COALESCE(p_organization_name, organization_name),
      country = COALESCE(p_country, country),
      website = COALESCE(p_website, website),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = existing
      AND user_id = me
      AND status IN ('draft', 'needs_more_information', 'more_information_required');
  END IF;

  RETURN existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_request_id uuid,
  p_attestation boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  docs int;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_attestation IS NOT TRUE THEN
    RAISE EXCEPTION 'You must confirm the information is accurate.';
  END IF;

  SELECT count(*) INTO docs
  FROM public.verification_documents
  WHERE request_id = p_request_id;

  IF docs < 1 THEN
    RAISE EXCEPTION 'Upload at least one document.';
  END IF;

  UPDATE public.verification_requests
  SET
    status = 'submitted',
    attestation_accepted = true,
    decision_reason = NULL,
    reviewer_id = NULL,
    updated_at = now()
  WHERE id = p_request_id
    AND user_id = me
    AND status IN ('draft', 'needs_more_information', 'more_information_required');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This request cannot be submitted.';
  END IF;

  RETURN p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_verification_object(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_path LIKE ((SELECT auth.uid())::text || '/%')
    OR public.has_capability('review_verification');
$$;

CREATE OR REPLACE FUNCTION public.review_verification_request(
  p_request_id uuid,
  p_decision text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.verification_requests%ROWTYPE;
  role_name text;
  me uuid := (SELECT auth.uid());
BEGIN
  IF NOT public.has_capability('review_verification') THEN
    RAISE EXCEPTION 'Not allowed to review verification requests.';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'needs_more_information', 'under_review') THEN
    RAISE EXCEPTION 'Invalid verification decision.';
  END IF;
  IF p_decision IN ('rejected', 'needs_more_information') AND (p_reason IS NULL OR length(trim(p_reason)) < 3) THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;

  SELECT * INTO req FROM public.verification_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;
  IF req.user_id = me AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'You cannot review your own verification request.';
  END IF;

  UPDATE public.verification_requests
  SET
    status = p_decision,
    reviewer_id = me,
    decision_reason = NULLIF(trim(p_reason), ''),
    updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.verification_review_actions (request_id, actor_id, action, reason)
  VALUES (p_request_id, me, p_decision, NULLIF(trim(p_reason), ''));

  IF p_decision = 'approved' THEN
    role_name := CASE WHEN req.kind = 'company' THEN 'verified_company' ELSE 'verified_professional' END;
    INSERT INTO public.platform_roles (user_id, role, granted_by)
    VALUES (req.user_id, role_name, me)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, reason)
  VALUES (
    me,
    'review_verification',
    'verification_request',
    p_request_id::text,
    jsonb_build_object('status', req.status),
    jsonb_build_object('status', p_decision, 'role', CASE WHEN p_decision = 'approved' THEN
      CASE WHEN req.kind = 'company' THEN 'verified_company' ELSE 'verified_professional' END
    ELSE NULL END),
    NULLIF(trim(p_reason), '')
  );
END;
$$;

DROP POLICY IF EXISTS verifications_select ON storage.objects;
CREATE POLICY verifications_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND public.can_access_verification_object(name)
  );

DROP POLICY IF EXISTS verifications_insert ON storage.objects;
CREATE POLICY verifications_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verifications'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS verifications_update ON storage.objects;
CREATE POLICY verifications_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'verifications'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'verifications'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS verifications_delete ON storage.objects;
CREATE POLICY verifications_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verifications'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

GRANT EXECUTE ON FUNCTION public.upsert_verification_draft(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_verification_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_verification_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_verification_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_verification_filename(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_verification_upload(text, text, bigint) TO authenticated;
GRANT SELECT ON public.verification_review_actions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.verification_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
