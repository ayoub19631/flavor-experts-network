-- Phase 5D — mention search, validated mention writes, extra RLS coverage
-- Local/staging only. No DROP TABLE.

CREATE OR REPLACE FUNCTION public.search_member_mentions(p_query text, p_limit int DEFAULT 6)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  title text,
  company text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  q text := trim(coalesce(p_query, ''));
BEGIN
  IF me IS NULL OR length(q) < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.profile_id,
    d.full_name,
    d.title,
    d.company
  FROM public.member_directory d
  WHERE d.profile_id IS NOT NULL
    AND d.profile_id <> me
    AND (
      d.full_name ILIKE '%' || q || '%'
      OR coalesce(d.company, '') ILIKE '%' || q || '%'
      OR coalesce(d.title, '') ILIKE '%' || q || '%'
    )
    AND NOT public.is_blocked_pair(me, d.profile_id)
  ORDER BY
    CASE WHEN d.full_name ILIKE q || '%' THEN 0 ELSE 1 END,
    d.full_name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 8);
END;
$$;

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
  IF p_entity_type NOT IN ('post', 'comment') THEN
    RAISE EXCEPTION 'Mentions are only supported on posts and comments.';
  END IF;

  IF p_entity_type = 'post' THEN
    SELECT author_id = me INTO owns FROM public.social_posts WHERE id = p_entity_id;
  ELSE
    SELECT author_id = me INTO owns FROM public.social_post_comments WHERE id = p_entity_id;
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
    ELSE
      INSERT INTO public.comment_mentions (comment_id, mentioned_user_id)
      VALUES (p_entity_id, mentioned)
      ON CONFLICT DO NOTHING;
    END IF;
    saved := saved + 1;
  END LOOP;

  RETURN saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase5_workflows_ready()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    to_regclass('public.comment_mentions') IS NOT NULL
    AND to_regprocedure('public.emit_event_notification(uuid,text,text,text,text,uuid,text,text,text)') IS NOT NULL
    AND to_regprocedure('public.review_verification_request(uuid,text,text)') IS NOT NULL
    AND to_regprocedure('public.apply_moderation_action(uuid,text,text,text,text)') IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.search_member_mentions(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_content_mentions(text, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase5_workflows_ready() TO anon, authenticated;
