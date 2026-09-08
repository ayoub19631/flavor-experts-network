-- Phase 8D — supplier quotes, immutable revisions, buyer comparison.
-- No FX conversion. Cheapest is never labeled best. Competitors cannot see each other.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE TABLE IF NOT EXISTS public.rfq_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id),
  supplier_id uuid NOT NULL REFERENCES public.supplier_profiles(id),
  supplier_owner_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'submitted', 'revised', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired'
    )),
  current_revision_id uuid,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rfq_quotes_unique UNIQUE (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.rfq_quote_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.rfq_quotes(id),
  revision_no int NOT NULL,
  price numeric,
  currency text,
  price_unit text,
  moq text,
  packaging text,
  lead_time_days int,
  incoterm text,
  valid_until timestamptz,
  sample_terms text,
  payment_terms text,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rfq_quote_revisions_unique UNIQUE (quote_id, revision_no)
);

CREATE OR REPLACE FUNCTION public.rfq_quotes_guard_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.marketplace_is_staff() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.supplier_owner_id := (SELECT auth.uid());
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

DROP TRIGGER IF EXISTS trg_rfq_quotes_guard_write ON public.rfq_quotes;
CREATE TRIGGER trg_rfq_quotes_guard_write
  BEFORE INSERT OR UPDATE ON public.rfq_quotes
  FOR EACH ROW EXECUTE FUNCTION public.rfq_quotes_guard_write();

CREATE INDEX IF NOT EXISTS rfq_quotes_rfq_idx ON public.rfq_quotes (rfq_id, status);
CREATE INDEX IF NOT EXISTS rfq_quotes_supplier_idx ON public.rfq_quotes (supplier_id, status);
CREATE INDEX IF NOT EXISTS rfq_quote_revisions_quote_idx ON public.rfq_quote_revisions (quote_id, revision_no DESC);

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

  UPDATE public.rfq_quotes q
  SET status = 'expired', updated_at = now()
  FROM public.rfq_quote_revisions r
  WHERE r.id = q.current_revision_id
    AND q.status IN ('submitted', 'revised', 'shortlisted', 'draft')
    AND r.valid_until IS NOT NULL
    AND r.valid_until < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_can_see_quote(p_uid uuid, p_quote_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfq_quotes q
    JOIN public.rfqs r ON r.id = q.rfq_id
    WHERE q.id = p_quote_id
      AND (
        public.marketplace_is_staff()
        OR q.supplier_owner_id = p_uid
        OR r.buyer_id = p_uid
      )
  );
$$;

ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quote_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quote_revisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfq_quotes_select ON public.rfq_quotes;
CREATE POLICY rfq_quotes_select ON public.rfq_quotes
  FOR SELECT TO authenticated
  USING (public.marketplace_can_see_quote((SELECT auth.uid()), id));

