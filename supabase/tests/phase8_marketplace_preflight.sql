-- Phase 8 preflight — read-only. Not a migration.
SELECT
  current_database() AS db,
  to_regclass('public.supplier_profiles') AS supplier_profiles,
  to_regclass('public.supplier_materials') AS supplier_materials,
  to_regclass('public.rfqs') AS rfqs,
  to_regclass('public.rfq_quotes') AS rfq_quotes,
  to_regclass('public.rfq_threads') AS rfq_threads,
  to_regclass('public.marketplace_files') AS marketplace_files,
  to_regprocedure('public.marketplace_search(text,text[],int)') AS marketplace_search,
  to_regprocedure('public.create_rfq(text,text,text,text,text,text,date,boolean,timestamptz,uuid,jsonb)') AS create_rfq,
  to_regprocedure('public.compare_rfq_quotes(uuid)') AS compare_rfq_quotes,
  to_regprocedure('public.emit_event_notification(uuid,text,text,text,text,uuid,text,text,text)') AS notify_fn;
