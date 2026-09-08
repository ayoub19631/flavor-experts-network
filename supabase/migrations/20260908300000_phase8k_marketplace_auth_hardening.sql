-- Phase 8K — close HIGH/MEDIUM marketplace authorization gaps from review.
-- Do not edit applied 8A–8J files.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE OR REPLACE FUNCTION public.apply_soft_delete(p_table text, p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entity text;
BEGIN
  entity := CASE p_table
    WHEN 'social_posts' THEN 'post'
    WHEN 'social_post_comments' THEN 'comment'
    WHEN 'forum_topics' THEN 'forum_topic'
    WHEN 'forum_replies' THEN 'forum_reply'
    WHEN 'job_listings' THEN 'job'
    WHEN 'supplier_profiles' THEN 'supplier'
    WHEN 'supplier_materials' THEN 'supplier_material'
    WHEN 'rfqs' THEN 'rfq'
    ELSE NULL
  END;
  IF entity IS NULL OR NOT public.can_moderate_entity(entity) THEN
    RAISE EXCEPTION 'Not allowed.';
  END IF;
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
DECLARE
  entity text;
BEGIN
  entity := CASE p_table
    WHEN 'social_posts' THEN 'post'
    WHEN 'social_post_comments' THEN 'comment'
    WHEN 'forum_topics' THEN 'forum_topic'
    WHEN 'forum_replies' THEN 'forum_reply'
    WHEN 'job_listings' THEN 'job'
    WHEN 'supplier_profiles' THEN 'supplier'
    WHEN 'supplier_materials' THEN 'supplier_material'
    WHEN 'rfqs' THEN 'rfq'
    ELSE NULL
  END;
  IF entity IS NULL OR NOT public.can_moderate_entity(entity) THEN
    RAISE EXCEPTION 'Not allowed.';
  END IF;
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

REVOKE ALL ON FUNCTION public.apply_soft_delete(text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_restore(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_soft_delete(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_restore(text, uuid) TO authenticated;

DROP POLICY IF EXISTS rfq_lines_all ON public.rfq_lines;
DROP POLICY IF EXISTS rfq_lines_select ON public.rfq_lines;
DROP POLICY IF EXISTS rfq_lines_insert ON public.rfq_lines;
DROP POLICY IF EXISTS rfq_lines_update ON public.rfq_lines;
DROP POLICY IF EXISTS rfq_lines_delete ON public.rfq_lines;

CREATE POLICY rfq_lines_select ON public.rfq_lines
  FOR SELECT TO authenticated
  USING (public.marketplace_can_see_rfq((SELECT auth.uid()), rfq_id));

CREATE POLICY rfq_lines_insert ON public.rfq_lines
  FOR INSERT TO authenticated
  WITH CHECK (
    public.marketplace_is_staff()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid()))
  );

CREATE POLICY rfq_lines_update ON public.rfq_lines
  FOR UPDATE TO authenticated
  USING (
    public.marketplace_is_staff()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    public.marketplace_is_staff()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid()))
  );