DROP POLICY IF EXISTS rfq_quotes_insert ON public.rfq_quotes;
CREATE POLICY rfq_quotes_insert ON public.rfq_quotes
  FOR INSERT TO authenticated
  WITH CHECK (supplier_owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS rfq_quotes_update ON public.rfq_quotes;
CREATE POLICY rfq_quotes_update ON public.rfq_quotes
  FOR UPDATE TO authenticated
  USING (
    supplier_owner_id = (SELECT auth.uid())
    OR public.marketplace_is_staff()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    supplier_owner_id = (SELECT auth.uid())
    OR public.marketplace_is_staff()
    OR EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = rfq_id AND r.buyer_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS rfq_quote_revisions_select ON public.rfq_quote_revisions;
CREATE POLICY rfq_quote_revisions_select ON public.rfq_quote_revisions
  FOR SELECT TO authenticated
  USING (public.marketplace_can_see_quote((SELECT auth.uid()), quote_id));

DROP POLICY IF EXISTS rfq_quote_revisions_insert ON public.rfq_quote_revisions;
CREATE POLICY rfq_quote_revisions_insert ON public.rfq_quote_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.rfq_quotes q
      WHERE q.id = quote_id AND q.supplier_owner_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON TABLE public.rfq_quotes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.rfq_quote_revisions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.rfq_quotes TO authenticated;
GRANT SELECT, INSERT ON TABLE public.rfq_quote_revisions TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_rfq_quote(
  p_rfq_id uuid,
  p_price numeric,
  p_currency text,
  p_price_unit text DEFAULT NULL,
  p_moq text DEFAULT NULL,
  p_packaging text DEFAULT NULL,
  p_lead_time_days int DEFAULT NULL,
  p_incoterm text DEFAULT NULL,
  p_valid_until timestamptz DEFAULT NULL,
  p_sample_terms text DEFAULT NULL,
  p_payment_terms text DEFAULT NULL,
  p_notes text DEFAULT NULL
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
  quote public.rfq_quotes%ROWTYPE;
  rev public.rfq_quote_revisions%ROWTYPE;
  next_no int := 1;
  next_status text;
BEGIN
  PERFORM public.marketplace_expire_due();
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  SELECT * INTO rfq FROM public.rfqs WHERE id = p_rfq_id AND deleted_at IS NULL;
  IF rfq.id IS NULL THEN
    RAISE EXCEPTION 'RFQ not found.';
  END IF;
  IF rfq.status IN ('draft', 'closed', 'cancelled', 'expired', 'accepted') THEN
    RAISE EXCEPTION 'This RFQ is not accepting quotes.';
  END IF;
  IF NOT public.marketplace_can_see_rfq(me, p_rfq_id) OR rfq.buyer_id = me THEN
    RAISE EXCEPTION 'You cannot quote on this RFQ.';
  END IF;
  SELECT * INTO supplier FROM public.supplier_profiles WHERE owner_id = me AND deleted_at IS NULL;
  IF supplier.id IS NULL THEN
    RAISE EXCEPTION 'Supplier profile required.';
  END IF;
  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'Price is required.';
  END IF;
  IF p_currency IS NULL OR length(trim(p_currency)) < 3 THEN
    RAISE EXCEPTION 'Currency is required.';
  END IF;
  IF NOT public.marketplace_rate_ok('quote_submit', 20) THEN
    RAISE EXCEPTION 'Daily quote limit reached.';
  END IF;

  SELECT * INTO quote FROM public.rfq_quotes WHERE rfq_id = p_rfq_id AND supplier_id = supplier.id;
  IF quote.id IS NULL THEN
    INSERT INTO public.rfq_quotes (rfq_id, supplier_id, supplier_owner_id, status, submitted_at)
    VALUES (p_rfq_id, supplier.id, me, 'submitted', now())
    RETURNING * INTO quote;
    next_status := 'submitted';
  ELSE
    IF quote.status IN ('accepted', 'rejected', 'withdrawn', 'expired') THEN
      RAISE EXCEPTION 'This quote can no longer be changed.';
    END IF;
    SELECT coalesce(max(revision_no), 0) + 1 INTO next_no FROM public.rfq_quote_revisions WHERE quote_id = quote.id;
    next_status := 'revised';
    UPDATE public.rfq_quotes SET status = 'revised', submitted_at = now(), updated_at = now() WHERE id = quote.id;
  END IF;

  INSERT INTO public.rfq_quote_revisions (
    quote_id, revision_no, price, currency, price_unit, moq, packaging, lead_time_days,
    incoterm, valid_until, sample_terms, payment_terms, notes, created_by
  ) VALUES (
    quote.id, next_no, p_price, upper(trim(p_currency)), NULLIF(trim(p_price_unit), ''),
    NULLIF(trim(p_moq), ''), NULLIF(trim(p_packaging), ''), p_lead_time_days,
    NULLIF(trim(p_incoterm), ''), p_valid_until, NULLIF(trim(p_sample_terms), ''),
    NULLIF(trim(p_payment_terms), ''), NULLIF(trim(p_notes), ''), me
  ) RETURNING * INTO rev;

  UPDATE public.rfq_quotes SET current_revision_id = rev.id, updated_at = now() WHERE id = quote.id;
  IF rfq.status IN ('published', 'invited') THEN
    UPDATE public.rfqs SET status = 'receiving_quotes', updated_at = now() WHERE id = rfq.id;
  END IF;
  PERFORM public.marketplace_record_event('quote', quote.id, next_status, quote.status, next_status, jsonb_build_object('revision_no', next_no));
  RETURN quote.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_rfq_quote(p_quote_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote public.rfq_quotes%ROWTYPE;
  rfq public.rfqs%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  SELECT * INTO quote FROM public.rfq_quotes WHERE id = p_quote_id;
  IF quote.id IS NULL OR quote.supplier_owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Quote not found.';
  END IF;
  SELECT * INTO rfq FROM public.rfqs WHERE id = quote.rfq_id;
  IF quote.status = 'accepted' OR rfq.status IN ('accepted', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'This quote can no longer be withdrawn.';
  END IF;
  UPDATE public.rfq_quotes SET status = 'withdrawn', updated_at = now() WHERE id = p_quote_id;
  PERFORM public.marketplace_record_event('quote', p_quote_id, 'withdrawn', quote.status, 'withdrawn', jsonb_build_object('reason', trim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_rfq_quote(
  p_quote_id uuid,
  p_action text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote public.rfq_quotes%ROWTYPE;
  rfq public.rfqs%ROWTYPE;
  next_quote text;
  next_rfq text;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required.';
  END IF;
  IF p_action NOT IN ('shortlist', 'accept', 'reject', 'under_review') THEN
    RAISE EXCEPTION 'Unsupported quote decision.';
  END IF;
  SELECT * INTO quote FROM public.rfq_quotes WHERE id = p_quote_id;
  SELECT * INTO rfq FROM public.rfqs WHERE id = quote.rfq_id;
  IF quote.id IS NULL OR rfq.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Quote not found.';
  END IF;
  IF rfq.status IN ('closed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'This RFQ is closed.';
  END IF;
  IF quote.status IN ('withdrawn', 'expired', 'rejected') AND p_action <> 'shortlist' THEN
    RAISE EXCEPTION 'This quote cannot be decided.';
  END IF;

  IF p_action = 'shortlist' THEN
    next_quote := 'shortlisted';
    next_rfq := 'shortlisted';
  ELSIF p_action = 'accept' THEN
    next_quote := 'accepted';
    next_rfq := 'accepted';
  ELSIF p_action = 'reject' THEN
    next_quote := 'rejected';
    next_rfq := rfq.status;
  ELSE
    next_quote := quote.status;
    next_rfq := 'under_review';
  END IF;

  UPDATE public.rfq_quotes SET status = next_quote, updated_at = now() WHERE id = p_quote_id;
  UPDATE public.rfqs SET status = next_rfq, updated_at = now(), closed_at = CASE WHEN next_rfq = 'accepted' THEN now() ELSE closed_at END
  WHERE id = rfq.id;
  PERFORM public.marketplace_record_event('quote', p_quote_id, p_action, quote.status, next_quote, jsonb_build_object('reason', trim(p_reason)));
END;
$$;

CREATE OR REPLACE FUNCTION public.compare_rfq_quotes(p_rfq_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rfq public.rfqs%ROWTYPE;
  me uuid := (SELECT auth.uid());
BEGIN
  SELECT * INTO rfq FROM public.rfqs WHERE id = p_rfq_id;
  IF rfq.id IS NULL OR (rfq.buyer_id IS DISTINCT FROM me AND NOT public.marketplace_is_staff()) THEN
    RAISE EXCEPTION 'Not allowed to compare quotes on this RFQ.';
  END IF;
  RETURN jsonb_build_object(
    'rfq_id', rfq.id,
    'disclaimer', 'Prices stay in the original currency. The lowest price is not automatically the best offer. Acceptance is not a purchase contract.',
    'quotes', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'quote_id', q.id,
        'status', q.status,
        'supplier_id', s.id,
        'supplier_name', s.trade_name,
        'supplier_slug', s.slug,
        'is_verified', public.marketplace_is_verified_company(s.owner_id),
        'price', r.price,
        'currency', r.currency,
        'price_unit', r.price_unit,
        'moq', r.moq,
        'packaging', r.packaging,
        'lead_time_days', r.lead_time_days,
        'incoterm', r.incoterm,
        'sample_terms', r.sample_terms,
        'valid_until', r.valid_until,
        'revision_no', r.revision_no,
        'certifications', (
          SELECT coalesce(array_agg(DISTINCT c), '{}')
          FROM public.supplier_materials m, unnest(m.certifications) c
          WHERE m.supplier_id = s.id AND m.deleted_at IS NULL AND m.status = 'published'
        )
      ) ORDER BY q.updated_at DESC), '[]'::jsonb)
      FROM public.rfq_quotes q
      JOIN public.supplier_profiles s ON s.id = q.supplier_id
      LEFT JOIN public.rfq_quote_revisions r ON r.id = q.current_revision_id
      WHERE q.rfq_id = p_rfq_id
        AND q.status <> 'draft'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_quotes()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'quote_id', q.id,
    'rfq_id', q.rfq_id,
    'rfq_title', r.title,
    'status', q.status,
    'price', rev.price,
    'currency', rev.currency,
    'updated_at', q.updated_at
  ) ORDER BY q.updated_at DESC), '[]'::jsonb)
  FROM public.rfq_quotes q
  JOIN public.rfqs r ON r.id = q.rfq_id
  LEFT JOIN public.rfq_quote_revisions rev ON rev.id = q.current_revision_id
  WHERE q.supplier_owner_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.list_buyer_quotes()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'quote_id', q.id,
    'rfq_id', q.rfq_id,
    'rfq_title', r.title,
    'status', q.status,
    'supplier_name', s.trade_name,
    'price', rev.price,
    'currency', rev.currency,
    'updated_at', q.updated_at
  ) ORDER BY q.updated_at DESC), '[]'::jsonb)
  FROM public.rfq_quotes q
  JOIN public.rfqs r ON r.id = q.rfq_id
  JOIN public.supplier_profiles s ON s.id = q.supplier_id
  LEFT JOIN public.rfq_quote_revisions rev ON rev.id = q.current_revision_id
  WHERE r.buyer_id = (SELECT auth.uid())
    AND q.status <> 'draft';
$$;

REVOKE ALL ON FUNCTION public.marketplace_can_see_quote(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_rfq_quote(uuid, numeric, text, text, text, text, int, text, timestamptz, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_rfq_quote(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_rfq_quote(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compare_rfq_quotes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_quotes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_buyer_quotes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_rate_ok(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_expire_due() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.marketplace_can_see_quote(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rfq_quote(uuid, numeric, text, text, text, text, int, text, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_rfq_quote(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_rfq_quote(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compare_rfq_quotes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_quotes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_buyer_quotes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_rate_ok(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_expire_due() TO authenticated;
