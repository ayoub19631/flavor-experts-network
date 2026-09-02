-- Phase 4A — roles, audit, soft delete, reports, blocks, mutes, notifications
-- Local/staging only until explicitly approved. No destructive drops.

-- ── Roles ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'super_admin',
    'platform_admin',
    'content_editor',
    'community_moderator',
    'research_editor',
    'jobs_moderator',
    'support_agent',
    'verified_professional',
    'verified_company',
    'member'
  )),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS platform_roles_role_idx ON public.platform_roles(role);

INSERT INTO public.platform_roles (user_id, role, granted_by)
SELECT id, 'super_admin', id FROM public.user_profiles WHERE is_admin = true
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_roles (user_id, role, granted_by)
SELECT id, 'platform_admin', id FROM public.user_profiles WHERE is_admin = true
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_roles (user_id, role)
SELECT id, 'member' FROM public.user_profiles
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_platform_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = (SELECT auth.uid()) AND role = p_role
  ) OR (
    p_role IN ('super_admin', 'platform_admin')
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_platform_role('super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_platform_role('super_admin')
    OR public.has_platform_role('platform_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    );
$$;

CREATE OR REPLACE FUNCTION public.has_capability(p_capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_capability
    WHEN 'admin' THEN public.is_platform_admin()
    WHEN 'moderate_community' THEN public.is_platform_admin() OR public.has_platform_role('community_moderator')
    WHEN 'moderate_jobs' THEN public.is_platform_admin() OR public.has_platform_role('jobs_moderator')
    WHEN 'edit_content' THEN public.is_platform_admin() OR public.has_platform_role('content_editor') OR public.has_platform_role('research_editor')
    WHEN 'support' THEN public.is_platform_admin() OR public.has_platform_role('support_agent')
    WHEN 'grant_admin' THEN public.is_super_admin()
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_platform_role(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_capability(text) TO authenticated;

-- ── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_old jsonb DEFAULT NULL,
  p_new jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.has_capability('admin') AND NOT public.has_capability('moderate_community') THEN
    RAISE EXCEPTION 'Not allowed to write audit logs.';
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, reason)
  VALUES ((SELECT auth.uid()), p_action, p_entity_type, p_entity_id, p_old, p_new, p_reason)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be changed from the client.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- ── Soft delete columns ──────────────────────────────────────────────────────
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.social_post_comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.consultation_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE public.enterprise_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

-- ── Reports / blocks / mutes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'post', 'comment', 'member', 'message', 'forum_topic', 'forum_reply', 'job', 'company', 'publication'
  )),
  entity_id text NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'action_taken', 'dismissed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.member_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.member_mutes (
  muter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.content_reports(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_blocked_pair(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_blocks
    WHERE (blocker_id = p_a AND blocked_id = p_b)
       OR (blocker_id = p_b AND blocked_id = p_a)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_muted_by(p_viewer uuid, p_author uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_mutes
    WHERE muter_id = p_viewer AND muted_id = p_author
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_muted_by(uuid, uuid) TO authenticated;

-- ── Notifications compatibility ──────────────────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_idempotency_idx
  ON public.notifications(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  digest text NOT NULL DEFAULT 'off' CHECK (digest IN ('off', 'daily', 'weekly')),
  types jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text DEFAULT 'info',
  p_link text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.notifications WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.notifications (
    user_id, title, body, type, link, actor_id, entity_type, entity_id, idempotency_key
  ) VALUES (
    p_user_id, p_title, p_body, p_type, p_link, p_actor_id, p_entity_type, p_entity_id, p_idempotency_key
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, text, text, text) TO authenticated;

-- ── Role grant RPC ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_platform_role(p_user_id uuid, p_role text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id = (SELECT auth.uid()) AND p_role IN ('super_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'Users cannot grant themselves a privileged role.';
  END IF;
  IF p_role IN ('super_admin', 'platform_admin') AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super admin can grant admin roles.';
  END IF;
  IF NOT public.is_super_admin() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not allowed to grant roles.';
  END IF;
  INSERT INTO public.platform_roles (user_id, role, granted_by)
  VALUES (p_user_id, p_role, (SELECT auth.uid()))
  ON CONFLICT DO NOTHING;
  IF p_role IN ('super_admin', 'platform_admin') THEN
    UPDATE public.user_profiles SET is_admin = true WHERE id = p_user_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_values, reason)
  VALUES ((SELECT auth.uid()), 'grant_role', 'user', p_user_id::text, jsonb_build_object('role', p_role), p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_platform_role(p_user_id uuid, p_role text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role IN ('super_admin', 'platform_admin') AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super admin can revoke admin roles.';
  END IF;
  IF NOT public.is_super_admin() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not allowed to revoke roles.';
  END IF;
  DELETE FROM public.platform_roles WHERE user_id = p_user_id AND role = p_role;
  IF p_role IN ('super_admin', 'platform_admin')
     AND NOT EXISTS (
       SELECT 1 FROM public.platform_roles
       WHERE user_id = p_user_id AND role IN ('super_admin', 'platform_admin')
     )
  THEN
    UPDATE public.user_profiles SET is_admin = false WHERE id = p_user_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_values, reason)
  VALUES ((SELECT auth.uid()), 'revoke_role', 'user', p_user_id::text, jsonb_build_object('role', p_role), p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_platform_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_platform_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb, jsonb, text) TO authenticated;

-- ── Soft-delete aware public reads ───────────────────────────────────────────
DROP POLICY IF EXISTS social_posts_select ON public.social_posts;
CREATE POLICY social_posts_select ON public.social_posts
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_admin()
      OR public.has_capability('moderate_community')
      OR author_id = (SELECT auth.uid())
      OR (is_published = true AND is_hidden = false)
    )
  );

DROP POLICY IF EXISTS jobs_select ON public.job_listings;
CREATE POLICY jobs_select ON public.job_listings
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_platform_admin()
      OR public.has_capability('moderate_jobs')
      OR ((SELECT auth.uid()) IS NOT NULL AND company_id = (SELECT auth.uid()))
      OR (
        is_published = true
        AND status = 'open'
        AND ((SELECT auth.uid()) IS NULL OR public.has_active_subscription())
      )
    )
  );

DROP POLICY IF EXISTS forum_topics_read ON public.forum_topics;
CREATE POLICY forum_topics_read ON public.forum_topics
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.forum_categories c
      WHERE c.id = category_id AND (c.is_published = true OR public.is_platform_admin())
    )
  );

-- Block-aware connection insert
DROP POLICY IF EXISTS member_connections_insert ON public.member_connections;
CREATE POLICY member_connections_insert ON public.member_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = (SELECT auth.uid())
    AND public.is_email_verified()
    AND NOT public.is_blocked_pair(requester_id, addressee_id)
  );

-- ── RLS for new tables ───────────────────────────────────────────────────────
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_roles_read ON public.platform_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

CREATE POLICY platform_roles_write ON public.platform_roles
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY audit_logs_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_capability('admin') OR public.has_capability('moderate_community'));

