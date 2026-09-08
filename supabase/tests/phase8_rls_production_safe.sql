-- Phase 8 RLS — Production-safe. Test only. Not a migration. No COMMIT.
-- Synthetic rows are discarded by RAISE. No email / HTTP / Edge.

DO $$
DECLARE
  buyer uuid := gen_random_uuid();
  supplier_a uuid := gen_random_uuid();
  supplier_b uuid := gen_random_uuid();
  admin uuid := gen_random_uuid();
  instance uuid := '00000000-0000-0000-0000-000000000000';
  rfq_id uuid;
  quote_a uuid;
  quote_b uuid;
  seen int;
  failed int := 0;
  started timestamptz;
  elapsed_ms int;
  rec jsonb;
  rev_count int;
  leftover int;
BEGIN
  IF to_regprocedure('public.create_rfq(text,text,text,text,text,text,date,boolean,timestamptz,uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'PHASE8_RLS_SKIP:create_rfq_missing';
  END IF;

  BEGIN EXECUTE 'ALTER TABLE public.user_profiles DISABLE TRIGGER trg_notify_welcome_email'; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    SELECT id INTO instance FROM auth.instances LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    instance := '00000000-0000-0000-0000-000000000000';
  END;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (instance, buyer, 'authenticated', 'authenticated', 'phase8.buyer.' || buyer::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, supplier_a, 'authenticated', 'authenticated', 'phase8.sa.' || supplier_a::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, supplier_b, 'authenticated', 'authenticated', 'phase8.sb.' || supplier_b::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, admin, 'authenticated', 'authenticated', 'phase8.admin.' || admin::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  INSERT INTO public.user_profiles (
    id, email, full_name, is_admin, is_test_account, hide_from_directory,
    welcome_email_sent, email_opt_in, marketing_opt_in, account_type
  ) VALUES
    (buyer, 'phase8.buyer.' || buyer::text || '@invalid.test', 'Phase8 Buyer', false, true, true, true, false, false, 'individual'),
    (supplier_a, 'phase8.sa.' || supplier_a::text || '@invalid.test', 'Phase8 Supplier A', false, true, true, true, false, false, 'company'),
    (supplier_b, 'phase8.sb.' || supplier_b::text || '@invalid.test', 'Phase8 Supplier B', false, true, true, true, false, false, 'company'),
    (admin, 'phase8.admin.' || admin::text || '@invalid.test', 'Phase8 Admin', true, true, true, true, false, false, 'individual')
  ON CONFLICT (id) DO UPDATE SET welcome_email_sent = true, hide_from_directory = true, is_test_account = true, account_type = EXCLUDED.account_type, is_admin = EXCLUDED.is_admin;

  INSERT INTO public.platform_roles (user_id, role) VALUES
    (admin, 'platform_admin'),
    (supplier_a, 'verified_company')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', supplier_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_a::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.upsert_supplier_profile('Legal A', 'Phase8 Alpha Flavors', 'manufacturer', 'UAE', 'Dubai', 'test catalog', NULL, NULL, NULL, NULL, ARRAY['Middle East'], NULL, NULL, true);
  PERFORM public.upsert_supplier_material(NULL, 'Phase8 Vanillin Test', 'vanillin', 'aroma', NULL, NULL, NULL, true, 'Alpha', 'China', 'UAE', 'powder', ARRAY['beverage'], NULL, NULL, '25kg', '25', 'kg', 14, true, ARRAY['FOB'], ARRAY['EU'], ARRAY['ISO'], true);
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', supplier_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_b::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.upsert_supplier_profile('Legal B', 'Phase8 Beta Flavors', 'distributor', 'India', 'Mumbai', 'competitor', NULL, NULL, NULL, NULL, ARRAY['India'], NULL, NULL, true);
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.review_marketplace_item('supplier', (SELECT id FROM public.supplier_profiles WHERE owner_id = supplier_a), 'approve', 'test approve a');
  PERFORM public.review_marketplace_item('supplier', (SELECT id FROM public.supplier_profiles WHERE owner_id = supplier_b), 'approve', 'test approve b');
  PERFORM public.review_marketplace_item('supplier_material', (SELECT id FROM public.supplier_materials WHERE trade_name = 'Phase8 Vanillin Test'), 'approve', 'test approve material');
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO seen FROM public.list_public_suppliers('Phase8 Alpha', NULL, NULL, NULL, 20);
  IF seen < 1 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.rfqs;
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.rfq_quotes;
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.marketplace_search('Phase8 Alpha', ARRAY['suppliers'], 10);
  IF seen < 1 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.marketplace_search('9999.25 secret price', ARRAY['suppliers'], 10);
  IF seen <> 0 THEN failed := failed + 1; END IF;
  BEGIN
    PERFORM public.create_rfq('anon should fail', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, '[]'::jsonb);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', buyer::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', buyer::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.create_rfq('forged company', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, supplier_a, '[{"material_name":"vanillin","quantity":1,"unit":"kg"}]'::jsonb);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  rfq_id := public.create_rfq(
    'Phase8 Vanilla RFQ',
    'food grade',
    'UAE',
    'Dubai',
    'USD',
    'FOB',
    CURRENT_DATE + 30,
    true,
    now() + interval '10 days',
    NULL,
    '[{"material_name":"Phase8 Vanillin Test","quantity":100,"unit":"kg"}]'::jsonb
  );
  PERFORM public.publish_rfq(rfq_id, NULL);
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO seen FROM public.rfqs WHERE id = rfq_id;
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.marketplace_search('Phase8 Vanilla RFQ', NULL, 10);
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', supplier_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_a::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  quote_a := public.submit_rfq_quote(rfq_id, 10.5, 'USD', 'kg', '25kg', 'drum', 14, 'FOB', now() + interval '5 days', 'paid sample', 'net 30', 'first');
  quote_a := public.submit_rfq_quote(rfq_id, 11.25, 'USD', 'kg', '25kg', 'drum', 10, 'FOB', now() + interval '5 days', 'paid sample', 'net 30', 'revision');
  SELECT count(*) INTO rev_count FROM public.rfq_quote_revisions WHERE quote_id = quote_a;
  IF rev_count < 2 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', supplier_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_b::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.rfq_quotes WHERE id = quote_a;
  IF seen <> 0 THEN failed := failed + 1; END IF;
  BEGIN
    PERFORM public.compare_rfq_quotes(rfq_id);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  quote_b := public.submit_rfq_quote(rfq_id, 9.1, 'EUR', 'kg', '50kg', 'bag', 21, 'CIF', now() + interval '4 days', NULL, 'prepaid', 'competitor');
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', buyer::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', buyer::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  rec := public.compare_rfq_quotes(rfq_id);
  IF jsonb_array_length(rec->'quotes') < 2 THEN failed := failed + 1; END IF;
  IF rec->>'disclaimer' IS NULL THEN failed := failed + 1; END IF;
  PERFORM public.decide_rfq_quote(quote_a, 'shortlist', 'fits spec');
  PERFORM public.send_rfq_message(rfq_id, (SELECT id FROM public.supplier_profiles WHERE owner_id = supplier_a), 'please confirm pack');
  BEGIN
    UPDATE public.rfqs SET buyer_id = supplier_a WHERE id = rfq_id;
    IF (SELECT buyer_id FROM public.rfqs WHERE id = rfq_id) IS DISTINCT FROM buyer THEN
      failed := failed + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', supplier_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_b::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.rfq_messages;
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  UPDATE public.rfqs SET expires_at = now() - interval '1 hour', status = 'receiving_quotes' WHERE id = rfq_id;
  PERFORM public.marketplace_expire_due();
  PERFORM set_config('request.jwt.claim.sub', supplier_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_a::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.submit_rfq_quote(rfq_id, 8, 'USD', 'kg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  INSERT INTO public.member_blocks (blocker_id, blocked_id) VALUES (buyer, supplier_a) ON CONFLICT DO NOTHING;
  PERFORM set_config('request.jwt.claim.sub', supplier_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', supplier_a::text, 'role', 'authenticated')::text, true);
  PERFORM public.marketplace_record_event('quote', quote_a, 'revised', 'submitted', 'revised', '{"revision_no":"9"}'::jsonb);

  SELECT count(*) INTO leftover
  FROM public.user_profiles
  WHERE email LIKE 'phase8.%@invalid.test' AND id NOT IN (buyer, supplier_a, supplier_b, admin);

  started := clock_timestamp();
  PERFORM public.marketplace_search('Phase8', ARRAY['suppliers'], 10);
  elapsed_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - started)) * 1000)::int;
  IF elapsed_ms > 1500 THEN failed := failed + 1; END IF;
  IF leftover <> 0 THEN failed := failed + 1; END IF;

  IF failed > 0 THEN
    RAISE EXCEPTION 'PHASE8_RLS_FAIL count=% latency_ms=%', failed, elapsed_ms;
  END IF;
  RAISE EXCEPTION 'PHASE8_RLS_OK latency_ms=%', elapsed_ms;
END $$;
