-- Phase 8F — notifications, admin review, reports, public search (no prices).
-- Email remains skipped by emit_event_notification. Soft hide/restore only.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE OR REPLACE FUNCTION public.has_capability(p_capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_capability
    WHEN 'admin' THEN public.is_platform_admin()
    WHEN 'moderate_community' THEN public.is_platform_admin() OR public.has_platform_role('community_moderator')
    WHEN 'moderate_jobs' THEN public.is_platform_admin() OR public.has_platform_role('jobs_moderator')
    WHEN 'edit_content' THEN public.is_platform_admin() OR public.has_platform_role('content_editor') OR public.has_platform_role('research_editor')
    WHEN 'support' THEN public.is_platform_admin() OR public.has_platform_role('support_agent')
    WHEN 'grant_admin' THEN public.is_super_admin()
    WHEN 'review_verification' THEN public.is_platform_admin()
    WHEN 'review_publications' THEN
      public.is_platform_admin()
      OR public.is_publication_editor()
      OR public.is_publication_reviewer()
    WHEN 'review_marketplace' THEN
      public.is_platform_admin()
      OR public.has_platform_role('community_moderator')
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
      OR public.is_super_admin()
      OR public.has_capability('review_marketplace');
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.content_reports'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%entity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.content_reports DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$$;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_entity_type_check
  CHECK (entity_type IN (
    'post', 'comment', 'member', 'message', 'forum_topic', 'forum_reply', 'job', 'company', 'publication',
    'supplier', 'supplier_material', 'rfq', 'rfq_quote', 'marketplace_document'
  ));

CREATE OR REPLACE FUNCTION public.moderation_table_for(p_entity_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_entity_type
    WHEN 'post' THEN 'social_posts'
    WHEN 'comment' THEN 'social_post_comments'
    WHEN 'forum_topic' THEN 'forum_topics'
    WHEN 'forum_reply' THEN 'forum_replies'
    WHEN 'job' THEN 'job_listings'
    WHEN 'supplier' THEN 'supplier_profiles'
    WHEN 'supplier_material' THEN 'supplier_materials'
    WHEN 'rfq' THEN 'rfqs'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_entity(p_entity_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_entity_type IN ('post', 'comment', 'forum_topic', 'forum_reply', 'member', 'message', 'publication')
      THEN public.has_capability('moderate_community')
    WHEN p_entity_type IN ('job', 'company')
      THEN public.has_capability('moderate_jobs')
    WHEN p_entity_type IN ('supplier', 'supplier_material', 'rfq', 'rfq_quote', 'marketplace_document')
      THEN public.has_capability('review_marketplace')
    ELSE public.is_platform_admin()
  END;
$$;

CREATE OR REPLACE FUNCTION public.content_owner_id(p_entity_type text, p_entity_id text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  IF p_entity_type = 'post' THEN
    SELECT author_id INTO owner FROM public.social_posts WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'comment' THEN
    SELECT author_id INTO owner FROM public.social_post_comments WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'forum_topic' THEN
    SELECT author_id INTO owner FROM public.forum_topics WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'forum_reply' THEN
    SELECT author_id INTO owner FROM public.forum_replies WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'job' THEN
    SELECT company_id INTO owner FROM public.job_listings WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'member' THEN
    owner := p_entity_id::uuid;
  ELSIF p_entity_type = 'supplier' THEN
    SELECT owner_id INTO owner FROM public.supplier_profiles WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'supplier_material' THEN
    SELECT s.owner_id INTO owner
    FROM public.supplier_materials m
    JOIN public.supplier_profiles s ON s.id = m.supplier_id
    WHERE m.id = p_entity_id::uuid;
  ELSIF p_entity_type = 'rfq' THEN
    SELECT buyer_id INTO owner FROM public.rfqs WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'rfq_quote' THEN
    SELECT supplier_owner_id INTO owner FROM public.rfq_quotes WHERE id = p_entity_id::uuid;
  END IF;
  RETURN owner;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_soft_delete(p_table text, p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'social_posts' THEN
    UPDATE public.social_posts SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'social_post_comments' THEN
    UPDATE public.social_post_comments SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'forum_topics' THEN
    UPDATE public.forum_topics SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'forum_replies' THEN
    UPDATE public.forum_replies SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'job_listings' THEN
    UPDATE public.job_listings SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'supplier_profiles' THEN
    UPDATE public.supplier_profiles SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason, listing_status = 'hidden' WHERE id = p_id;
  ELSIF p_table = 'supplier_materials' THEN
    UPDATE public.supplier_materials SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason, status = 'hidden' WHERE id = p_id;
  ELSIF p_table = 'rfqs' THEN
    UPDATE public.rfqs SET is_suspended = true, suspended_reason = p_reason, updated_at = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unsupported content type.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_restore(p_table text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'social_posts' THEN
    UPDATE public.social_posts SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'social_post_comments' THEN
    UPDATE public.social_post_comments SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'forum_topics' THEN
    UPDATE public.forum_topics SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'forum_replies' THEN
    UPDATE public.forum_replies SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'job_listings' THEN
    UPDATE public.job_listings SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'supplier_profiles' THEN
    UPDATE public.supplier_profiles SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL, listing_status = 'approved' WHERE id = p_id;
  ELSIF p_table = 'supplier_materials' THEN
    UPDATE public.supplier_materials SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL, status = 'published' WHERE id = p_id;
  ELSIF p_table = 'rfqs' THEN
    UPDATE public.rfqs SET is_suspended = false, suspended_reason = NULL, updated_at = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unsupported content type.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_record_event(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_from text DEFAULT NULL,
  p_to text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  rfq public.rfqs%ROWTYPE;
  quote public.rfq_quotes%ROWTYPE;
  invite record;
  recipient uuid;
BEGIN
  INSERT INTO public.marketplace_events (actor_id, entity_type, entity_id, action, from_status, to_status, payload)
  VALUES (me, p_entity_type, p_entity_id, p_action, p_from, p_to, coalesce(p_payload, '{}'::jsonb));

  IF p_entity_type = 'rfq' AND p_action = 'published' THEN
    SELECT * INTO rfq FROM public.rfqs WHERE id = p_entity_id;
    FOR invite IN
      SELECT s.owner_id
      FROM public.rfq_invites i
      JOIN public.supplier_profiles s ON s.id = i.supplier_id
      WHERE i.rfq_id = p_entity_id
    LOOP
      PERFORM public.emit_event_notification(
        invite.owner_id,
        'New RFQ invitation',
        'You were invited to quote on ' || coalesce(rfq.title, 'an RFQ'),
        'marketplace_rfq',
        '/supplier/quotes',
        me,
        'rfq',
        p_entity_id::text,
        'rfq-invite:' || p_entity_id::text || ':' || invite.owner_id::text
      );
    END LOOP;
  ELSIF p_entity_type = 'quote' THEN
    SELECT * INTO quote FROM public.rfq_quotes WHERE id = p_entity_id;
    SELECT * INTO rfq FROM public.rfqs WHERE id = quote.rfq_id;
    IF p_action IN ('submitted', 'revised') THEN
      PERFORM public.emit_event_notification(
        rfq.buyer_id,
        CASE WHEN p_action = 'revised' THEN 'Quote revised' ELSE 'New quote received' END,
        'A supplier submitted a quote on ' || coalesce(rfq.title, 'your RFQ'),
        'marketplace_quote',
        '/dashboard/rfqs/' || rfq.id::text,
        me,
        'rfq_quote',
        p_entity_id::text,
        'quote-' || p_action || ':' || p_entity_id::text || ':' || coalesce(p_payload->>'revision_no', '1')
      );
    ELSIF p_action IN ('shortlist', 'accept', 'reject', 'withdrawn') THEN
      recipient := CASE WHEN p_action = 'withdrawn' THEN rfq.buyer_id ELSE quote.supplier_owner_id END;
      PERFORM public.emit_event_notification(
        recipient,
        'Quote update',
        'Quote status is now ' || p_action,
        'marketplace_quote',
        CASE WHEN recipient = rfq.buyer_id THEN '/dashboard/rfqs/' || rfq.id::text ELSE '/supplier/quotes' END,
        me,
        'rfq_quote',
        p_entity_id::text,
        'quote-decision:' || p_entity_id::text || ':' || p_action
      );
    END IF;
  ELSIF p_entity_type = 'rfq_thread' AND p_action = 'message' THEN
    SELECT t.buyer_id, s.owner_id
    INTO rfq.buyer_id, quote.supplier_owner_id
    FROM public.rfq_threads t
    JOIN public.supplier_profiles s ON s.id = t.supplier_id
    WHERE t.id = p_entity_id;
    recipient := CASE WHEN me = rfq.buyer_id THEN quote.supplier_owner_id ELSE rfq.buyer_id END;
    PERFORM public.emit_event_notification(
      recipient,
      'New RFQ message',
      'You have a new private RFQ message',
      'marketplace_message',
      CASE WHEN recipient = rfq.buyer_id THEN '/dashboard/rfqs' ELSE '/supplier/quotes' END,
      me,
      'rfq_thread',
      p_entity_id::text,
      'rfq-msg:' || coalesce(p_payload->>'message_id', p_entity_id::text)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_marketplace_item(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_capability('review_marketplace') THEN
    RAISE EXCEPTION 'Not allowed.';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'hide', 'restore', 'suspend') THEN
    RAISE EXCEPTION 'Unsupported review action.';
  END IF;
  IF p_entity_type = 'supplier' THEN
    IF p_action = 'approve' THEN
      UPDATE public.supplier_profiles
      SET listing_status = 'approved', listed_at = coalesce(listed_at, now()), is_suspended = false, updated_at = now()
      WHERE id = p_entity_id;
    ELSIF p_action = 'reject' THEN
      UPDATE public.supplier_profiles SET listing_status = 'rejected', updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'hide' THEN
      UPDATE public.supplier_profiles SET listing_status = 'hidden', updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'restore' THEN
      UPDATE public.supplier_profiles SET listing_status = 'approved', deleted_at = NULL, is_suspended = false, updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'suspend' THEN
      UPDATE public.supplier_profiles SET is_suspended = true, suspended_reason = trim(p_reason), updated_at = now() WHERE id = p_entity_id;
    END IF;
  ELSIF p_entity_type = 'supplier_material' THEN
    IF p_action = 'approve' THEN
      UPDATE public.supplier_materials SET status = 'published', updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'reject' THEN
      UPDATE public.supplier_materials SET status = 'rejected', updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'hide' THEN
      UPDATE public.supplier_materials SET status = 'hidden', updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'restore' THEN
      UPDATE public.supplier_materials SET status = 'published', deleted_at = NULL, updated_at = now() WHERE id = p_entity_id;
    END IF;
  ELSIF p_entity_type = 'marketplace_document' THEN
    UPDATE public.supplier_material_documents
    SET review_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
        reviewed_by = (SELECT auth.uid()),
        reviewed_at = now(),
        review_reason = trim(p_reason)
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'rfq' THEN
    IF p_action = 'suspend' THEN
      UPDATE public.rfqs SET is_suspended = true, suspended_reason = trim(p_reason), updated_at = now() WHERE id = p_entity_id;
    ELSIF p_action = 'restore' THEN
      UPDATE public.rfqs SET is_suspended = false, suspended_reason = NULL, updated_at = now() WHERE id = p_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported marketplace entity.';
  END IF;
  PERFORM public.write_audit_log(
    'review_marketplace_item',
    p_entity_type,
    p_entity_id::text,
    NULL,
    jsonb_build_object('action', p_action),
    trim(p_reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_marketplace_review_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_capability('review_marketplace') THEN
    RAISE EXCEPTION 'Not allowed.';
  END IF;
  RETURN jsonb_build_object(
    'suppliers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'trade_name', s.trade_name, 'status', s.listing_status, 'updated_at', s.updated_at
      ) ORDER BY s.updated_at DESC), '[]'::jsonb)
      FROM public.supplier_profiles s
      WHERE s.listing_status IN ('pending_review', 'hidden', 'rejected') AND s.deleted_at IS NULL
    ),
    'materials', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'trade_name', m.trade_name, 'status', m.status, 'updated_at', m.updated_at
      ) ORDER BY m.updated_at DESC), '[]'::jsonb)
      FROM public.supplier_materials m
      WHERE m.status IN ('pending_review', 'hidden', 'rejected') AND m.deleted_at IS NULL
    ),
    'documents', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'doc_type', d.doc_type, 'review_status', d.review_status, 'material_id', d.material_id
      ) ORDER BY d.created_at DESC), '[]'::jsonb)
      FROM public.supplier_material_documents d
      WHERE d.review_status = 'pending' AND d.archived_at IS NULL
    ),
    'reports', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'entity_type', r.entity_type, 'entity_id', r.entity_id, 'reason', r.reason, 'status', r.status
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.content_reports r
      WHERE r.entity_type IN ('supplier', 'supplier_material', 'rfq', 'rfq_quote', 'marketplace_document')
        AND r.status IN ('open', 'under_review')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.report_marketplace(
  p_entity_type text,
  p_entity_id text,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  IF p_entity_type NOT IN ('supplier', 'supplier_material', 'rfq', 'rfq_quote', 'marketplace_document') THEN
    RAISE EXCEPTION 'Unsupported report type.';
  END IF;
  INSERT INTO public.content_reports (reporter_id, entity_type, entity_id, reason, details)
  VALUES (me, p_entity_type, p_entity_id, trim(p_reason), NULLIF(trim(p_details), ''))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_search(
  p_query text,
  p_types text[] DEFAULT NULL,
  p_limit int DEFAULT 12
)
RETURNS TABLE (
  entity_type text,
  entity_id text,
  title text,
  subtitle text,
  href text,
  rank real,
  created_at timestamptz,
  snippet text,
  is_verified boolean,
  has_more boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  nq text;
  raw_q text;
  q tsquery;
  want text[];
  lim int;
BEGIN
  raw_q := btrim(coalesce(p_query, ''));
  IF char_length(raw_q) < 2 OR char_length(raw_q) > 200 THEN
    RETURN;
  END IF;
  IF public.search_query_is_sensitive(raw_q) THEN
    RETURN;
  END IF;
  nq := public.normalize_search_text(raw_q);
  q := public.search_parse_tsquery(raw_q);
  lim := LEAST(GREATEST(coalesce(p_limit, 12), 1), 20);
  want := ARRAY(
    SELECT DISTINCT CASE lower(t)
      WHEN 'suppliers' THEN 'suppliers'
      WHEN 'supplier' THEN 'suppliers'
      WHEN 'raw_materials' THEN 'raw_materials'
      WHEN 'raw_material' THEN 'raw_materials'
      ELSE NULL
    END
    FROM unnest(coalesce(p_types, ARRAY['suppliers', 'raw_materials'])) t
  );
  want := ARRAY(SELECT x FROM unnest(want) x WHERE x IS NOT NULL);

  RETURN QUERY
  WITH hits AS (
    SELECT
      'suppliers'::text AS entity_type,
      s.id::text AS entity_id,
      s.trade_name AS title,
      nullif(concat_ws(' · ', s.supplier_type, s.country, s.city), '') AS subtitle,
      '/marketplace/suppliers/' || s.slug AS href,
      public.search_rank(
        nq,
        public.normalize_search_text(s.trade_name),
        coalesce(s.search_norm, ''),
        ts_rank_cd(s.search_vector, q)::double precision,
        similarity(coalesce(s.search_norm, ''), nq)::double precision,
        public.marketplace_is_verified_company(s.owner_id),
        0.45,
        0.1
      ) AS rank,
      s.updated_at AS created_at,
      left(coalesce(s.about, array_to_string(s.markets, ', ')), 160) AS snippet,
      public.marketplace_is_verified_company(s.owner_id) AS is_verified
    FROM public.supplier_profiles s
    WHERE (cardinality(want) = 0 OR 'suppliers' = ANY (want))
      AND public.marketplace_public_supplier_visible(s)
      AND public.search_term_matches(nq, coalesce(s.search_norm, ''), s.search_vector, q, 0.28)

    UNION ALL

    SELECT
      'raw_materials',
      m.id::text,
      m.trade_name,
      nullif(concat_ws(' · ', s.trade_name, m.category), ''),
      '/marketplace/materials/' || m.slug,
      public.search_rank(
        nq,
        public.normalize_search_text(m.trade_name),
        coalesce(m.search_norm, ''),
        ts_rank_cd(m.search_vector, q)::double precision,
        similarity(coalesce(m.search_norm, ''), nq)::double precision,
        public.marketplace_is_verified_company(s.owner_id),
        0.4,
        0.1
      ),
      m.updated_at,
      left(coalesce(m.generic_name, m.physical_form, ''), 160),
      public.marketplace_is_verified_company(s.owner_id)
    FROM public.supplier_materials m
    JOIN public.supplier_profiles s ON s.id = m.supplier_id
    WHERE (cardinality(want) = 0 OR 'raw_materials' = ANY (want))
      AND public.marketplace_public_material_visible(m)
      AND public.search_term_matches(nq, coalesce(m.search_norm, ''), m.search_vector, q, 0.28)
  )
  SELECT h.entity_type, h.entity_id, h.title, h.subtitle, h.href, h.rank, h.created_at, h.snippet, h.is_verified, false
  FROM hits h
  ORDER BY h.rank DESC, h.created_at DESC
  LIMIT lim;
END;
$$;

REVOKE ALL ON FUNCTION public.has_capability(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_record_event(text, uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_marketplace_item(text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_marketplace_review_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_marketplace(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_search(text, text[], int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_ensure_thread(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_capability(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_record_event(text, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_marketplace_item(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_marketplace_review_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_marketplace(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_search(text, text[], int) TO anon, authenticated;

-- Anon SELECT is granted so RLS can return zero rows instead of erroring.
GRANT SELECT ON TABLE public.rfqs TO anon;
GRANT SELECT ON TABLE public.rfq_lines TO anon;
GRANT SELECT ON TABLE public.rfq_invites TO anon;
GRANT SELECT ON TABLE public.rfq_quotes TO anon;
GRANT SELECT ON TABLE public.rfq_quote_revisions TO anon;
GRANT SELECT ON TABLE public.rfq_threads TO anon;
GRANT SELECT ON TABLE public.rfq_messages TO anon;
GRANT SELECT ON TABLE public.marketplace_files TO anon;
GRANT SELECT ON TABLE public.marketplace_events TO anon;
GRANT SELECT ON TABLE public.supplier_material_documents TO anon;
