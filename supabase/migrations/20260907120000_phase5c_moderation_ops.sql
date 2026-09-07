-- Phase 5C — auditable moderation operations and trash
-- Local/staging only. Soft delete only. No DROP TABLE.

ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

CREATE OR REPLACE FUNCTION public.moderation_table_for(p_entity_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_entity_type
    WHEN 'post' THEN 'social_posts'
    WHEN 'comment' THEN 'social_post_comments'
    WHEN 'forum_topic' THEN 'forum_topics'
    WHEN 'forum_reply' THEN 'forum_replies'
    WHEN 'job' THEN 'job_listings'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_entity(p_entity_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_entity_type IN ('post', 'comment', 'forum_topic', 'forum_reply', 'member', 'message', 'publication')
      THEN public.has_capability('moderate_community')
    WHEN p_entity_type IN ('job', 'company')
      THEN public.has_capability('moderate_jobs')
    ELSE public.is_platform_admin()
  END;
$$;

CREATE OR REPLACE FUNCTION public.content_owner_id(p_entity_type text, p_entity_id text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  IF p_entity_type = 'post' THEN
    SELECT author_id INTO owner FROM public.social_posts WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'comment' THEN
    SELECT author_id INTO owner FROM public.social_post_comments WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'forum_topic' THEN
    SELECT author_id INTO owner FROM public.forum_topics WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'forum_reply' THEN
    SELECT author_id INTO owner FROM public.forum_replies WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'job' THEN
    SELECT company_id INTO owner FROM public.job_listings WHERE id = p_entity_id::uuid;
  ELSIF p_entity_type = 'member' THEN
    owner := p_entity_id::uuid;
  END IF;
  RETURN owner;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_soft_delete(p_table text, p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'social_posts' THEN
    UPDATE public.social_posts SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'social_post_comments' THEN
    UPDATE public.social_post_comments SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'forum_topics' THEN
    UPDATE public.forum_topics SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'forum_replies' THEN
    UPDATE public.forum_replies SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSIF p_table = 'job_listings' THEN
    UPDATE public.job_listings SET deleted_at = now(), deleted_by = (SELECT auth.uid()), deletion_reason = p_reason WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unsupported content type.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_restore(p_table text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table = 'social_posts' THEN
    UPDATE public.social_posts SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'social_post_comments' THEN
    UPDATE public.social_post_comments SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'forum_topics' THEN
    UPDATE public.forum_topics SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'forum_replies' THEN
    UPDATE public.forum_replies SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSIF p_table = 'job_listings' THEN
    UPDATE public.job_listings SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unsupported content type.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_moderation_action(
  p_report_id uuid,
  p_action text,
  p_reason text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report public.content_reports%ROWTYPE;
  entity_type text;
  entity_id text;
  owner uuid;
  me uuid := (SELECT auth.uid());
  table_name text;
  action_id uuid;
  next_status text;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required for every moderation action.';
  END IF;
  IF p_action NOT IN ('dismiss', 'hide', 'restore', 'under_review', 'warn') THEN
    RAISE EXCEPTION 'Unsupported moderation action.';
  END IF;

  IF p_report_id IS NOT NULL THEN
    SELECT * INTO report FROM public.content_reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Report not found.';
    END IF;
    entity_type := report.entity_type;
    entity_id := report.entity_id;
  ELSE
    entity_type := p_entity_type;
    entity_id := p_entity_id;
  END IF;

  IF entity_type IS NULL OR entity_id IS NULL THEN
    RAISE EXCEPTION 'Content target is required.';
  END IF;
  IF NOT public.can_moderate_entity(entity_type) THEN
    RAISE EXCEPTION 'Your role cannot moderate this content type.';
  END IF;

  owner := public.content_owner_id(entity_type, entity_id);
  IF owner IS NOT NULL AND owner = me AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'You cannot moderate a report about your own content.';
  END IF;

  table_name := public.moderation_table_for(entity_type);

  IF p_action = 'dismiss' THEN
    next_status := 'dismissed';
  ELSIF p_action = 'under_review' THEN
    next_status := 'under_review';
  ELSIF p_action = 'warn' THEN
    next_status := COALESCE(report.status, 'under_review');
  ELSE
    next_status := 'action_taken';
  END IF;

  IF p_action = 'hide' AND table_name IS NOT NULL THEN
    PERFORM public.apply_soft_delete(table_name, entity_id::uuid, trim(p_reason));
  ELSIF p_action = 'restore' AND table_name IS NOT NULL THEN
    PERFORM public.apply_restore(table_name, entity_id::uuid);
  END IF;

  IF p_report_id IS NOT NULL THEN
    UPDATE public.content_reports
    SET status = next_status, resolution = trim(p_reason), assigned_to = me, updated_at = now()
    WHERE id = p_report_id;
  END IF;

  INSERT INTO public.moderation_actions (actor_id, report_id, entity_type, entity_id, action, reason)
  VALUES (me, p_report_id, entity_type, entity_id, p_action, trim(p_reason))
  RETURNING id INTO action_id;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, reason)
  VALUES (
    me,
    'moderation_' || p_action,
    entity_type,
    entity_id,
    CASE WHEN p_report_id IS NOT NULL THEN jsonb_build_object('report_id', p_report_id, 'status', report.status) ELSE NULL END,
    jsonb_build_object('action', p_action, 'status', next_status),
    trim(p_reason)
  );

  RETURN action_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_moderation_queue(
  p_status text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.content_reports
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_capability('moderate_community') OR public.has_capability('moderate_jobs')) THEN
    RAISE EXCEPTION 'Not allowed to view the moderation queue.';
  END IF;

  RETURN QUERY
  SELECT r.*
  FROM public.content_reports r
  WHERE (p_status IS NULL OR r.status = p_status)
    AND (p_entity_type IS NULL OR r.entity_type = p_entity_type)
    AND (p_reason IS NULL OR r.reason ILIKE '%' || p_reason || '%')
    AND (p_priority IS NULL OR r.priority = p_priority)
    AND (p_from IS NULL OR r.created_at >= p_from)
    AND (p_to IS NULL OR r.created_at <= p_to)
    AND public.can_moderate_entity(r.entity_type)
    AND (
      public.is_super_admin()
      OR public.content_owner_id(r.entity_type, r.entity_id) IS DISTINCT FROM (SELECT auth.uid())
    )
  ORDER BY
    CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
    r.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_moderation_trash(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  owner_id uuid,
  deleted_by uuid,
  reason text,
  deleted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_capability('moderate_community') OR public.has_capability('moderate_jobs')) THEN
    RAISE EXCEPTION 'Not allowed to view trash.';
  END IF;

  RETURN QUERY
  (
    SELECT 'post'::text, p.id, p.author_id, p.deleted_by, p.deletion_reason, p.deleted_at
    FROM public.social_posts p
    WHERE p.deleted_at IS NOT NULL AND public.has_capability('moderate_community')
    UNION ALL
    SELECT 'comment', c.id, c.author_id, c.deleted_by, c.deletion_reason, c.deleted_at
    FROM public.social_post_comments c
    WHERE c.deleted_at IS NOT NULL AND public.has_capability('moderate_community')
    UNION ALL
    SELECT 'forum_topic', t.id, t.author_id, t.deleted_by, t.deletion_reason, t.deleted_at
    FROM public.forum_topics t
    WHERE t.deleted_at IS NOT NULL AND public.has_capability('moderate_community')
    UNION ALL
    SELECT 'forum_reply', r.id, r.author_id, r.deleted_by, r.deletion_reason, r.deleted_at
    FROM public.forum_replies r
    WHERE r.deleted_at IS NOT NULL AND public.has_capability('moderate_community')
    UNION ALL
    SELECT 'job', j.id, j.company_id, j.deleted_by, j.deletion_reason, j.deleted_at
    FROM public.job_listings j
    WHERE j.deleted_at IS NOT NULL AND public.has_capability('moderate_jobs')
  )
  ORDER BY 6 DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

DROP POLICY IF EXISTS social_comments_select ON public.social_post_comments;
CREATE POLICY social_comments_select ON public.social_post_comments
  FOR SELECT TO anon, authenticated
  USING (
    (deleted_at IS NULL AND is_hidden = false)
    OR author_id = (SELECT auth.uid())
    OR public.has_capability('moderate_community')
  );

DROP POLICY IF EXISTS forum_replies_read ON public.forum_replies;
CREATE POLICY forum_replies_read ON public.forum_replies
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL
    OR author_id = (SELECT auth.uid())
    OR public.has_capability('moderate_community')
  );

REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, PUBLIC;
GRANT INSERT ON public.audit_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.apply_moderation_action(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_moderation_queue(text, text, text, text, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_moderation_trash(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_moderate_entity(text) TO authenticated;
