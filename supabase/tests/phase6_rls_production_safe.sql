-- Phase 6 RLS — Production-safe.
-- Test only. Not a migration. No COMMIT. Synthetic rows discarded by RAISE.

DO $$
DECLARE
  author uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  reviewer uuid := gen_random_uuid();
  admin uuid := gen_random_uuid();
  instance uuid := '00000000-0000-0000-0000-000000000000';
  pub_draft uuid := gen_random_uuid();
  pub_live uuid := gen_random_uuid();
  seen int;
  ok boolean;
  failed int := 0;
  rec public.publications;
BEGIN
  IF to_regclass('public.publications') IS NULL THEN
    RAISE EXCEPTION 'PHASE6_RLS_SKIP:publications_missing';
  END IF;

  BEGIN EXECUTE 'ALTER TABLE public.user_profiles DISABLE TRIGGER trg_notify_welcome_email'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.publications DISABLE TRIGGER trg_notify_publication_workflow'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.publications DISABLE TRIGGER trg_publications_workflow'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.publications DISABLE TRIGGER trg_publications_audit'; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    SELECT id INTO instance FROM auth.instances LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    instance := '00000000-0000-0000-0000-000000000000';
  END;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (instance, author, 'authenticated', 'authenticated', 'phase6.safe.author.' || author::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, other, 'authenticated', 'authenticated', 'phase6.safe.other.' || other::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, reviewer, 'authenticated', 'authenticated', 'phase6.safe.rev.' || reviewer::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, admin, 'authenticated', 'authenticated', 'phase6.safe.admin.' || admin::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  INSERT INTO public.user_profiles (
    id, email, full_name, is_admin, is_test_account, hide_from_directory,
    welcome_email_sent, email_opt_in, marketing_opt_in
  ) VALUES
    (author, 'phase6.safe.author.' || author::text || '@invalid.test', 'P6 Author', false, true, true, true, false, false),
    (other, 'phase6.safe.other.' || other::text || '@invalid.test', 'P6 Other', false, true, true, true, false, false),
    (reviewer, 'phase6.safe.rev.' || reviewer::text || '@invalid.test', 'P6 Reviewer', false, true, true, true, false, false),
    (admin, 'phase6.safe.admin.' || admin::text || '@invalid.test', 'P6 Admin', true, true, true, true, false, false)
  ON CONFLICT (id) DO UPDATE SET welcome_email_sent = true, hide_from_directory = true, is_test_account = true;

  INSERT INTO public.platform_roles (user_id, role) VALUES
    (author, 'member'), (other, 'member'), (reviewer, 'member'), (admin, 'platform_admin')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.publication_staff (user_id, role) VALUES (reviewer, 'reviewer')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.publications (
    id, type, slug, status, visibility, primary_language, title, abstract, created_by
  ) VALUES
    (pub_draft, 'technical_article', 'phase6-safe-draft-' || pub_draft::text, 'draft', 'private', 'en', 'Phase6 Safe Draft', 'draft abstract', author),
    (pub_live, 'guide', 'phase6-safe-live-' || pub_live::text, 'published', 'public', 'en', 'Phase6 Safe Live', 'live abstract', author);

  BEGIN EXECUTE 'ALTER TABLE public.publications ENABLE TRIGGER trg_publications_workflow'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.publications ENABLE TRIGGER trg_publications_audit'; EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO seen FROM public.publications WHERE id = pub_draft;
  ok := seen = 0; IF NOT ok THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.publications WHERE id = pub_live;
  IF seen <> 1 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', other::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.publications WHERE id = pub_draft;
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', author::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', author::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.publications WHERE id = pub_draft;
  IF seen <> 1 THEN failed := failed + 1; END IF;
  BEGIN
    PERFORM public.review_publication(pub_draft, 'approve', NULL, NULL);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', other::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.review_publication(pub_draft, 'approve', NULL, NULL);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', author::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', author::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.submit_publication(pub_draft);
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', reviewer::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', reviewer::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    rec := public.review_publication(pub_draft, 'request_revision', 'Need methods', NULL);
    IF rec.status NOT IN ('revision_requested', 'revision_required') THEN failed := failed + 1; END IF;
  EXCEPTION WHEN OTHERS THEN
    failed := failed + 1;
  END;
  BEGIN
    PERFORM public.review_publication(pub_draft, 'reject', NULL, NULL);
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', other::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.publication_staff (user_id, role) VALUES (other, 'reviewer');
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO seen FROM public.publication_staff WHERE user_id = other;
  IF seen > 0 THEN failed := failed + 1; END IF;

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    EXECUTE 'SELECT decision_reason FROM public.publications WHERE id = $1' USING pub_live;
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', other::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', other::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.record_publication_event(pub_live, 'view', NULL);
  PERFORM public.record_publication_event(pub_live, 'view', NULL);
  EXECUTE 'RESET ROLE';
  SELECT view_count INTO seen FROM public.publications WHERE id = pub_live;
  IF seen <> 1 THEN failed := failed + 1; END IF;

  PERFORM set_config('request.jwt.claim.sub', author::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', author::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  rec := public.archive_own_publication(pub_draft);
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO seen FROM public.publications WHERE id = pub_draft;
  IF NOT (seen = 1 AND rec.status = 'archived') THEN failed := failed + 1; END IF;

  RAISE EXCEPTION 'PHASE6_RLS_OK:%/12 failed=%', 12 - failed, failed;
END $$;
