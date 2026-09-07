-- Phase 5A — secure event notifications (staging/local only)
-- No DROP TABLE. No production apply from this branch.

-- ── Capability for verification review (used by 5B; safe no-op if unused) ────
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
    WHEN 'review_verification' THEN public.is_platform_admin()
    ELSE false
  END;
$$;

-- ── Harden notifications: recipients only; no client inserts ─────────────────
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
DROP POLICY IF EXISTS notifications_own ON public.notifications;
DROP POLICY IF EXISTS notifications_own_update ON public.notifications;
DROP POLICY IF EXISTS notifications_own_delete ON public.notifications;

CREATE POLICY notifications_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_read = true);

CREATE POLICY notifications_own_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.link IS DISTINCT FROM OLD.link
     OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'Notifications can only be marked read.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_notification_update ON public.notifications;
CREATE TRIGGER trg_guard_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

REVOKE INSERT ON public.notifications FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.comment_mentions (
  comment_id uuid NOT NULL REFERENCES public.social_post_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, mentioned_user_id)
);

ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_mentions_read ON public.comment_mentions;
CREATE POLICY comment_mentions_read ON public.comment_mentions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS post_mentions_read ON public.post_mentions;
CREATE POLICY post_mentions_read ON public.post_mentions
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS post_mentions_write ON public.post_mentions;
CREATE POLICY post_mentions_write ON public.post_mentions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS comment_mentions_write ON public.comment_mentions;
CREATE POLICY comment_mentions_write ON public.comment_mentions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ── Central emitter (triggers / security definer only) ───────────────────────
CREATE OR REPLACE FUNCTION public.emit_event_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text,
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
  prefs public.notification_preferences%ROWTYPE;
  type_enabled boolean := true;
BEGIN
  IF p_user_id IS NULL OR p_title IS NULL OR p_body IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND public.is_blocked_pair(p_user_id, p_actor_id) THEN
    RETURN NULL;
  END IF;
  IF p_actor_id IS NOT NULL AND public.is_muted_by(p_user_id, p_actor_id) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  IF FOUND THEN
    IF prefs.in_app = false THEN
      RETURN NULL;
    END IF;
    IF prefs.types ? p_type THEN
      type_enabled := COALESCE((prefs.types ->> p_type)::boolean, true);
    END IF;
    IF type_enabled = false THEN
      RETURN NULL;
    END IF;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO new_id FROM public.notifications WHERE idempotency_key = p_idempotency_key;
    IF new_id IS NOT NULL THEN
      RETURN new_id;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.notifications (
      user_id, title, body, type, link, actor_id, entity_type, entity_id, idempotency_key
    ) VALUES (
      p_user_id, p_title, p_body, p_type, p_link, p_actor_id, p_entity_type, p_entity_id, p_idempotency_key
    )
    RETURNING id INTO new_id;
  EXCEPTION WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT id INTO new_id FROM public.notifications WHERE idempotency_key = p_idempotency_key;
    END IF;
    RETURN new_id;
  END;

  IF new_id IS NOT NULL THEN
    INSERT INTO public.notification_deliveries (notification_id, channel, status, error)
    VALUES (new_id, 'in_app', 'sent', NULL);
    IF COALESCE(prefs.email, false) THEN
      INSERT INTO public.notification_deliveries (notification_id, channel, status, error)
      VALUES (new_id, 'email', 'skipped', 'email_adapter_disabled');
    END IF;
  END IF;

  RETURN new_id;
END;
$$;

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
BEGIN
  RAISE EXCEPTION 'Direct notification create is disabled. Events emit from the server.';
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emit_event_notification(uuid, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.actor_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT full_name FROM public.user_profiles WHERE id = p_user_id),
    (SELECT full_name FROM public.member_directory WHERE profile_id = p_user_id LIMIT 1),
    'A member'
  );
$$;

-- ── Event triggers ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_network_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  actor uuid;
  actor_name text;
  parent_author uuid;
  original_author uuid;
  recipient uuid;