CREATE POLICY content_reports_insert ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY content_reports_select ON public.content_reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR public.has_capability('moderate_community') OR public.is_platform_admin());

CREATE POLICY content_reports_update ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.has_capability('moderate_community') OR public.is_platform_admin())
  WITH CHECK (public.has_capability('moderate_community') OR public.is_platform_admin());

CREATE POLICY member_blocks_own ON public.member_blocks
  FOR ALL TO authenticated
  USING (blocker_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (blocker_id = (SELECT auth.uid()));

CREATE POLICY member_mutes_own ON public.member_mutes
  FOR ALL TO authenticated
  USING (muter_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (muter_id = (SELECT auth.uid()));

CREATE POLICY moderation_actions_read ON public.moderation_actions
  FOR SELECT TO authenticated
  USING (public.has_capability('moderate_community') OR public.is_platform_admin());

CREATE POLICY moderation_actions_insert ON public.moderation_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability('moderate_community') OR public.is_platform_admin());

CREATE POLICY notification_prefs_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notification_deliveries_admin ON public.notification_deliveries
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS notifications_own_delete ON public.notifications;
CREATE POLICY notifications_own_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.platform_roles, public.audit_logs, public.content_reports,
  public.member_blocks, public.member_mutes, public.moderation_actions,
  public.notification_preferences TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_reports, public.member_blocks,
  public.member_mutes, public.notification_preferences, public.notifications TO authenticated;
GRANT INSERT ON public.audit_logs, public.moderation_actions TO authenticated;
