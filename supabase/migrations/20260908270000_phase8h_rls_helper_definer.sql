-- Phase 8H — stop RLS recursion on RFQ/quote/thread visibility helpers.
-- Helpers read the same tables their policies protect, so they must be
-- SECURITY DEFINER. Caller uid is pinned to auth.uid().
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE OR REPLACE FUNCTION public.marketplace_can_see_rfq(p_uid uuid, p_rfq_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = p_rfq_id
      AND r.deleted_at IS NULL
      AND p_uid IS NOT NULL
      AND p_uid = (SELECT auth.uid())
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

CREATE OR REPLACE FUNCTION public.marketplace_can_see_quote(p_uid uuid, p_quote_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfq_quotes q
    JOIN public.rfqs r ON r.id = q.rfq_id
    WHERE q.id = p_quote_id
      AND p_uid IS NOT NULL
      AND p_uid = (SELECT auth.uid())
      AND (
        public.marketplace_is_staff()
        OR q.supplier_owner_id = p_uid
        OR r.buyer_id = p_uid
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_can_see_thread(p_uid uuid, p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfq_threads t
    JOIN public.supplier_profiles s ON s.id = t.supplier_id
    WHERE t.id = p_thread_id
      AND p_uid IS NOT NULL
      AND p_uid = (SELECT auth.uid())
      AND (
        public.marketplace_is_staff()
        OR t.buyer_id = p_uid
        OR s.owner_id = p_uid
      )
  );
$$;

REVOKE ALL ON FUNCTION public.marketplace_can_see_rfq(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_can_see_quote(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_can_see_thread(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_can_see_rfq(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_can_see_quote(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_can_see_thread(uuid, uuid) TO anon, authenticated;
