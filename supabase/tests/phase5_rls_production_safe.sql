-- Phase 5 RLS — Production-safe.
-- Test only. Not a migration. No COMMIT. No Resend / HTTP / Edge / product email.
-- Synthetic rows live only inside this DO block and are discarded by RAISE.

DO $$
DECLARE
  alice uuid := gen_random_uuid();
  bob uuid := gen_random_uuid();
  carol uuid := gen_random_uuid();
  reviewer uuid := gen_random_uuid();
  company_a uuid := gen_random_uuid();
  company_b uuid := gen_random_uuid();
  instance uuid := '00000000-0000-0000-0000-000000000000';
  n1 uuid;
  n2 uuid;
  n3 uuid;
  n4 uuid;
  post_id uuid := gen_random_uuid();
  job_a uuid := gen_random_uuid();
  job_b uuid := gen_random_uuid();
  app_id uuid := gen_random_uuid();
  report_id uuid;
  req_id uuid := gen_random_uuid();
  seen int;
  ok boolean;
  other_hidden boolean;
  results jsonb := '[]'::jsonb;
  failed int := 0;
  detail text;
BEGIN
  -- Do not use session_replication_role (not permitted). Disable email
  -- triggers inside this transaction only; RAISE rolls the disable back.
  BEGIN EXECUTE 'ALTER TABLE public.user_profiles DISABLE TRIGGER trg_notify_welcome_email'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.consultation_requests DISABLE TRIGGER trg_notify_consultation_email'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.contact_messages DISABLE TRIGGER trg_notify_contact_message_email'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.enterprise_requests DISABLE TRIGGER trg_notify_enterprise_request_email'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.newsletter_subscribers DISABLE TRIGGER trg_notify_newsletter_welcome'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER TABLE public.forum_replies DISABLE TRIGGER trg_notify_forum_reply_email'; EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    SELECT id INTO instance FROM auth.instances LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    instance := '00000000-0000-0000-0000-000000000000';
  END;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (instance, alice, 'authenticated', 'authenticated', 'phase5.safe.alice.' || alice::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, bob, 'authenticated', 'authenticated', 'phase5.safe.bob.' || bob::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, carol, 'authenticated', 'authenticated', 'phase5.safe.carol.' || carol::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, reviewer, 'authenticated', 'authenticated', 'phase5.safe.reviewer.' || reviewer::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, company_a, 'authenticated', 'authenticated', 'phase5.safe.coa.' || company_a::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (instance, company_b, 'authenticated', 'authenticated', 'phase5.safe.cob.' || company_b::text || '@invalid.test', crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

  INSERT INTO public.user_profiles (
    id, email, full_name, is_admin, is_test_account, hide_from_directory,
    welcome_email_sent, email_opt_in, marketing_opt_in
  ) VALUES
    (alice, 'phase5.safe.alice.' || alice::text || '@invalid.test', 'Phase5 Safe Alice', false, true, true, true, false, false),
    (bob, 'phase5.safe.bob.' || bob::text || '@invalid.test', 'Phase5 Safe Bob', false, true, true, true, false, false),
    (carol, 'phase5.safe.carol.' || carol::text || '@invalid.test', 'Phase5 Safe Carol', false, true, true, true, false, false),
    (reviewer, 'phase5.safe.reviewer.' || reviewer::text || '@invalid.test', 'Phase5 Safe Reviewer', false, true, true, true, false, false),
    (company_a, 'phase5.safe.coa.' || company_a::text || '@invalid.test', 'Phase5 Safe CoA', false, true, true, true, false, false),
    (company_b, 'phase5.safe.cob.' || company_b::text || '@invalid.test', 'Phase5 Safe CoB', false, true, true, true, false, false)
  ON CONFLICT (id) DO UPDATE SET
    welcome_email_sent = true,
    email_opt_in = false,
    marketing_opt_in = false,
    hide_from_directory = true,
    is_test_account = true;

  INSERT INTO public.platform_roles (user_id, role) VALUES
    (alice, 'member'), (bob, 'member'), (carol, 'member'),
    (reviewer, 'member'), (reviewer, 'platform_admin'),
    (company_a, 'member'), (company_b, 'member');

  INSERT INTO public.social_posts (id, author_id, body, is_published, is_hidden, is_draft, deleted_at)
  VALUES (post_id, alice, 'phase5 safe deleted post', true, false, false, now());

  INSERT INTO public.job_listings (id, company_id, title, description, company_name, employment_type, experience_level, is_published, status)
  VALUES
    (job_a, company_a, 'Safe Job A', 'desc', 'CoA', 'full_time', 'mid', true, 'open'),
    (job_b, company_b, 'Safe Job B', 'desc', 'CoB', 'full_time', 'mid', true, 'open');

  INSERT INTO public.job_applications (id, job_id, applicant_id, status)
  VALUES (app_id, job_b, alice, 'submitted');

  INSERT INTO public.verification_requests (id, user_id, kind, status, attestation_accepted)
  VALUES (req_id, alice, 'professional', 'submitted', true);

  INSERT INTO public.verification_documents (request_id, storage_path, bucket_name, uploaded_by, mime_type)
  VALUES (req_id, alice::text || '/safe.pdf', 'verifications', alice, 'application/pdf');

  INSERT INTO public.content_reports (reporter_id, entity_type, entity_id, reason, details, status)
  VALUES (alice, 'post', post_id::text, 'spam', 'phase5 safe', 'open')
  RETURNING id INTO report_id;

  INSERT INTO public.member_blocks (blocker_id, blocked_id) VALUES (bob, carol);
  INSERT INTO public.member_mutes (muter_id, muted_id) VALUES (bob, alice);

  n1 := public.emit_event_notification(alice, 'A', 'body', 'info', '/x', bob, 'test', '1', 'safe:1:' || alice::text);
  n2 := public.emit_event_notification(bob, 'B', 'body', 'info', '/x', alice, 'test', '2', 'safe:2:' || bob::text);

  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.notifications WHERE id IN (n1, n2);
  results := results || jsonb_build_array(jsonb_build_object('n', 1, 'name', 'notifications_recipient_only', 'ok', seen = 1, 'detail', format('visible=%s', seen)));
  IF seen <> 1 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.notifications (user_id, title, body, type) VALUES (bob, 'forged', 'forged', 'info');
    results := results || jsonb_build_array(jsonb_build_object('n', 2, 'name', 'no_forged_notification_insert', 'ok', false, 'detail', 'insert succeeded'));
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 2, 'name', 'no_forged_notification_insert', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  n3 := public.emit_event_notification(alice, 'Self', 'body', 'info', '/x', alice, 'test', '3', 'safe:3:' || alice::text);
  results := results || jsonb_build_array(jsonb_build_object('n', 3, 'name', 'skip_self_notify', 'ok', n3 IS NULL, 'detail', coalesce(n3::text, 'null')));
  IF n3 IS NOT NULL THEN failed := failed + 1; END IF;

  n4 := public.emit_event_notification(bob, 'Blocked', 'body', 'info', '/x', carol, 'test', '4', 'safe:4:' || bob::text);
  results := results || jsonb_build_array(jsonb_build_object('n', 4, 'name', 'blocked_pair_no_notify', 'ok', n4 IS NULL, 'detail', coalesce(n4::text, 'null')));
  IF n4 IS NOT NULL THEN failed := failed + 1; END IF;

  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.verification_documents (request_id, storage_path, bucket_name, uploaded_by)
    VALUES (req_id, bob::text || '/bad.pdf', 'verifications', alice);
    results := results || jsonb_build_array(jsonb_build_object('n', 5, 'name', 'verification_path_under_uid', 'ok', false, 'detail', 'foreign path accepted'));
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 5, 'name', 'verification_path_under_uid', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.verification_documents WHERE request_id = req_id;
  results := results || jsonb_build_array(jsonb_build_object('n', 6, 'name', 'verification_docs_isolated', 'ok', seen = 0, 'detail', format('visible=%s', seen)));
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.review_verification_request(req_id, 'approved', 'phase5 safe');
    results := results || jsonb_build_array(jsonb_build_object('n', 7, 'name', 'unauthorized_review_denied', 'ok', false, 'detail', 'review succeeded'));
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 7, 'name', 'unauthorized_review_denied', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', reviewer::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', reviewer::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.review_verification_request(req_id, 'approved', 'phase5 safe approve');
  EXECUTE 'RESET ROLE';
  ok := EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = alice AND role = 'verified_professional');
  results := results || jsonb_build_array(jsonb_build_object('n', 8, 'name', 'approval_grants_verified_professional', 'ok', ok, 'detail', 'role_row'));
  IF NOT ok THEN failed := failed + 1; END IF;

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.grant_platform_role(bob, 'super_admin', 'phase5 safe');
    results := results || jsonb_build_array(jsonb_build_object('n', 9, 'name', 'no_self_grant_admin', 'ok', false, 'detail', 'self grant succeeded'));
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 9, 'name', 'no_self_grant_admin', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    UPDATE public.audit_logs SET reason = 'tamper' WHERE false;
    UPDATE public.audit_logs SET reason = 'tamper' WHERE actor_id = reviewer;
    GET DIAGNOSTICS seen = ROW_COUNT;
    IF seen > 0 THEN
      results := results || jsonb_build_array(jsonb_build_object('n', 10, 'name', 'audit_logs_immutable', 'ok', false, 'detail', 'update succeeded'));
      failed := failed + 1;
    ELSE
      BEGIN
        DELETE FROM public.audit_logs WHERE actor_id = reviewer;
        GET DIAGNOSTICS seen = ROW_COUNT;
        results := results || jsonb_build_array(jsonb_build_object('n', 10, 'name', 'audit_logs_immutable', 'ok', seen = 0, 'detail', format('deleted=%s', seen)));
        IF seen > 0 THEN failed := failed + 1; END IF;
      EXCEPTION WHEN OTHERS THEN
        results := results || jsonb_build_array(jsonb_build_object('n', 10, 'name', 'audit_logs_immutable', 'ok', true, 'detail', SQLERRM));
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 10, 'name', 'audit_logs_immutable', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', company_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', company_a::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.job_applications WHERE id = app_id;
  results := results || jsonb_build_array(jsonb_build_object('n', 11, 'name', 'company_application_isolation', 'ok', seen = 0, 'detail', format('visible=%s', seen)));
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.content_reports WHERE id = report_id;
  other_hidden := seen = 0;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.content_reports WHERE id = report_id;
  results := results || jsonb_build_array(jsonb_build_object('n', 12, 'name', 'reporter_sees_own_reports', 'ok', other_hidden AND seen = 1, 'detail', format('owner=%s', seen)));
  IF NOT (other_hidden AND seen = 1) THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM count(*) FROM public.list_moderation_queue(NULL, NULL, NULL, NULL, NULL, NULL, 5, 0);
    results := results || jsonb_build_array(jsonb_build_object('n', 13, 'name', 'member_cannot_list_moderation_queue', 'ok', false, 'detail', 'queue visible'));
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 13, 'name', 'member_cannot_list_moderation_queue', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO seen FROM public.social_posts WHERE id = post_id;
  results := results || jsonb_build_array(jsonb_build_object('n', 14, 'name', 'soft_deleted_post_hidden', 'ok', seen = 0, 'detail', format('visible=%s', seen)));
  IF seen <> 0 THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.apply_moderation_action(NULL, 'restore', 'phase5 safe restore', 'post', post_id::text);
    results := results || jsonb_build_array(jsonb_build_object('n', 15, 'name', 'restore_capability_gated', 'ok', false, 'detail', 'restore succeeded'));
    failed := failed + 1;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 15, 'name', 'restore_capability_gated', 'ok', true, 'detail', SQLERRM));
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    UPDATE public.job_applications
    SET status = 'withdrawn', withdrawn_at = now()
    WHERE id = app_id AND applicant_id = alice;
    GET DIAGNOSTICS seen = ROW_COUNT;
    results := results || jsonb_build_array(jsonb_build_object('n', 16, 'name', 'applicant_can_withdraw', 'ok', seen = 1, 'detail', format('rows=%s', seen)));
    IF seen <> 1 THEN failed := failed + 1; END IF;
  EXCEPTION WHEN OTHERS THEN
    results := results || jsonb_build_array(jsonb_build_object('n', 16, 'name', 'applicant_can_withdraw', 'ok', false, 'detail', SQLERRM));
    failed := failed + 1;
  END;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ok := (public.has_capability('moderate_community') IS NOT TRUE) AND (public.has_capability('review_verification') IS NOT TRUE);
  results := results || jsonb_build_array(jsonb_build_object('n', 17, 'name', 'mute_adds_no_capability', 'ok', ok, 'detail', 'capabilities'));
  IF NOT ok THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', alice::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', alice::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ok := public.can_access_verification_object(alice::text || '/safe.pdf');
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', bob::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bob::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ok := ok AND (public.can_access_verification_object(alice::text || '/safe.pdf') IS NOT TRUE);
  results := results || jsonb_build_array(jsonb_build_object('n', 18, 'name', 'verification_object_owner_or_reviewer', 'ok', ok, 'detail', 'owner/other'));
  IF NOT ok THEN failed := failed + 1; END IF;
  EXECUTE 'RESET ROLE';

  ok := EXISTS (SELECT 1 FROM public.audit_logs WHERE action = 'review_verification' AND entity_id = req_id::text);
  results := results || jsonb_build_array(jsonb_build_object('n', 19, 'name', 'review_writes_audit_logs', 'ok', ok, 'detail', 'audit'));
  IF NOT ok THEN failed := failed + 1; END IF;

  n3 := public.emit_event_notification(alice, 'Dup', 'body', 'info', '/x', bob, 'test', '20', 'safe:dup:' || alice::text);
  n4 := public.emit_event_notification(alice, 'Dup2', 'body', 'info', '/x', bob, 'test', '20b', 'safe:dup:' || alice::text);
  SELECT count(*) INTO seen FROM public.notifications WHERE idempotency_key = 'safe:dup:' || alice::text;
  ok := n3 IS NOT NULL AND n3 = n4 AND seen = 1;
  results := results || jsonb_build_array(jsonb_build_object('n', 20, 'name', 'duplicate_idempotency', 'ok', ok, 'detail', format('count=%s', seen)));
  IF NOT ok THEN failed := failed + 1; END IF;

  IF failed > 0 THEN
    RAISE EXCEPTION 'PHASE5_RLS_FAIL:%', results::text;
  END IF;
  RAISE EXCEPTION 'PHASE5_RLS_OK:20/20';
END
$$;
