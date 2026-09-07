-- Phase 7D — rule-based discovery. No embeddings. Public rows only.
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.discover_feed(
  p_section text,
  p_limit int DEFAULT 6
) RETURNS TABLE (
  entity_type text,
  entity_id text,
  title text,
  subtitle text,
  href text,
  reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  lim int := LEAST(GREATEST(coalesce(p_limit, 6), 1), 12);
  section text := lower(btrim(coalesce(p_section, '')));
BEGIN
  IF section = 'experts' THEN
    RETURN QUERY
    SELECT
      'people'::text,
      coalesce(d.profile_id, d.id)::text,
      d.full_name,
      nullif(concat_ws(' · ', d.title, d.company), ''),
      '/members/' || coalesce(d.profile_id, d.id)::text,
      CASE
        WHEN d.is_featured THEN 'featured'
        WHEN d.is_verified THEN 'verified'
        WHEN coalesce(cardinality(d.skills), 0) > 0 THEN 'complete_profile'
        ELSE 'recent'
      END,
      coalesce(d.joined_at, now())
    FROM public.member_directory d
    WHERE coalesce(d.member_type, 'individual') IS DISTINCT FROM 'company'
      AND NOT public.search_viewer_hidden_author(coalesce(d.profile_id, d.id))
      AND (
        d.is_featured
        OR d.is_verified
        OR length(coalesce(d.bio, '')) > 40
        OR coalesce(cardinality(d.skills), 0) > 0
      )
    ORDER BY d.is_featured DESC, d.is_verified DESC, coalesce(cardinality(d.skills), 0) DESC, d.joined_at DESC NULLS LAST
    LIMIT lim;
    RETURN;
  END IF;

  IF section = 'companies' THEN
    RETURN QUERY
    SELECT
      'companies'::text,
      coalesce(d.profile_id, d.id)::text,
      coalesce(nullif(d.company, ''), d.full_name),
      d.location,
      '/companies/' || replace(lower(trim(coalesce(nullif(d.company, ''), d.full_name))), ' ', '%20'),
      CASE WHEN d.is_verified THEN 'verified' ELSE 'company_account' END,
      coalesce(d.joined_at, now())
    FROM public.member_directory d
    WHERE d.member_type = 'company'
      AND NOT public.search_viewer_hidden_author(coalesce(d.profile_id, d.id))
    ORDER BY d.is_featured DESC, d.is_verified DESC, d.joined_at DESC NULLS LAST
    LIMIT lim;
    RETURN;
  END IF;

  IF section = 'publications' THEN
    RETURN QUERY
    SELECT
      CASE WHEN pub.type = 'book' THEN 'books' ELSE 'research' END,
      pub.id::text,
      pub.title,
      pub.primary_language,
      '/publications/' || pub.slug,
      CASE WHEN pub.is_featured THEN 'featured' ELSE 'recent_public' END,
      coalesce(pub.published_at, pub.created_at, now())
    FROM public.publications pub
    WHERE pub.status IN ('published', 'corrected')
      AND pub.visibility = 'public'
    ORDER BY
      pub.is_featured DESC,
      coalesce(pub.published_at, pub.created_at) DESC,
      LEAST(coalesce(pub.view_count, 0), 80) DESC
    LIMIT lim;
    RETURN;
  END IF;

  IF section = 'discussions' THEN
    RETURN QUERY
    SELECT
      'forum'::text,
      t.id::text,
      t.title,
      NULL::text,
      '/forum/t/' || t.id::text,
      'active_thread',
      coalesce(t.last_reply_at, t.created_at)
    FROM public.forum_topics t
    WHERE t.deleted_at IS NULL
      AND NOT public.search_viewer_hidden_author(t.author_id)
    ORDER BY coalesce(t.last_reply_at, t.created_at) DESC, coalesce(t.reply_count, 0) DESC
    LIMIT lim;
    RETURN;
  END IF;

  IF section = 'jobs' THEN
    RETURN QUERY
    SELECT
      'jobs'::text,
      j.id::text,
      j.title,
      nullif(concat_ws(' · ', j.company_name, j.location), ''),
      '/jobs/' || coalesce(j.slug, j.id::text),
      'open_role',
      coalesce(j.published_at, j.created_at, now())
    FROM public.job_listings j
    WHERE j.deleted_at IS NULL
      AND j.is_published
      AND j.status IN ('open', 'published')
    ORDER BY coalesce(j.published_at, j.created_at) DESC
    LIMIT lim;
    RETURN;
  END IF;
END;
$$;
