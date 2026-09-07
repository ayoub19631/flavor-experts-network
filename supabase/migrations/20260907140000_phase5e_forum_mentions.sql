-- Phase 5E — forum topic/reply mentions (corrective; do not edit 5A–5D).
-- Local/staging only. No DROP TABLE. No production data copy.

CREATE TABLE IF NOT EXISTS public.forum_topic_mentions (
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS public.forum_reply_mentions (
  reply_id uuid NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (reply_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS forum_topic_mentions_user_idx
  ON public.forum_topic_mentions (mentioned_user_id);
CREATE INDEX IF NOT EXISTS forum_reply_mentions_user_idx
  ON public.forum_reply_mentions (mentioned_user_id);

ALTER TABLE public.forum_topic_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reply_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_topic_mentions_read ON public.forum_topic_mentions;
CREATE POLICY forum_topic_mentions_read ON public.forum_topic_mentions
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS forum_reply_mentions_read ON public.forum_reply_mentions;
CREATE POLICY forum_reply_mentions_read ON public.forum_reply_mentions
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS forum_topic_mentions_write ON public.forum_topic_mentions;
CREATE POLICY forum_topic_mentions_write ON public.forum_topic_mentions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_reply_mentions_write ON public.forum_reply_mentions;
CREATE POLICY forum_reply_mentions_write ON public.forum_reply_mentions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

GRANT SELECT ON public.forum_topic_mentions, public.forum_reply_mentions TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_content_mentions(
  p_entity_type text,
  p_entity_id uuid,
  p_profile_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  mentioned uuid;
  saved int := 0;
  owns boolean := false;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF p_entity_type NOT IN ('post', 'comment', 'forum_topic', 'forum_reply') THEN
    RAISE EXCEPTION 'Mentions are only supported on posts, comments, and forum content.';
  END IF;

  IF p_entity_type = 'post' THEN
    SELECT author_id = me INTO owns FROM public.social_posts WHERE id = p_entity_id AND deleted_at IS NULL;
  ELSIF p_entity_type = 'comment' THEN
    SELECT author_id = me INTO owns FROM public.social_post_comments WHERE id = p_entity_id AND deleted_at IS NULL;
  ELSIF p_entity_type = 'forum_topic' THEN
    SELECT author_id = me INTO owns FROM public.forum_topics WHERE id = p_entity_id AND deleted_at IS NULL;
  ELSE
    SELECT author_id = me INTO owns FROM public.forum_replies WHERE id = p_entity_id AND deleted_at IS NULL;
  END IF;
  IF owns IS NOT TRUE THEN
    RAISE EXCEPTION 'You can only mention people on your own content.';
  END IF;

  FOREACH mentioned IN ARRAY coalesce(p_profile_ids, ARRAY[]::uuid[])
  LOOP
    IF mentioned IS NULL OR mentioned = me THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.member_directory d
      WHERE d.profile_id = mentioned
    ) THEN
      CONTINUE;
    END IF;
    IF public.is_blocked_pair(me, mentioned) THEN
      CONTINUE;
    END IF;

    IF p_entity_type = 'post' THEN
      INSERT INTO public.post_mentions (post_id, mentioned_user_id)
      VALUES (p_entity_id, mentioned)
      ON CONFLICT DO NOTHING;
    ELSIF p_entity_type = 'comment' THEN
      INSERT INTO public.comment_mentions (comment_id, mentioned_user_id)
      VALUES (p_entity_id, mentioned)
      ON CONFLICT DO NOTHING;
    ELSIF p_entity_type = 'forum_topic' THEN
      INSERT INTO public.forum_topic_mentions (topic_id, mentioned_user_id)
      VALUES (p_entity_id, mentioned)
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.forum_reply_mentions (reply_id, mentioned_user_id)
      VALUES (p_entity_id, mentioned)
      ON CONFLICT DO NOTHING;
    END IF;
    saved := saved + 1;
  END LOOP;

  RETURN saved;
END;
$$;

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
  ELSIF TG_TABLE_NAME = 'comment_mentions' THEN
    SELECT c.author_id, c.post_id INTO actor, entity_id
    FROM public.social_post_comments c WHERE c.id = NEW.comment_id;
    link := '/community#post-' || entity_id;
    entity := 'comment';
    entity_id := NEW.comment_id::text;
  ELSIF TG_TABLE_NAME = 'forum_topic_mentions' THEN
    SELECT author_id INTO actor FROM public.forum_topics WHERE id = NEW.topic_id;
    link := '/forum/t/' || NEW.topic_id::text;
    entity := 'forum_topic';
    entity_id := NEW.topic_id::text;
  ELSE
    SELECT r.author_id, r.topic_id INTO actor, entity_id
    FROM public.forum_replies r WHERE r.id = NEW.reply_id;
    link := '/forum/t/' || entity_id;
    entity := 'forum_reply';
    entity_id := NEW.reply_id::text;
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

DROP TRIGGER IF EXISTS trg_notify_forum_topic_mention ON public.forum_topic_mentions;
CREATE TRIGGER trg_notify_forum_topic_mention
  AFTER INSERT ON public.forum_topic_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mention_event();

DROP TRIGGER IF EXISTS trg_notify_forum_reply_mention ON public.forum_reply_mentions;
CREATE TRIGGER trg_notify_forum_reply_mention
  AFTER INSERT ON public.forum_reply_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_mention_event();

CREATE OR REPLACE FUNCTION public.phase5_workflows_ready()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    to_regclass('public.comment_mentions') IS NOT NULL
    AND to_regclass('public.forum_topic_mentions') IS NOT NULL
    AND to_regclass('public.forum_reply_mentions') IS NOT NULL
    AND to_regprocedure('public.emit_event_notification(uuid,text,text,text,text,uuid,text,text,text)') IS NOT NULL
    AND to_regprocedure('public.review_verification_request(uuid,text,text)') IS NOT NULL
    AND to_regprocedure('public.apply_moderation_action(uuid,text,text,text,text)') IS NOT NULL
    AND to_regprocedure('public.save_content_mentions(text,uuid,uuid[])') IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.save_content_mentions(text, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase5_workflows_ready() TO anon, authenticated;
