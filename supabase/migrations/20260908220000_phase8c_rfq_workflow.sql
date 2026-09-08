-- Phase 8C — RFQ lifecycle for buyers and qualified suppliers.
-- Acceptance is not a purchase contract. Soft archive only.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE TABLE IF NOT EXISTS public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  company_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'published', 'invited', 'receiving_quotes', 'under_review',
      'shortlisted', 'accepted', 'closed', 'cancelled', 'expired'
    )),
  visibility text NOT NULL DEFAULT 'qualified'
    CHECK (visibility IN ('qualified', 'invited')),
  delivery_country text,
  delivery_city text,
  currency text,
  incoterm text,
  needed_by date,
  wants_sample boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  is_suspended boolean NOT NULL DEFAULT false,
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text
);

CREATE TABLE IF NOT EXISTS public.rfq_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id),
  material_id uuid REFERENCES public.supplier_materials(id),
  material_name text NOT NULL,
  specs text,
  quantity numeric,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rfq_invites (
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id),
  supplier_id uuid NOT NULL REFERENCES public.supplier_profiles(id),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.rfqs_guard_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.marketplace_is_staff() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.buyer_id := (SELECT auth.uid());
      NEW.status := 'draft';
      NEW.is_suspended := false;
    ELSE
      NEW.buyer_id := OLD.buyer_id;
      NEW.company_id := OLD.company_id;
      NEW.status := OLD.status;
      NEW.is_suspended := OLD.is_suspended;
      NEW.visibility := OLD.visibility;
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rfqs_guard_write ON public.rfqs;
CREATE TRIGGER trg_rfqs_guard_write
  BEFORE INSERT OR UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.rfqs_guard_write();

CREATE INDEX IF NOT EXISTS rfqs_buyer_idx ON public.rfqs (buyer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS rfqs_status_idx ON public.rfqs (status, expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS rfq_lines_rfq_idx ON public.rfq_lines (rfq_id);
CREATE INDEX IF NOT EXISTS rfq_invites_supplier_idx ON public.rfq_invites (supplier_id);
CREATE INDEX IF NOT EXISTS marketplace_events_entity_idx ON public.marketplace_events (entity_type, entity_id, created_at DESC);

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
BEGIN
  INSERT INTO public.marketplace_events (actor_id, entity_type, entity_id, action, from_status, to_status, payload)
  VALUES ((SELECT auth.uid()), p_entity_type, p_entity_id, p_action, p_from, p_to, coalesce(p_payload, '{}'::jsonb));
END;
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
  ELSE
    RETURN false;
  END IF;
  RETURN seen < GREATEST(coalesce(p_limit, 1), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_expire_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rfqs
  SET status = 'expired', updated_at = now()
  WHERE deleted_at IS NULL
    AND status IN ('published', 'invited', 'receiving_quotes', 'under_review', 'shortlisted')
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_can_see_rfq(p_uid uuid, p_rfq_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = p_rfq_id
      AND r.deleted_at IS NULL
      AND (
        public.marketplace_is_staff()
        OR r.buyer_id = p_uid
        OR (
          r.status <> 'draft'
          AND r.is_suspended = false
          AND EXISTS (
            SELECT 1 FROM public.supplier_profiles s
            WHERE s.owner_id = p_uid
              AND s.deleted_at IS NULL
              AND (
                EXISTS (SELECT 1 FROM public.rfq_invites i WHERE i.rfq_id = r.id AND i.supplier_id = s.id)
                OR (
                  r.visibility = 'qualified'
                  AND r.status IN ('published', 'receiving_quotes', 'under_review', 'shortlisted', 'accepted', 'closed', 'expired')
                  AND s.listing_status = 'approved'
                  AND s.is_suspended = false
                )
              )
          )
        )
      )
  );
$$;

ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfqs_select ON public.rfqs;
CREATE POLICY rfqs_select ON public.rfqs
  FOR SELECT TO authenticated
  USING (public.marketplace_can_see_rfq((SELECT auth.uid()), id));

DROP POLICY IF EXISTS rfqs_insert ON public.rfqs;
CREATE POLICY rfqs_insert ON public.rfqs
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = (SELECT auth.uid()) AND status = 'draft');

DROP POLICY IF EXISTS rfqs_update ON public.rfqs;
CREATE POLICY rfqs_update ON public.rfqs
  FOR UPDATE TO authenticated
  USING (buyer_id = (SELECT auth.uid()) OR public.marketplace_is_staff())
  WITH CHECK (buyer_id = (SELECT auth.uid()) OR public.marketplace_is_staff());

DROP POLICY IF EXISTS rfq_lines_all ON public.rfq_lines;
CREATE POLICY rfq_lines_all ON public.rfq_lines
  FOR ALL TO authenticated
  USING (public.marketplace_can_see_rfq((SELECT auth.uid()), rfq_id))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rfqs r
      WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid())
    )
    OR public.marketplace_is_staff()
  );

