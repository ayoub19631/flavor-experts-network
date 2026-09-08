-- Phase 8I — revoke leftover anon EXECUTE on sensitive marketplace RPCs.
-- PUBLIC is already revoked; Supabase still grants many functions to anon.
-- RLS visibility helpers stay executable by anon so guest policies evaluate
-- to false instead of erroring.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

DO $$
DECLARE
  r record;
  keep text[] := ARRAY[
    'marketplace_can_see_rfq',
    'marketplace_can_see_quote',
    'marketplace_can_see_thread',
    'marketplace_is_verified_company',
    'has_capability',
    'marketplace_is_staff',
    'marketplace_search',
    'list_public_suppliers',
    'list_public_materials',
    'get_public_supplier',
    'get_public_material',
    'marketplace_public_supplier_visible',
    'marketplace_public_material_visible',
    'marketplace_is_company_account',
    'marketplace_slugify'
  ];
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname LIKE 'marketplace_%'
        OR p.proname LIKE '%rfq%'
        OR p.proname LIKE 'upsert_supplier_%'
        OR p.proname IN (
          'review_marketplace_item',
          'report_marketplace',
          'list_marketplace_review_queue',
          'list_my_materials',
          'list_my_quotes',
          'list_buyer_quotes'
        )
      )
      AND p.proname <> ALL (keep)
      AND p.proname NOT LIKE '%_before_write'
      AND p.proname NOT LIKE '%_guard_write'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.oid::regprocedure);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.oid::regprocedure);
  END LOOP;
END $$;