CREATE POLICY rfq_lines_delete ON public.rfq_lines
  FOR DELETE TO authenticated
  USING (
    public.marketplace_is_staff()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.rfq_quotes_guard_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  own_supplier uuid;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.marketplace_is_staff() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.supplier_owner_id := (SELECT auth.uid());
      SELECT id INTO own_supplier
      FROM public.supplier_profiles
      WHERE owner_id = NEW.supplier_owner_id AND deleted_at IS NULL
      LIMIT 1;
      IF own_supplier IS NULL THEN
        RAISE EXCEPTION 'Supplier profile required.';
      END IF;
      NEW.supplier_id := own_supplier;
      NEW.status := 'draft';
    ELSE
      NEW.rfq_id := OLD.rfq_id;
      NEW.supplier_id := OLD.supplier_id;
      NEW.supplier_owner_id := OLD.supplier_owner_id;
      NEW.status := OLD.status;
      NEW.current_revision_id := OLD.current_revision_id;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS rfq_quotes_insert ON public.rfq_quotes;
CREATE POLICY rfq_quotes_insert ON public.rfq_quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    supplier_owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = supplier_id AND s.owner_id = (SELECT auth.uid()) AND s.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.supplier_material_documents_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.marketplace_is_staff() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.review_status := 'pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.review_reason := NULL;
    ELSE
      NEW.review_status := OLD.review_status;
      NEW.reviewed_by := OLD.reviewed_by;
      NEW.reviewed_at := OLD.reviewed_at;
      NEW.review_reason := OLD.review_reason;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_material_documents_guard ON public.supplier_material_documents;
CREATE TRIGGER trg_supplier_material_documents_guard
  BEFORE INSERT OR UPDATE ON public.supplier_material_documents
  FOR EACH ROW EXECUTE FUNCTION public.supplier_material_documents_guard();

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
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF NOT public.marketplace_is_staff() THEN
    IF p_entity_type = 'rfq' AND NOT public.marketplace_can_see_rfq(me, p_entity_id) THEN
      RAISE EXCEPTION 'Not allowed.';
    ELSIF p_entity_type = 'quote' AND NOT public.marketplace_can_see_quote(me, p_entity_id) THEN
      RAISE EXCEPTION 'Not allowed.';
    ELSIF p_entity_type = 'rfq_thread' AND NOT public.marketplace_can_see_thread(me, p_entity_id) THEN
      RAISE EXCEPTION 'Not allowed.';
    ELSIF p_entity_type NOT IN ('rfq', 'quote', 'rfq_thread') THEN
      RAISE EXCEPTION 'Not allowed.';
    END IF;
  END IF;

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
  IF public.is_blocked_pair(rfq.buyer_id, supplier.owner_id) THEN
    RAISE EXCEPTION 'Messaging is not available.';
  END IF;
  thread_id := public.marketplace_ensure_thread(p_rfq_id, p_supplier_id);
  INSERT INTO public.rfq_messages (thread_id, author_id, body)
  VALUES (thread_id, me, trim(p_body))
  RETURNING id INTO msg_id;
  PERFORM public.marketplace_record_event('rfq_thread', thread_id, 'message', NULL, NULL, jsonb_build_object('message_id', msg_id));
  RETURN msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_material(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.supplier_materials%ROWTYPE;
  s public.supplier_profiles%ROWTYPE;
  viewer uuid := (SELECT auth.uid());
BEGIN
  SELECT * INTO m FROM public.supplier_materials WHERE slug = public.marketplace_slugify(p_slug) LIMIT 1;
  IF m.id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO s FROM public.supplier_profiles WHERE id = m.supplier_id;
  IF NOT public.marketplace_public_material_visible(m)
     AND s.owner_id IS DISTINCT FROM viewer
     AND NOT public.marketplace_is_staff() THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', m.id,
    'slug', m.slug,
    'trade_name', m.trade_name,
    'generic_name', m.generic_name,
    'category', m.category,
    'e_number', m.e_number,
    'fema', m.fema,
    'cas', m.cas,
    'food_grade', m.food_grade,
    'manufacturer', m.manufacturer,
    'country_of_origin', m.country_of_origin,
    'country_of_manufacture', m.country_of_manufacture,
    'physical_form', m.physical_form,
    'applications', m.applications,
    'solubility', m.solubility,
    'shelf_life', m.shelf_life,
    'packaging', m.packaging,
    'moq', m.moq,
    'moq_unit', m.moq_unit,
    'lead_time_days', m.lead_time_days,
    'sample_available', m.sample_available,
    'incoterms', m.incoterms,
    'regulatory_regions', m.regulatory_regions,
    'certifications', m.certifications,
    'certifications_claimed_only', true,
    'status', m.status,
    'updated_at', m.updated_at,
    'documents', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id,
        'doc_type', d.doc_type,
        'review_status', d.review_status,
        'version', d.version
      ) ORDER BY d.created_at DESC), '[]'::jsonb)
      FROM public.supplier_material_documents d
      WHERE d.material_id = m.id
        AND d.archived_at IS NULL
        AND (
          d.review_status = 'approved'
          OR s.owner_id = viewer
          OR public.marketplace_is_staff()
        )
    ),
    'supplier', jsonb_build_object(
      'id', s.id,
      'slug', s.slug,
      'trade_name', s.trade_name,
      'legal_name', s.legal_name,
      'supplier_type', s.supplier_type,
      'country', s.country,
      'city', s.city,
      'is_verified', public.marketplace_is_verified_company(s.owner_id)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_material(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_material(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.marketplace_record_event(text, uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_record_event(text, uuid, text, text, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.send_rfq_message(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_rfq_message(uuid, uuid, text) TO authenticated;