DROP POLICY IF EXISTS rfq_invites_select ON public.rfq_invites;
CREATE POLICY rfq_invites_select ON public.rfq_invites
  FOR SELECT TO authenticated
  USING (
    public.marketplace_can_see_rfq((SELECT auth.uid()), rfq_id)
    OR EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = supplier_id AND s.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS rfq_invites_write ON public.rfq_invites;
CREATE POLICY rfq_invites_write ON public.rfq_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.rfqs r
      WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS marketplace_events_select ON public.marketplace_events;
CREATE POLICY marketplace_events_select ON public.marketplace_events
  FOR SELECT TO authenticated
  USING (
    public.marketplace_is_staff()
    OR actor_id = (SELECT auth.uid())
    OR (entity_type = 'rfq' AND public.marketplace_can_see_rfq((SELECT auth.uid()), entity_id))
  );

REVOKE ALL ON TABLE public.rfqs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.rfq_lines FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.rfq_invites FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.marketplace_events FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.rfqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rfq_lines TO authenticated;
GRANT SELECT, INSERT ON TABLE public.rfq_invites TO authenticated;
GRANT SELECT ON TABLE public.marketplace_events TO authenticated;

CREATE OR REPLACE FUNCTION public.create_rfq(
  p_title text,
  p_notes text DEFAULT NULL,
  p_delivery_country text DEFAULT NULL,
  p_delivery_city text DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_incoterm text DEFAULT NULL,
  p_needed_by date DEFAULT NULL,
  p_wants_sample boolean DEFAULT false,
  p_expires_at timestamptz DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  new_id uuid := gen_random_uuid();
  line jsonb;
  company uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) < 3 THEN
    RAISE EXCEPTION 'RFQ title is required.';
  END IF;
  IF p_company_id IS NOT NULL THEN
    IF p_company_id <> me OR NOT public.marketplace_is_company_account(me) THEN
      RAISE EXCEPTION 'You cannot publish an RFQ for another company.';
    END IF;
    company := p_company_id;
  ELSE
    company := NULL;
  END IF;

  INSERT INTO public.rfqs (
    id, buyer_id, company_id, title, notes, status, delivery_country, delivery_city,
    currency, incoterm, needed_by, wants_sample, expires_at
  ) VALUES (
    new_id, me, company, trim(p_title), NULLIF(trim(p_notes), ''), 'draft',
    NULLIF(trim(p_delivery_country), ''), NULLIF(trim(p_delivery_city), ''),
    NULLIF(upper(trim(p_currency)), ''), NULLIF(trim(p_incoterm), ''),
    p_needed_by, coalesce(p_wants_sample, false), p_expires_at
  );

  FOR line IN SELECT value FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  LOOP
    INSERT INTO public.rfq_lines (rfq_id, material_id, material_name, specs, quantity, unit)
    VALUES (
      new_id,
      NULLIF(line->>'material_id', '')::uuid,
      coalesce(NULLIF(trim(line->>'material_name'), ''), 'Material'),
      NULLIF(trim(line->>'specs'), ''),
      NULLIF(line->>'quantity', '')::numeric,
      NULLIF(trim(line->>'unit'), '')
    );
  END LOOP;

  PERFORM public.marketplace_record_event('rfq', new_id, 'created', NULL, 'draft');
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_rfq_draft(
  p_rfq_id uuid,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_delivery_country text DEFAULT NULL,
  p_delivery_city text DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_incoterm text DEFAULT NULL,
  p_needed_by date DEFAULT NULL,
  p_wants_sample boolean DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_lines jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rfqs%ROWTYPE;
  line jsonb;
BEGIN
  SELECT * INTO rec FROM public.rfqs WHERE id = p_rfq_id;
  IF rec.id IS NULL OR rec.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  IF rec.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft RFQs can be edited.';
  END IF;
  UPDATE public.rfqs SET
    title = coalesce(NULLIF(trim(p_title), ''), title),
    notes = CASE WHEN p_notes IS NULL THEN notes ELSE NULLIF(trim(p_notes), '') END,
    delivery_country = CASE WHEN p_delivery_country IS NULL THEN delivery_country ELSE NULLIF(trim(p_delivery_country), '') END,
    delivery_city = CASE WHEN p_delivery_city IS NULL THEN delivery_city ELSE NULLIF(trim(p_delivery_city), '') END,
    currency = CASE WHEN p_currency IS NULL THEN currency ELSE NULLIF(upper(trim(p_currency)), '') END,
    incoterm = CASE WHEN p_incoterm IS NULL THEN incoterm ELSE NULLIF(trim(p_incoterm), '') END,
    needed_by = CASE WHEN p_needed_by IS NULL THEN needed_by ELSE p_needed_by END,
    wants_sample = coalesce(p_wants_sample, wants_sample),
    expires_at = CASE WHEN p_expires_at IS NULL THEN expires_at ELSE p_expires_at END,
    updated_at = now()
  WHERE id = p_rfq_id;
  IF p_lines IS NOT NULL THEN
    DELETE FROM public.rfq_lines WHERE rfq_id = p_rfq_id;
    FOR line IN SELECT value FROM jsonb_array_elements(p_lines)
    LOOP
      INSERT INTO public.rfq_lines (rfq_id, material_id, material_name, specs, quantity, unit)
      VALUES (
        p_rfq_id,
        NULLIF(line->>'material_id', '')::uuid,
        coalesce(NULLIF(trim(line->>'material_name'), ''), 'Material'),
        NULLIF(trim(line->>'specs'), ''),
        NULLIF(line->>'quantity', '')::numeric,
        NULLIF(trim(line->>'unit'), '')
      );
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_rfq(
  p_rfq_id uuid,
  p_supplier_ids uuid[] DEFAULT NULL
)
RETURNS public.rfqs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rfqs%ROWTYPE;
  me uuid := (SELECT auth.uid());
  sid uuid;
  next_status text;
  line_count int;
BEGIN
  PERFORM public.marketplace_expire_due();
  SELECT * INTO rec FROM public.rfqs WHERE id = p_rfq_id;
  IF rec.id IS NULL OR rec.buyer_id IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  IF rec.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft RFQs can be published.';
  END IF;
  SELECT count(*) INTO line_count FROM public.rfq_lines WHERE rfq_id = p_rfq_id;
  IF line_count < 1 THEN
    RAISE EXCEPTION 'Add at least one material line before publishing.';
  END IF;
  IF NOT public.marketplace_rate_ok('rfq_publish', 8) THEN
    RAISE EXCEPTION 'Daily RFQ limit reached.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.rfqs
    WHERE buyer_id = me
      AND id <> p_rfq_id
      AND lower(title) = lower(rec.title)
      AND created_at >= now() - interval '24 hours'
      AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'A similar RFQ was already created today.';
  END IF;

  IF p_supplier_ids IS NOT NULL AND cardinality(p_supplier_ids) > 0 THEN
    FOREACH sid IN ARRAY p_supplier_ids
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.supplier_profiles s
        WHERE s.id = sid AND s.listing_status = 'approved' AND s.deleted_at IS NULL AND s.is_suspended = false
      ) THEN
        INSERT INTO public.rfq_invites (rfq_id, supplier_id, invited_by)
        VALUES (p_rfq_id, sid, me)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    next_status := 'invited';
    UPDATE public.rfqs SET visibility = 'invited' WHERE id = p_rfq_id;
  ELSE
    next_status := 'published';
    UPDATE public.rfqs SET visibility = 'qualified' WHERE id = p_rfq_id;
  END IF;

  UPDATE public.rfqs
  SET status = next_status, published_at = now(), updated_at = now()
  WHERE id = p_rfq_id
  RETURNING * INTO rec;

  PERFORM public.marketplace_record_event('rfq', rec.id, 'published', 'draft', rec.status);
  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_rfq(p_rfq_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rfqs%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  SELECT * INTO rec FROM public.rfqs WHERE id = p_rfq_id;
  IF rec.id IS NULL OR rec.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  IF rec.status IN ('closed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'RFQ is already finished.';
  END IF;
  UPDATE public.rfqs SET status = 'closed', closed_at = now(), updated_at = now() WHERE id = p_rfq_id;
  PERFORM public.marketplace_record_event('rfq', p_rfq_id, 'closed', rec.status, 'closed', jsonb_build_object('reason', trim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_rfq(p_rfq_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rfqs%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  SELECT * INTO rec FROM public.rfqs WHERE id = p_rfq_id;
  IF rec.id IS NULL OR rec.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  IF rec.status IN ('closed', 'cancelled', 'accepted') THEN
    RAISE EXCEPTION 'This RFQ cannot be cancelled.';
  END IF;
  UPDATE public.rfqs SET status = 'cancelled', closed_at = now(), updated_at = now() WHERE id = p_rfq_id;
  PERFORM public.marketplace_record_event('rfq', p_rfq_id, 'cancelled', rec.status, 'cancelled', jsonb_build_object('reason', trim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_rfq_suppliers(p_rfq_id uuid, p_supplier_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.rfqs%ROWTYPE;
  sid uuid;
  added int := 0;
BEGIN
  SELECT * INTO rec FROM public.rfqs WHERE id = p_rfq_id;
  IF rec.id IS NULL OR rec.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  IF rec.status IN ('closed', 'cancelled', 'expired', 'accepted') THEN
    RAISE EXCEPTION 'Cannot invite suppliers to a finished RFQ.';
  END IF;
  FOREACH sid IN ARRAY coalesce(p_supplier_ids, '{}')
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = sid AND s.listing_status = 'approved' AND s.deleted_at IS NULL AND s.is_suspended = false
    ) THEN
      INSERT INTO public.rfq_invites (rfq_id, supplier_id, invited_by)
      VALUES (p_rfq_id, sid, (SELECT auth.uid()))
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        added := added + 1;
      END IF;
    END IF;
  END LOOP;
  IF rec.status = 'published' AND added > 0 THEN
    UPDATE public.rfqs SET status = 'invited', visibility = 'invited', updated_at = now() WHERE id = p_rfq_id;
  END IF;
  RETURN added;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_rfqs()
RETURNS SETOF public.rfqs
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.rfqs
  WHERE buyer_id = (SELECT auth.uid()) AND deleted_at IS NULL
  ORDER BY updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_supplier_rfqs()
RETURNS SETOF public.rfqs
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM public.marketplace_expire_due();
  RETURN QUERY
  SELECT r.*
  FROM public.rfqs r
  WHERE r.deleted_at IS NULL
    AND r.status <> 'draft'
    AND public.marketplace_can_see_rfq((SELECT auth.uid()), r.id)
    AND r.buyer_id IS DISTINCT FROM (SELECT auth.uid())
  ORDER BY r.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rfq(p_rfq_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  rec public.rfqs%ROWTYPE;
BEGIN
  PERFORM public.marketplace_expire_due();
  IF NOT public.marketplace_can_see_rfq((SELECT auth.uid()), p_rfq_id) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO rec FROM public.rfqs WHERE id = p_rfq_id;
  RETURN jsonb_build_object(
    'rfq', to_jsonb(rec),
    'lines', (
      SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.created_at), '[]'::jsonb)
      FROM public.rfq_lines l WHERE l.rfq_id = rec.id
    ),
    'invites', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'supplier_id', i.supplier_id,
        'trade_name', s.trade_name,
        'slug', s.slug
      )), '[]'::jsonb)
      FROM public.rfq_invites i
      JOIN public.supplier_profiles s ON s.id = i.supplier_id
      WHERE i.rfq_id = rec.id
        AND (rec.buyer_id = (SELECT auth.uid()) OR public.marketplace_is_staff() OR s.owner_id = (SELECT auth.uid()))
    ),
    'new_unverified_buyer', (
      SELECT (p.created_at > now() - interval '14 days')
          OR NOT public.marketplace_is_verified_company(rec.buyer_id)
      FROM public.user_profiles p WHERE p.id = rec.buyer_id
    ),
    'disclaimer', 'Acceptance is not a purchase contract. Final terms are agreed between buyer and supplier.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_record_event(text, uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_rate_ok(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_expire_due() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_can_see_rfq(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_rfq(text, text, text, text, text, text, date, boolean, timestamptz, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_rfq_draft(uuid, text, text, text, text, text, text, date, boolean, timestamptz, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_rfq(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_rfq(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_rfq(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_rfq_suppliers(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_rfqs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_supplier_rfqs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_rfq(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.marketplace_record_event(text, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_rate_ok(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_expire_due() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_can_see_rfq(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_rfq(text, text, text, text, text, text, date, boolean, timestamptz, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_rfq_draft(uuid, text, text, text, text, text, text, date, boolean, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_rfq(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_rfq(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rfq(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_rfq_suppliers(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_rfqs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_supplier_rfqs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rfq(uuid) TO authenticated;
