-- Phase 7 RLS — Production-safe. Test only. Not a migration. No COMMIT.
-- Synthetic rows are discarded by RAISE. No email / HTTP / Edge.

DO $$
DECLARE
  author uuid := gen_random_uuid();
  viewer uuid := gen_random_uuid();
  instance uuid := '00000000-0000-0000-0000-000000000000';
  pub_draft uuid := gen_random_uuid();
  pub_live uuid := gen_random_uuid();
  post_hidden uuid := gen_random_uuid();
  post_live uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  seen int;
  failed int := 0;
  started timestamptz;
  elapsed_ms int;
  rec record;
BEGIN
  IF to_regprocedure('public.global_search(text,text[],int,text,text,text,text,text,timestamptz,timestamptz,real,timestamptz,text,text)') IS NULL THEN
    RAISE EXCEPTION 'PHASE7_RLS_SKIP:global_search_missing';
  END IF;

  BEGIN EXECUTE 'ALTER TABLE public.user_profiles DISABLE TRIGGER trg_notify_welcome_email'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.publications DISABLE TRIGGER trg_notify_publication_workflow'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.publications DISABLE TRIGGER trg_publications_workflow'; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    SELECT id INTO instance FROM auth.instances LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    instance := '00000000-0000-0000-0000-000000000000';
  END;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (instance, author, 'authenticated', 'authenticated', 'phase7.safe.author.' || author::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, viewer, 'authenticated', 'authenticated', 'phase7.safe.viewer.' || viewer::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  INSERT INTO public.user_profiles (
    id, email, full_name, is_admin, is_test_account, hide_from_directory,
    welcome_email_sent, email_opt_in, marketing_opt_in
  ) VALUES
    (author, 'phase7.safe.author.' || author::text || '@invalid.test', 'Phase7 Safe Author', false, true, true, true, false, false),
    (viewer, 'phase7.safe.viewer.' || viewer::text || '@invalid.test', 'Phase7 Safe Viewer', false, true, true, true, false, false)
  ON CONFLICT (id) DO UPDATE SET welcome_email_sent = true, hide_from_directory = true, is_test_account = true;

  INSERT INTO public.publications (
    id, type, slug, status, visibility, primary_language, title, abstract, created_by
  ) VALUES
    (pub_draft, 'technical_article', 'phase7-safe-draft-' || pub_draft::text, 'draft', 'private', 'en', 'Phase7 Secret Draft Vanilla', 'draft abstract', author),
    (pub_live, 'guide', 'phase7-safe-live-' || pub_live::text, 'published', 'public', 'en', 'Phase7 Public Live Vanilla Guide', 'live abstract', author);

  INSERT INTO public.social_posts (id, author_id, body, is_published, is_hidden, is_draft, deleted_at)
  VALUES
    (post_hidden, author, 'Phase7 hidden vanilla post body', true, true, false, NULL),
    (post_live, author, 'Phase7 public vanilla post body', true, false, false, NULL);

  INSERT INTO public.member_directory_data (
    id, full_name, role, specialty, joined_at, is_featured, member_type, skills, education, work_experience, projects, updated_at, profile_id
  ) VALUES (
    member_id, 'Phase7 Visible Vanilla Chemist', 'Flavor chemist', 'vanilla', now(), false, 'individual',
    ARRAY['vanilla'], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, now(), author
  );

  INSERT INTO public.member_blocks (blocker_id, blocked_id) VALUES (viewer, author);

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO seen FROM public.global_search('Phase7 Secret Draft Vanilla', NULL, 20, 'relevance');
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.global_search('Phase7 hidden vanilla post body', ARRAY['posts'], 20, 'relevance');
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.global_search('user@example.com', NULL, 20, 'relevance');
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.global_search('Phase7 Public Live Vanilla Guide', ARRAY['publications'], 20, 'relevance');
  IF seen < 1 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', viewer::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', viewer::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.global_search('Phase7 public vanilla post body', ARRAY['posts'], 20, 'relevance');
  IF seen <> 0 THEN failed := failed + 1; END IF;
  SELECT count(*) INTO seen FROM public.global_search('Phase7 Secret Draft Vanilla', NULL, 20, 'relevance');
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', author::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', author::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.global_search('Phase7 Secret Draft Vanilla', NULL, 20, 'relevance');
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  started := clock_timestamp();
  FOR rec IN SELECT public.global_search('vanilla', NULL, 20, 'relevance') LOOP
    NULL;
  END LOOP;
  elapsed_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - started)) * 1000)::int;
  IF elapsed_ms > 1500 THEN failed := failed + 1; END IF;

  IF failed > 0 THEN
    RAISE EXCEPTION 'PHASE7_RLS_FAIL count=% latency_ms=%', failed, elapsed_ms;
  END IF;
  RAISE EXCEPTION 'PHASE7_RLS_OK latency_ms=%', elapsed_ms;
END $$;