BEGIN
  IF TG_TABLE_NAME = 'social_post_likes' THEN
    SELECT author_id INTO target FROM public.social_posts WHERE id = NEW.post_id AND deleted_at IS NULL;
    actor := NEW.user_id;
    actor_name := public.actor_display_name(actor);
    PERFORM public.emit_event_notification(
      target,
      'New reaction',
      actor_name || ' reacted to your post.',
      'post_like',
      '/community#post-' || NEW.post_id::text,
      actor,
      'post',
      NEW.post_id::text,
      'like:' || NEW.post_id::text || ':' || actor::text
    );

  ELSIF TG_TABLE_NAME = 'social_post_comments' THEN
    SELECT author_id INTO target FROM public.social_posts WHERE id = NEW.post_id AND deleted_at IS NULL;
    actor := NEW.author_id;
    actor_name := public.actor_display_name(actor);
    PERFORM public.emit_event_notification(
      target,
      'New comment',
      actor_name || ' commented on your post.',
      'post_comment',
      '/community#post-' || NEW.post_id::text,
      actor,
      'comment',
      NEW.id::text,
      'comment:' || NEW.id::text
    );
    IF NEW.parent_comment_id IS NOT NULL THEN
      SELECT author_id INTO parent_author FROM public.social_post_comments WHERE id = NEW.parent_comment_id;
      IF parent_author IS NOT NULL AND parent_author IS DISTINCT FROM target THEN
        PERFORM public.emit_event_notification(
          parent_author,
          'New reply',
          actor_name || ' replied to your comment.',
          'comment_reply',
          '/community#post-' || NEW.post_id::text,
          actor,
          'comment',
          NEW.id::text,
          'comment_reply:' || NEW.id::text
        );
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'social_posts' THEN
    IF NEW.repost_of_id IS NOT NULL THEN
      SELECT author_id INTO original_author FROM public.social_posts WHERE id = NEW.repost_of_id;
      actor := NEW.author_id;
      actor_name := public.actor_display_name(actor);
      PERFORM public.emit_event_notification(
        original_author,
        'Repost',
        actor_name || ' reposted your post.',
        'repost',
        '/community#post-' || NEW.id::text,
        actor,
        'post',
        NEW.id::text,
        'repost:' || NEW.id::text
      );
    END IF;

  ELSIF TG_TABLE_NAME = 'member_follows' THEN
    actor := NEW.follower_id;
    actor_name := public.actor_display_name(actor);
    PERFORM public.emit_event_notification(
      NEW.following_id,
      'New follower',
      actor_name || ' started following you.',
      'follow',
      '/members/' || actor::text,
      actor,
      'member',
      actor::text,
      'follow:' || actor::text || ':' || NEW.following_id::text
    );

  ELSIF TG_TABLE_NAME = 'conversation_messages' THEN
    actor := NEW.sender_id;
    actor_name := public.actor_display_name(actor);
    FOR recipient IN
      SELECT m.user_id
      FROM public.conversation_members m
      WHERE m.conversation_id = NEW.conversation_id
        AND m.user_id <> NEW.sender_id
    LOOP
      PERFORM public.emit_event_notification(
        recipient,
        'New message',
        actor_name || ' sent you a message.',
        'message',
        '/messages?c=' || NEW.conversation_id::text,
        actor,
        'message',
        NEW.id::text,
        'message:' || NEW.id::text || ':' || recipient::text
      );
    END LOOP;

  ELSIF TG_TABLE_NAME = 'skill_endorsements' THEN
    actor := NEW.endorser_id;
    actor_name := public.actor_display_name(actor);
    PERFORM public.emit_event_notification(
      NEW.profile_id,
      'Skill endorsement',
      actor_name || ' endorsed you for ' || NEW.skill || '.',
      'endorsement',
      '/members/' || NEW.profile_id::text,
      actor,
      'member',
      NEW.profile_id::text,
      'endorse:' || actor::text || ':' || NEW.profile_id::text || ':' || NEW.skill
    );

  ELSIF TG_TABLE_NAME = 'member_recommendations' THEN
    actor := NEW.author_id;
    actor_name := public.actor_display_name(actor);
    PERFORM public.emit_event_notification(
      NEW.subject_id,
      'New recommendation',
      actor_name || ' wrote you a recommendation.',
      'recommendation',
      '/dashboard',
      actor,
      'member',
      NEW.subject_id::text,
      'recommendation:' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_like ON public.social_post_likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT ON public.social_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

DROP TRIGGER IF EXISTS trg_notify_comment ON public.social_post_comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON public.social_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

DROP TRIGGER IF EXISTS trg_notify_follow ON public.member_follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.member_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

DROP TRIGGER IF EXISTS trg_notify_endorse ON public.skill_endorsements;
CREATE TRIGGER trg_notify_endorse
  AFTER INSERT ON public.skill_endorsements
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

DROP TRIGGER IF EXISTS trg_notify_recommendation ON public.member_recommendations;
CREATE TRIGGER trg_notify_recommendation
  AFTER INSERT ON public.member_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

DROP TRIGGER IF EXISTS trg_notify_message ON public.conversation_messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

DROP TRIGGER IF EXISTS trg_notify_repost ON public.social_posts;
CREATE TRIGGER trg_notify_repost
  AFTER INSERT ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_network_event();

CREATE OR REPLACE FUNCTION public.notify_connection_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    actor_name := public.actor_display_name(NEW.requester_id);
    PERFORM public.emit_event_notification(
      NEW.addressee_id,
      'New connection request',
      actor_name || ' wants to connect with you.',
      'connection_request',
      '/dashboard/connections',
      NEW.requester_id,
      'connection',
      NEW.id::text,
      'connection:' || NEW.id::text || ':pending'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      actor_name := public.actor_display_name(NEW.addressee_id);
      PERFORM public.emit_event_notification(
        NEW.requester_id,
        'Connection accepted',
        actor_name || ' accepted your connection request.',
        'connection_accepted',
        '/members/' || NEW.addressee_id::text,
        NEW.addressee_id,
        'connection',
        NEW.id::text,
        'connection:' || NEW.id::text || ':accepted'
      );
    ELSIF NEW.status = 'declined' THEN
      actor_name := public.actor_display_name(NEW.addressee_id);
      PERFORM public.emit_event_notification(
        NEW.requester_id,
        'Connection declined',
        actor_name || ' declined your connection request.',
        'connection_declined',
        '/dashboard/connections',
        NEW.addressee_id,
        'connection',
        NEW.id::text,
        'connection:' || NEW.id::text || ':declined'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_reply_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  topic_author uuid;
  actor_name text;
BEGIN
  SELECT author_id INTO topic_author FROM public.forum_topics WHERE id = NEW.topic_id AND deleted_at IS NULL;
  actor_name := public.actor_display_name(NEW.author_id);
  PERFORM public.emit_event_notification(
    topic_author,
    'New forum reply',
    actor_name || ' replied in a topic you started.',
    'forum_reply',
    '/forum/t/' || NEW.topic_id::text,
    NEW.author_id,
    'forum_reply',
    NEW.id::text,
    'forum_reply:' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_forum_reply_app ON public.forum_replies;
CREATE TRIGGER trg_notify_forum_reply_app
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply_event();

CREATE OR REPLACE FUNCTION public.notify_job_application_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company uuid;
  actor_name text;
BEGIN
  SELECT company_id INTO company FROM public.job_listings WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  IF TG_OP = 'INSERT' THEN
    actor_name := public.actor_display_name(NEW.applicant_id);
    PERFORM public.emit_event_notification(
      company,
      'New job application',
      actor_name || ' applied to your job.',
      'job_application',
      '/company/dashboard',
      NEW.applicant_id,
      'job_application',
      NEW.id::text,
      'job_application:' || NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.emit_event_notification(
      NEW.applicant_id,
      'Application update',
      'Your application status is now ' || NEW.status || '.',
      'job_application_status',
      '/dashboard/applications',
      company,
      'job_application',
      NEW.id::text,
      'job_application_status:' || NEW.id::text || ':' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_job_application ON public.job_applications;
CREATE TRIGGER trg_notify_job_application
  AFTER INSERT OR UPDATE OF status ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_application_event();

CREATE OR REPLACE FUNCTION public.notify_consultation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    actor_name := public.actor_display_name(NEW.requester_id);
    PERFORM public.emit_event_notification(
      NEW.expert_id,
      'Consultation request',
      actor_name || ' requested a consultation.',
      'consultation_booking',
      '/consultations/experts/' || NEW.expert_id::text,
      NEW.requester_id,
      'consultation',
      NEW.id::text,
      'consultation:' || NEW.id::text || ':requested'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('accepted', 'declined', 'reschedule_requested', 'confirmed', 'cancelled') THEN
    actor_name := public.actor_display_name(NEW.expert_id);
    PERFORM public.emit_event_notification(
      NEW.requester_id,
      'Consultation update',
      actor_name || ' updated the consultation to ' || NEW.status || '.',
      'consultation_status',
      '/consultations/experts/' || NEW.expert_id::text,
      NEW.expert_id,
      'consultation',
      NEW.id::text,
      'consultation:' || NEW.id::text || ':' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_consultation_booking ON public.consultation_bookings;
CREATE TRIGGER trg_notify_consultation_booking
  AFTER INSERT OR UPDATE OF status ON public.consultation_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_consultation_event();

CREATE OR REPLACE FUNCTION public.notify_event_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organizer uuid;
  actor_name text;
  event_slug text;
BEGIN
  SELECT created_by, slug INTO organizer, event_slug FROM public.events WHERE id = NEW.event_id;
  actor_name := public.actor_display_name(NEW.user_id);
  PERFORM public.emit_event_notification(
    organizer,
    'Event registration',
    actor_name || ' registered for your event.',
    'event_registration',
    '/events/' || COALESCE(event_slug, NEW.event_id::text),
    NEW.user_id,
    'event',
    NEW.event_id::text,
    'event_reg:' || NEW.event_id::text || ':' || NEW.user_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_event_registration ON public.event_registrations;
CREATE TRIGGER trg_notify_event_registration
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_registration();

CREATE OR REPLACE FUNCTION public.notify_verification_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('approved', 'rejected', 'needs_more_information', 'more_information_required') THEN
    PERFORM public.emit_event_notification(
      NEW.user_id,
      'Verification update',
      CASE NEW.status
        WHEN 'approved' THEN 'Your verification request was approved.'
        WHEN 'rejected' THEN 'Your verification request was rejected.'
        ELSE 'Your verification request needs more information.'
      END,
      'verification_decision',
      '/verification',
      NEW.reviewer_id,
      'verification',
      NEW.id::text,
      'verification:' || NEW.id::text || ':' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_verification_decision ON public.verification_requests;
CREATE TRIGGER trg_notify_verification_decision
  AFTER UPDATE OF status ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_verification_decision();

CREATE OR REPLACE FUNCTION public.notify_mention_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  actor_name text;
  link text;
  entity text;
  entity_id text;
BEGIN
  IF TG_TABLE_NAME = 'post_mentions' THEN
    SELECT author_id INTO actor FROM public.social_posts WHERE id = NEW.post_id;
    link := '/community#post-' || NEW.post_id::text;
    entity := 'post';
    entity_id := NEW.post_id::text;
  ELSE
    SELECT c.author_id, c.post_id INTO actor, entity_id
    FROM public.social_post_comments c WHERE c.id = NEW.comment_id;
    link := '/community#post-' || entity_id;
    entity := 'comment';
    entity_id := NEW.comment_id::text;
  END IF;
  actor_name := public.actor_display_name(actor);
  PERFORM public.emit_event_notification(
    NEW.mentioned_user_id,
    'You were mentioned',
    actor_name || ' mentioned you.',
    'mention',
    link,
    actor,
    entity,
    entity_id,
    'mention:' || entity || ':' || entity_id || ':' || NEW.mentioned_user_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_mention ON public.post_mentions;
CREATE TRIGGER trg_notify_post_mention
  AFTER INSERT ON public.post_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mention_event();

DROP TRIGGER IF EXISTS trg_notify_comment_mention ON public.comment_mentions;
CREATE TRIGGER trg_notify_comment_mention
  AFTER INSERT ON public.comment_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mention_event();

CREATE OR REPLACE FUNCTION public.notify_moderation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  IF NEW.entity_type = 'post' THEN
    SELECT author_id INTO owner FROM public.social_posts WHERE id = NEW.entity_id::uuid;
  ELSIF NEW.entity_type = 'comment' THEN
    SELECT author_id INTO owner FROM public.social_post_comments WHERE id = NEW.entity_id::uuid;
  ELSIF NEW.entity_type = 'forum_topic' THEN
    SELECT author_id INTO owner FROM public.forum_topics WHERE id = NEW.entity_id::uuid;
  ELSIF NEW.entity_type = 'forum_reply' THEN
    SELECT author_id INTO owner FROM public.forum_replies WHERE id = NEW.entity_id::uuid;
  ELSIF NEW.entity_type = 'job' THEN
    SELECT company_id INTO owner FROM public.job_listings WHERE id = NEW.entity_id::uuid;
  END IF;

  PERFORM public.emit_event_notification(
    owner,
    'Moderation update',
    'A moderator reviewed your content (' || NEW.action || ').',
    'admin_action',
    '/notifications',
    NEW.actor_id,
    NEW.entity_type,
    NEW.entity_id,
    'moderation:' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_moderation_action ON public.moderation_actions;
CREATE TRIGGER trg_notify_moderation_action
  AFTER INSERT ON public.moderation_actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_moderation_event();

-- ── Recipient RPCs ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_my_notifications(p_limit int DEFAULT 20, p_before timestamptz DEFAULT NULL)
RETURNS SETOF public.notifications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.notifications
  WHERE user_id = (SELECT auth.uid())
    AND (p_before IS NULL OR created_at < p_before)
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

CREATE OR REPLACE FUNCTION public.unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.notifications
  WHERE user_id = (SELECT auth.uid()) AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_id AND user_id = (SELECT auth.uid());
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = (SELECT auth.uid()) AND is_read = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_notifications(int, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT SELECT ON public.comment_mentions, public.post_mentions TO authenticated, anon;
