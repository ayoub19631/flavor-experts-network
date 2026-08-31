-- Professional network suite: messages, follows, reactions, saves, endorsements,
-- recommendations, profile views, nested comments, reposts, engagement notifications.

CREATE OR REPLACE FUNCTION public.are_accepted_connections(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.member_connections c
    WHERE c.status = 'accepted'
      AND (
        (c.requester_id = a AND c.addressee_id = b)
        OR (c.requester_id = b AND c.addressee_id = a)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.are_accepted_connections(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_accepted_connections(uuid, uuid) TO authenticated;

-- ── Feed columns ─────────────────────────────────────────────────────────────
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS repost_of_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL;

ALTER TABLE public.social_post_likes
  ADD COLUMN IF NOT EXISTS reaction text NOT NULL DEFAULT 'like'
    CHECK (reaction IN ('like', 'celebrate', 'support', 'insightful', 'curious'));

ALTER TABLE public.social_post_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.social_post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS social_posts_repost_idx ON public.social_posts(repost_of_id);
CREATE INDEX IF NOT EXISTS social_comments_parent_idx ON public.social_post_comments(parent_comment_id);

DROP POLICY IF EXISTS social_likes_update ON public.social_post_likes;
CREATE POLICY social_likes_update ON public.social_post_likes
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ── Saved posts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_post_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.social_post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_saves_own ON public.social_post_saves;
CREATE POLICY social_saves_own ON public.social_post_saves
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ── Follows ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS member_follows_following_idx ON public.member_follows(following_id);

ALTER TABLE public.member_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_follows_read ON public.member_follows;
CREATE POLICY member_follows_read ON public.member_follows
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS member_follows_insert ON public.member_follows;
CREATE POLICY member_follows_insert ON public.member_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = (select auth.uid()));

DROP POLICY IF EXISTS member_follows_delete ON public.member_follows;
CREATE POLICY member_follows_delete ON public.member_follows
  FOR DELETE TO authenticated
  USING (follower_id = (select auth.uid()));

-- ── Endorsements ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_endorsements (
  endorser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (endorser_id, profile_id, skill),
  CHECK (endorser_id <> profile_id),
  CHECK (char_length(skill) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS skill_endorsements_profile_idx ON public.skill_endorsements(profile_id);

ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_endorsements_read ON public.skill_endorsements;
CREATE POLICY skill_endorsements_read ON public.skill_endorsements
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS skill_endorsements_insert ON public.skill_endorsements;
CREATE POLICY skill_endorsements_insert ON public.skill_endorsements
  FOR INSERT TO authenticated
  WITH CHECK (endorser_id = (select auth.uid()));

DROP POLICY IF EXISTS skill_endorsements_delete ON public.skill_endorsements;
CREATE POLICY skill_endorsements_delete ON public.skill_endorsements
  FOR DELETE TO authenticated
  USING (endorser_id = (select auth.uid()) OR profile_id = (select auth.uid()));

-- ── Recommendations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'colleague',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (author_id <> subject_id),
  CHECK (char_length(body) BETWEEN 20 AND 2000)
);

CREATE INDEX IF NOT EXISTS member_recommendations_subject_idx
  ON public.member_recommendations(subject_id, status);

ALTER TABLE public.member_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_recommendations_read ON public.member_recommendations;
CREATE POLICY member_recommendations_read ON public.member_recommendations
  FOR SELECT TO authenticated
  USING (
    status = 'accepted'
    OR author_id = (select auth.uid())
    OR subject_id = (select auth.uid())
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS member_recommendations_insert ON public.member_recommendations;
CREATE POLICY member_recommendations_insert ON public.member_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (select auth.uid())
    AND public.are_accepted_connections(author_id, subject_id)
  );

DROP POLICY IF EXISTS member_recommendations_update ON public.member_recommendations;
CREATE POLICY member_recommendations_update ON public.member_recommendations
  FOR UPDATE TO authenticated
  USING (subject_id = (select auth.uid()) OR author_id = (select auth.uid()))
  WITH CHECK (subject_id = (select auth.uid()) OR author_id = (select auth.uid()));

-- ── Profile views ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (viewer_id IS NULL OR viewer_id <> viewed_profile_id)
);

CREATE INDEX IF NOT EXISTS profile_views_viewed_idx
  ON public.profile_views(viewed_profile_id, viewed_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_views_insert ON public.profile_views;
CREATE POLICY profile_views_insert ON public.profile_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

DROP POLICY IF EXISTS profile_views_read ON public.profile_views;
CREATE POLICY profile_views_read ON public.profile_views
  FOR SELECT TO authenticated
  USING (viewed_profile_id = (select auth.uid()) OR public.is_platform_admin());

-- ── Messaging ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS conversation_messages_conv_idx
  ON public.conversation_messages(conversation_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_member_read ON public.conversations;
CREATE POLICY conversations_member_read ON public.conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members m
      WHERE m.conversation_id = id AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS conversation_members_read ON public.conversation_members;
CREATE POLICY conversation_members_read ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.conversation_members m
      WHERE m.conversation_id = conversation_members.conversation_id
        AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS conversation_members_update ON public.conversation_members;
CREATE POLICY conversation_members_update ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS conversation_messages_read ON public.conversation_messages;
CREATE POLICY conversation_messages_read ON public.conversation_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members m
      WHERE m.conversation_id = conversation_messages.conversation_id
        AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS conversation_messages_insert ON public.conversation_messages;
CREATE POLICY conversation_messages_insert ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversation_members m
      WHERE m.conversation_id = conversation_messages.conversation_id
        AND m.user_id = (select auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.start_conversation(p_other uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv uuid;
BEGIN
  IF me IS NULL OR p_other IS NULL OR me = p_other THEN
    RAISE EXCEPTION 'invalid conversation';
  END IF;
  IF NOT public.are_accepted_connections(me, p_other) THEN
    RAISE EXCEPTION 'connect first to message';
  END IF;

  SELECT c.id INTO conv
  FROM public.conversations c
  JOIN public.conversation_members a
    ON a.conversation_id = c.id AND a.user_id = me
  JOIN public.conversation_members b
    ON b.conversation_id = c.id AND b.user_id = p_other
  LIMIT 1;

  IF conv IS NOT NULL THEN
    RETURN conv;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conv;
  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (conv, me), (conv, p_other);
  RETURN conv;
END;
$$;

REVOKE ALL ON FUNCTION public.start_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid) TO authenticated;

-- ── Notifications ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_network_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  target uuid;
  title text;
  body text;
  ntype text;
  link text;
BEGIN
  IF TG_TABLE_NAME = 'social_post_likes' THEN
    SELECT author_id INTO target FROM public.social_posts WHERE id = NEW.post_id;
    IF target IS NULL OR target = NEW.user_id THEN
      RETURN NEW;
    END IF;
    SELECT coalesce(full_name, 'A member') INTO actor_name FROM public.user_profiles WHERE id = NEW.user_id;
    title := 'New reaction';
    body := actor_name || ' reacted to your post.';
    ntype := 'reaction';
    link := '/community#post-' || NEW.post_id::text;
  ELSIF TG_TABLE_NAME = 'social_post_comments' THEN
    SELECT author_id INTO target FROM public.social_posts WHERE id = NEW.post_id;
    IF target IS NULL OR target = NEW.author_id THEN
      RETURN NEW;
    END IF;
    SELECT coalesce(full_name, 'A member') INTO actor_name FROM public.user_profiles WHERE id = NEW.author_id;
    title := 'New comment';
    body := actor_name || ' commented on your post.';
    ntype := 'comment';
    link := '/community#post-' || NEW.post_id::text;
  ELSIF TG_TABLE_NAME = 'member_follows' THEN
    target := NEW.following_id;
    SELECT coalesce(full_name, 'A member') INTO actor_name FROM public.user_profiles WHERE id = NEW.follower_id;
    title := 'New follower';
    body := actor_name || ' started following you.';
    ntype := 'follow';
    link := '/members';
  ELSIF TG_TABLE_NAME = 'skill_endorsements' THEN
    target := NEW.profile_id;
    SELECT coalesce(full_name, 'A member') INTO actor_name FROM public.user_profiles WHERE id = NEW.endorser_id;
    title := 'Skill endorsement';
    body := actor_name || ' endorsed you for ' || NEW.skill || '.';
    ntype := 'endorsement';
    link := '/dashboard';
  ELSIF TG_TABLE_NAME = 'member_recommendations' THEN
    target := NEW.subject_id;
    SELECT coalesce(full_name, 'A member') INTO actor_name FROM public.user_profiles WHERE id = NEW.author_id;
    title := 'New recommendation';
    body := actor_name || ' wrote you a recommendation.';
    ntype := 'recommendation';
    link := '/dashboard';
  ELSIF TG_TABLE_NAME = 'conversation_messages' THEN
    SELECT m.user_id INTO target
    FROM public.conversation_members m
    WHERE m.conversation_id = NEW.conversation_id
      AND m.user_id <> NEW.sender_id
    LIMIT 1;
    IF target IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT coalesce(full_name, 'A member') INTO actor_name FROM public.user_profiles WHERE id = NEW.sender_id;
    title := 'New message';
    body := actor_name || ' sent you a message.';
    ntype := 'message';
    link := '/messages';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (target, title, body, ntype, link);
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

CREATE OR REPLACE FUNCTION public.touch_conversation_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation ON public.conversation_messages;
CREATE TRIGGER trg_touch_conversation
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated();
