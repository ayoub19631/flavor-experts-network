-- Phase 4 + Phase 5 production preflight
-- READ-ONLY. Do not treat this as a migration.
-- No INSERT / UPDATE / DELETE / DROP / ALTER / CREATE.
-- No RPCs that write data. No migration history changes.
-- Orphan auth users are reported only. Copy the result grid from the SQL Editor.

SELECT
  check_name,
  status,
  details,
  blocking
FROM (
  -- 1. Prerequisite tables
  SELECT
    'prereq_table_' || t.table_name AS check_name,
    CASE WHEN to_regclass('public.' || t.table_name) IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE
      WHEN to_regclass('public.' || t.table_name) IS NOT NULL THEN 'public.' || t.table_name || ' exists'
      ELSE 'public.' || t.table_name || ' is missing; Phase 4/5 ALTER/FK statements will fail'
    END AS details,
    (to_regclass('public.' || t.table_name) IS NULL) AS blocking
  FROM (
    VALUES
      ('user_profiles'),
      ('notifications'),
      ('social_posts'),
      ('social_post_comments'),
      ('social_post_likes'),
      ('forum_topics'),
      ('forum_replies'),
      ('forum_categories'),
      ('job_listings'),
      ('job_applications'),
      ('member_follows'),
      ('skill_endorsements'),
      ('member_recommendations'),
      ('conversation_messages'),
      ('educational_resources'),
      ('consultation_requests'),
      ('enterprise_requests')
  ) AS t(table_name)

  UNION ALL

  -- 1b. Phase 4/5 tables: present = already applied or extra object
  SELECT
    'phase_table_' || t.table_name,
    CASE
      WHEN to_regclass('public.' || t.table_name) IS NULL THEN 'PASS'
      ELSE 'WARNING'
    END,
    CASE
      WHEN to_regclass('public.' || t.table_name) IS NULL THEN 'public.' || t.table_name || ' not present yet; migration can create it'
      ELSE 'public.' || t.table_name || ' already exists; skip re-creating and watch policy/index conflicts'
    END,
    false
  FROM (
    VALUES
      ('platform_roles'),
      ('audit_logs'),
      ('content_reports'),
      ('member_blocks'),
      ('member_mutes'),
      ('moderation_actions'),
      ('notification_preferences'),
      ('notification_deliveries'),
      ('post_mentions'),
      ('comment_mentions'),
      ('forum_topic_mentions'),
      ('forum_reply_mentions'),
      ('verification_requests'),
      ('verification_documents'),
      ('verification_review_actions'),
      ('post_media'),
      ('polls'),
      ('saved_jobs'),
      ('job_alerts'),
      ('company_members'),
      ('events'),
      ('event_registrations'),
      ('consultation_bookings')
  ) AS t(table_name)

  UNION ALL

  -- 2. Required columns on existing tables (jsonb-safe for optional names)
  SELECT
    'column_' || c.table_name || '_' || c.column_name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns ic
        WHERE ic.table_schema = 'public'
          AND ic.table_name = c.table_name
          AND ic.column_name = c.column_name
      ) THEN 'PASS'
      ELSE 'WARNING'
    END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns ic
        WHERE ic.table_schema = 'public'
          AND ic.table_name = c.table_name
          AND ic.column_name = c.column_name
      ) THEN 'public.' || c.table_name || '.' || c.column_name || ' exists'
      ELSE 'public.' || c.table_name || '.' || c.column_name || ' missing; later ADD COLUMN IF NOT EXISTS should add it'
    END,
    false
  FROM (
    VALUES
      ('notifications', 'user_id'),
      ('notifications', 'is_read'),
      ('notifications', 'link'),
      ('notifications', 'actor_id'),
      ('notifications', 'idempotency_key'),
      ('user_profiles', 'is_admin'),
      ('user_profiles', 'profile_slug'),
      ('social_posts', 'deleted_at'),
      ('forum_topics', 'deleted_at'),
      ('forum_replies', 'deleted_at'),
      ('job_listings', 'slug'),
      ('job_listings', 'deleted_at')
  ) AS c(table_name, column_name)
  WHERE to_regclass('public.' || c.table_name) IS NOT NULL

  UNION ALL

  -- 3. Name collisions for objects the new files create
  SELECT
    'name_collision_' || r.relname,
    'WARNING',
    'Relation public.' || r.relname || ' already exists as ' || r.relkind || '; CREATE IF NOT EXISTS will no-op',
    false
  FROM pg_class r
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE n.nspname = 'public'
    AND r.relname IN (
      'platform_roles', 'audit_logs', 'content_reports', 'comment_mentions',
      'forum_topic_mentions', 'forum_reply_mentions', 'verification_review_actions'
    )
    AND r.relkind IN ('r', 'v', 'm', 'p')

  UNION ALL

  -- 4. Functions / RPC signatures
  SELECT
    'function_' || f.proname,
    CASE WHEN p.oid IS NULL THEN 'WARNING' ELSE 'PASS' END,
    CASE
      WHEN p.oid IS NULL THEN f.proname || '(' || f.args || ') not present yet'
      ELSE f.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') exists'
    END,
    false
  FROM (
    VALUES
      ('has_capability', 'text'),
      ('has_platform_role', 'text'),
      ('is_platform_admin', ''),
      ('is_blocked_pair', 'uuid, uuid'),
      ('is_muted_by', 'uuid, uuid'),
      ('create_notification', 'uuid, text, text, text, text, uuid, text, text, text'),
      ('emit_event_notification', 'uuid, text, text, text, text, uuid, text, text, text'),
      ('list_my_notifications', 'integer, timestamp with time zone'),
      ('unread_notification_count', ''),
      ('search_member_mentions', 'text, integer'),
      ('save_content_mentions', 'text, uuid, uuid[]'),
      ('review_verification_request', 'uuid, text, text'),
      ('apply_moderation_action', 'uuid, text, text, text, text'),
      ('phase5_workflows_ready', ''),
      ('safe_app_path', 'text')
  ) AS f(proname, args)
  LEFT JOIN pg_proc p
    ON p.proname = f.proname
   AND pg_function_is_visible(p.oid)
   AND pg_get_function_identity_arguments(p.oid) = f.args

  UNION ALL

  -- 5. Notify / email triggers (duplicates and real email)
  SELECT
    'trigger_' || t.tgname || '_on_' || c.relname,
    CASE
      WHEN t.tgname ILIKE '%email%' THEN 'WARNING'
      WHEN COUNT(*) OVER (PARTITION BY c.relname, t.tgname) > 1 THEN 'FAIL'
      ELSE 'PASS'
    END,
    'Trigger ' || t.tgname || ' on public.' || c.relname
      || ' enabled=' || t.tgenabled
      || CASE WHEN t.tgname ILIKE '%email%' THEN '; legacy email trigger may send real mail' ELSE '' END,
    false
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND (
      t.tgname ILIKE '%notif%'
      OR t.tgname ILIKE '%mention%'
      OR t.tgname ILIKE '%email%'
    )

  UNION ALL

  SELECT
    'legacy_forum_email_trigger',
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'forum_replies' AND t.tgname = 'trg_notify_forum_reply_email'
    ) THEN 'WARNING' ELSE 'PASS' END,
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'forum_replies' AND t.tgname = 'trg_notify_forum_reply_email'
    ) THEN 'trg_notify_forum_reply_email exists and can send Resend email; apply 5G after 5F to drop it'
    ELSE 'No legacy forum reply email trigger'
    END,
    false

  UNION ALL

  -- 6. RLS enabled
  SELECT
    'rls_' || c.relname,
    CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'WARNING' END,
    'public.' || c.relname || CASE WHEN c.relrowsecurity THEN ' has RLS enabled' ELSE ' does not have RLS enabled yet' END,
    false
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'notifications', 'user_profiles', 'social_posts', 'forum_topics', 'forum_replies',
      'platform_roles', 'audit_logs', 'content_reports', 'verification_requests',
      'verification_documents', 'comment_mentions', 'post_mentions'
    )

  UNION ALL

  -- 7. Policies that new files also create
  SELECT
    'policy_' || p.tablename || '_' || p.policyname,
    'WARNING',
    'Policy ' || p.policyname || ' already exists on ' || p.schemaname || '.' || p.tablename
      || '; migrations DROP POLICY IF EXISTS then recreate',
    false
  FROM pg_policies p
  WHERE p.schemaname IN ('public', 'storage')
    AND p.policyname IN (
      'notifications_own', 'notifications_own_update', 'notifications_own_delete',
      'social_posts_select', 'jobs_select',
      'verification_requests_select', 'verification_documents_select',
      'verifications_select', 'verifications_insert', 'verifications_update', 'verifications_delete',
      'comment_mentions_write', 'post_mentions_write',
      'forum_topic_mentions_write', 'forum_reply_mentions_write'
    )

  UNION ALL

  -- 8. Grants on notifications
  SELECT
    'grant_notifications_' || g.grantee || '_' || g.privilege_type,
    CASE
      WHEN g.grantee IN ('anon', 'authenticated') AND g.privilege_type = 'INSERT' THEN 'WARNING'
      ELSE 'PASS'
    END,
    'notifications ' || g.privilege_type || ' granted to ' || g.grantee
      || CASE WHEN g.privilege_type = 'INSERT' THEN '; 5A will revoke client INSERT' ELSE '' END,
    false
  FROM information_schema.role_table_grants g
  WHERE g.table_schema = 'public'
    AND g.table_name = 'notifications'
    AND g.grantee IN ('anon', 'authenticated', 'service_role')

  UNION ALL

  SELECT
    'grant_emit_event_notification',
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges rp
      WHERE rp.routine_schema = 'public'
        AND rp.routine_name = 'emit_event_notification'
        AND rp.grantee IN ('anon', 'authenticated', 'PUBLIC')
        AND rp.privilege_type = 'EXECUTE'
    ) THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges rp
      WHERE rp.routine_schema = 'public'
        AND rp.routine_name = 'emit_event_notification'
        AND rp.grantee IN ('anon', 'authenticated', 'PUBLIC')
        AND rp.privilege_type = 'EXECUTE'
    ) THEN 'emit_event_notification is executable by clients; must stay revoked'
    ELSE 'emit_event_notification is not granted to anon/authenticated, or function is absent'
    END,
    EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges rp
      WHERE rp.routine_schema = 'public'
        AND rp.routine_name = 'emit_event_notification'
        AND rp.grantee IN ('anon', 'authenticated', 'PUBLIC')
        AND rp.privilege_type = 'EXECUTE'
    )

  UNION ALL

  -- 9. Extensions
  SELECT
    'extension_' || e.extname,
    'PASS',
    'Extension ' || e.extname || ' is installed',
    false
  FROM pg_extension e
  WHERE e.extname IN ('pgcrypto', 'uuid-ossp', 'pg_trgm', 'pg_net', 'pgcrypto')

  UNION ALL

  SELECT
    'extension_pgcrypto',
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN 'pgcrypto present'
    ELSE 'pgcrypto not found; gen_random_uuid may still work via built-in'
    END,
    false

  UNION ALL

  -- 10–12. Storage bucket verifications
  SELECT
    'storage_verifications_exists',
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'verifications' OR b.name = 'verifications')
      THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'verifications' OR b.name = 'verifications')
      THEN 'Bucket verifications exists'
      ELSE 'Bucket verifications is missing; create it as Private before or after 5B'
    END,
    false

  UNION ALL

  SELECT
    'storage_verifications_private',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'verifications' OR b.name = 'verifications') THEN 'WARNING'
      WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE (b.id = 'verifications' OR b.name = 'verifications') AND b.public IS TRUE) THEN 'FAIL'
      ELSE 'PASS'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'verifications' OR b.name = 'verifications') THEN 'Cannot check public flag; bucket missing'
      WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE (b.id = 'verifications' OR b.name = 'verifications') AND b.public IS TRUE)
        THEN 'verifications is PUBLIC; do not apply until it is private. 5G forces public=false'
      ELSE 'verifications is private'
    END,
    EXISTS (SELECT 1 FROM storage.buckets b WHERE (b.id = 'verifications' OR b.name = 'verifications') AND b.public IS TRUE)

  UNION ALL

  SELECT
    'storage_policy_' || p.policyname,
    'WARNING',
    'storage.objects policy ' || p.policyname || ' already exists',
    false
  FROM pg_policies p
  WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
    AND (
      p.policyname ILIKE '%verif%'
      OR COALESCE(p.qual, '') ILIKE '%verifications%'
      OR COALESCE(p.with_check, '') ILIKE '%verifications%'
    )

  UNION ALL

  -- 13. Applied Phase 4/5 migration versions (catalog only; no write)
  SELECT
    'migration_history_available',
    CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
      THEN 'supabase_migrations.schema_migrations exists. In SQL Editor also run: SELECT version FROM supabase_migrations.schema_migrations WHERE version LIKE ''20260902%'' OR version LIKE ''20260907%''; re-applying a recorded version is unsafe'
      ELSE 'Could not see supabase_migrations.schema_migrations from this role'
    END,
    false

  UNION ALL

  -- 14. Data that may violate upcoming unique/check constraints
  SELECT
    'data_duplicate_profile_slug',
    CASE WHEN dups.n > 0 THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN dups.n > 0 THEN dups.n::text || ' duplicate non-null profile_slug values; 4B unique index will fail'
    ELSE 'No duplicate profile_slug values (missing column counts as none)'
    END,
    dups.n > 0
  FROM (
    SELECT COALESCE(COUNT(*), 0) AS n FROM (
      SELECT to_jsonb(p)->>'profile_slug' AS slug
      FROM public.user_profiles p
      WHERE to_jsonb(p) ? 'profile_slug'
        AND NULLIF(to_jsonb(p)->>'profile_slug', '') IS NOT NULL
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) x
  ) dups

  UNION ALL

  SELECT
    'data_duplicate_job_slug',
    CASE WHEN dups.n > 0 THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN dups.n > 0 THEN dups.n::text || ' duplicate non-null job slugs; 4C unique index will fail'
    ELSE 'No duplicate job slugs'
    END,
    dups.n > 0
  FROM (
    SELECT COALESCE(COUNT(*), 0) AS n FROM (
      SELECT to_jsonb(j)->>'slug' AS slug
      FROM public.job_listings j
      WHERE to_jsonb(j) ? 'slug'
        AND NULLIF(to_jsonb(j)->>'slug', '') IS NOT NULL
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) x
  ) dups

  UNION ALL

  SELECT
    'data_duplicate_notification_idempotency',
    CASE WHEN dups.n > 0 THEN 'FAIL' ELSE 'PASS' END,
    CASE WHEN dups.n > 0 THEN dups.n::text || ' duplicate idempotency_key values; 4A unique index will fail'
    ELSE 'No duplicate notification idempotency keys'
    END,
    dups.n > 0
  FROM (
    SELECT COALESCE(COUNT(*), 0) AS n FROM (
      SELECT to_jsonb(n)->>'idempotency_key' AS k
      FROM public.notifications n
      WHERE to_jsonb(n) ? 'idempotency_key'
        AND NULLIF(to_jsonb(n)->>'idempotency_key', '') IS NOT NULL
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) x
  ) dups

  UNION ALL

  -- 15. Auth users without profiles (report only)
  SELECT
    'orphan_auth_users',
    CASE WHEN n.n > 0 THEN 'WARNING' ELSE 'PASS' END,
    n.n::text || ' auth users have no public.user_profiles row; report only, not deleted. sample_ids=' || COALESCE(n.sample, 'none'),
    false
  FROM (
    SELECT
      (
        SELECT COUNT(*)::int
        FROM auth.users u
        LEFT JOIN public.user_profiles p ON p.id = u.id
        WHERE p.id IS NULL
      ) AS n,
      (
        SELECT string_agg(s.id::text, ',')
        FROM (
          SELECT u.id
          FROM auth.users u
          LEFT JOIN public.user_profiles p ON p.id = u.id
          WHERE p.id IS NULL
          LIMIT 10
        ) s
      ) AS sample
  ) n

  UNION ALL

  -- 16. Unsafe storage paths
  SELECT
    'storage_unsafe_paths',
    CASE WHEN n.n > 0 THEN 'WARNING' ELSE 'PASS' END,
    n.n::text || ' storage.objects rows have .. or backslash in name',
    false
  FROM (
    SELECT COUNT(*)::int AS n
    FROM storage.objects o
    WHERE o.name LIKE '%..%' OR o.name LIKE '%\\%'
  ) n

  UNION ALL

  SELECT
    'storage_verifications_unsafe_paths',
    CASE WHEN n.n > 0 THEN 'WARNING' ELSE 'PASS' END,
    n.n::text || ' objects in verifications have unsafe paths; 5F trigger blocks new writes only',
    false
  FROM (
    SELECT COUNT(*)::int AS n
    FROM storage.objects o
    WHERE o.bucket_id = 'verifications'
      AND (o.name LIKE '%..%' OR o.name LIKE '%\\%' OR o.name NOT LIKE '%/%')
  ) n

  UNION ALL

  -- 17. Objects that can make apply fail
  SELECT
    'apply_risk_missing_auth_users',
    'PASS',
    'auth.users is readable for FK checks',
    false
  WHERE to_regnamespace('auth') IS NOT NULL

  UNION ALL

  SELECT
    'apply_risk_admin_count',
    'WARNING',
    (
      SELECT COUNT(*)::text FROM public.user_profiles WHERE is_admin = true
    ) || ' user_profiles.is_admin=true rows; 4A inserts super_admin/platform_admin ON CONFLICT DO NOTHING (additive only)',
    false

  UNION ALL

  -- 18. Row estimates (no writes)
  SELECT
    'row_estimate_' || t.relname,
    'PASS',
    'approx_rows=' || COALESCE(s.n_live_tup, t.reltuples)::bigint::text
      || ' exact_profiles_or_posts_used_only_for_known_tables',
    false
  FROM pg_class t
  JOIN pg_namespace n ON n.oid = t.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = t.oid
  WHERE n.nspname = 'public'
    AND t.relkind = 'r'
    AND t.relname IN (
      'user_profiles', 'notifications', 'social_posts', 'forum_topics', 'forum_replies',
      'job_listings', 'job_applications', 'platform_roles', 'content_reports',
      'verification_requests', 'verification_documents'
    )

  UNION ALL

  SELECT
    'row_exact_user_profiles',
    'PASS',
    'exact_count=' || (SELECT COUNT(*)::text FROM public.user_profiles)
      || '; 4A will insert member role for each missing (user_id, member) pair',
    false

  UNION ALL

  SELECT
    'row_exact_notifications',
    'PASS',
    'exact_count=' || (SELECT COUNT(*)::text FROM public.notifications),
    false

  UNION ALL

  SELECT
    'preflight_readonly_contract',
    'PASS',
    'This script selected catalog and existing rows only. No data was changed.',
    false
) checks
ORDER BY
  CASE status WHEN 'FAIL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END,
  check_name;
