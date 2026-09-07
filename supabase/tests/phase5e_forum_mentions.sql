-- Phase 5E forum mention schema contracts.
-- Run only against Staging or local. Abort if the target ref is production.

DO $$
BEGIN
  IF to_regclass('public.forum_topic_mentions') IS NULL
     OR to_regclass('public.forum_reply_mentions') IS NULL THEN
    RAISE EXCEPTION 'forum mention tables missing';
  END IF;
  IF to_regprocedure('public.save_content_mentions(text,uuid,uuid[])') IS NULL THEN
    RAISE EXCEPTION 'save_content_mentions missing';
  END IF;
  IF NOT public.phase5_workflows_ready() THEN
    RAISE EXCEPTION 'phase5_workflows_ready is false';
  END IF;
END
$$;

SELECT 'phase5e_forum_mentions_schema_ok' AS result;
