-- Phase 8J — revoke leftover anon EXECUTE on file-registration RPCs
-- missed by 8I because they do not use the marketplace_ prefix.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'register_marketplace_file',
        'register_material_document',
        'assert_marketplace_upload'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.oid::regprocedure);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.oid::regprocedure);
  END LOOP;
END $$;
