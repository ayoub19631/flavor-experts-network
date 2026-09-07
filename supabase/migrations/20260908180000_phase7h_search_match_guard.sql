-- Phase 7H — gate loose trigram matches on short queries and honor block/mute on publications/events.
-- Corrective after 20260908170000. Replaces global_search only. No user-data changes. No hard deletes.
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.search_term_matches(
  p_nq text,
  p_haystack text,
  p_vector tsvector,
  p_q tsquery,
  p_trgm_min real DEFAULT 0.28
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT
    (p_vector IS NOT NULL AND p_q IS NOT NULL AND p_vector @@ p_q)
    OR coalesce(p_haystack, '') LIKE '%' || coalesce(p_nq, '') || '%'
    OR (
      char_length(coalesce(p_nq, '')) BETWEEN 2 AND 18
      AND similarity(coalesce(p_haystack, ''), p_nq) > coalesce(p_trgm_min, 0.28)
    );
$$;

REVOKE ALL ON FUNCTION public.search_term_matches(text, text, tsvector, tsquery, real) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_term_matches(text, text, tsvector, tsquery, real) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.global_search(
  p_query text,
  p_types text[] DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_sort text DEFAULT 'relevance',
  p_country text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_specialty text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_cursor_rank real DEFAULT NULL,
  p_cursor_created timestamptz DEFAULT NULL,
  p_cursor_type text DEFAULT NULL,
  p_cursor_id text DEFAULT NULL
) RETURNS TABLE (
  entity_type text,
  entity_id text,
  title text,
  subtitle text,
  href text,
  rank real,
  created_at timestamptz,
  snippet text,
  is_verified boolean,
  has_more boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  nq text;
  raw_q text;
  q tsquery;
  want text[];
  lim int;
  newest boolean;
BEGIN
  raw_q := btrim(coalesce(p_query, ''));
  IF char_length(raw_q) < 2 OR char_length(raw_q) > 200 THEN
    RETURN;
  END IF;
  IF public.search_query_is_sensitive(raw_q) THEN
    RETURN;
  END IF;

  nq := public.normalize_search_text(raw_q);
  q := public.search_parse_tsquery(raw_q);
  lim := LEAST(GREATEST(coalesce(p_limit, 20), 1), 40);
  newest := lower(coalesce(p_sort, 'relevance')) = 'newest';

  SELECT coalesce(array_agg(DISTINCT mapped), '{}')
  INTO want
  FROM (
    SELECT CASE lower(t)
      WHEN 'people' THEN 'people'
      WHEN 'member' THEN 'people'
      WHEN 'companies' THEN 'companies'
      WHEN 'company' THEN 'companies'
      WHEN 'suppliers' THEN 'suppliers'
      WHEN 'supplier' THEN 'suppliers'
      WHEN 'raw_materials' THEN 'raw_materials'
      WHEN 'raw_material' THEN 'raw_materials'
      WHEN 'jobs' THEN 'jobs'
      WHEN 'job' THEN 'jobs'
      WHEN 'publications' THEN 'publications'
      WHEN 'publication' THEN 'publications'
      WHEN 'books' THEN 'books'
      WHEN 'book' THEN 'books'
      WHEN 'research' THEN 'research'
      WHEN 'posts' THEN 'posts'
      WHEN 'post' THEN 'posts'
      WHEN 'forum' THEN 'forum'
      WHEN 'events' THEN 'events'
      WHEN 'event' THEN 'events'
      ELSE NULL
    END AS mapped
    FROM unnest(coalesce(p_types, ARRAY[]::text[])) AS t
  ) s
  WHERE mapped IS NOT NULL;

  RETURN QUERY
  WITH hits AS (
    SELECT * FROM (
      SELECT
        'people'::text AS entity_type,
        coalesce(d.profile_id, d.id)::text AS entity_id,
        d.full_name AS title,
        nullif(concat_ws(' · ', d.title, d.company), '') AS subtitle,
        '/members/' || coalesce(d.profile_id, d.id)::text AS href,
        public.search_rank(
          nq,
          public.normalize_search_text(d.full_name),
          coalesce(d.search_norm, ''),
          ts_rank_cd(dd.search_vector, q),
          similarity(coalesce(d.search_norm, ''), nq),
          coalesce(d.is_verified, false) OR coalesce(d.is_featured, false),
          LEAST(
            (CASE WHEN length(coalesce(d.bio, '')) > 40 THEN 0.3 ELSE 0 END)
            + (CASE WHEN coalesce(cardinality(d.skills), 0) > 0 THEN 0.3 ELSE 0 END)
            + (CASE WHEN d.title IS NOT NULL THEN 0.2 ELSE 0 END)
            + (CASE WHEN coalesce(d.years_experience, 0) > 0 THEN 0.2 ELSE 0 END),
            1
          ),
          LEAST(EXTRACT(EPOCH FROM (now() - coalesce(d.joined_at, now() - interval '400 days'))) / 86400.0 / 400.0, 1)::real
        ) AS rank,
        coalesce(d.joined_at, now()) AS created_at,
        left(coalesce(d.bio, d.specialty, ''), 160) AS snippet,
        coalesce(d.is_verified, false) AS is_verified
      FROM public.member_directory d
      JOIN public.member_directory_data dd ON dd.id = d.id
      WHERE (cardinality(want) = 0 OR 'people' = ANY (want))
        AND coalesce(d.member_type, 'individual') IS DISTINCT FROM 'company'
        AND NOT public.search_viewer_hidden_author(coalesce(d.profile_id, d.id))
        AND public.search_term_matches(nq, coalesce(d.search_norm, ''), dd.search_vector, q, 0.28)
        AND (p_country IS NULL OR coalesce(d.location, '') ILIKE '%' || p_country || '%')
        AND (p_specialty IS NULL OR coalesce(d.specialty, '') ILIKE '%' || p_specialty || '%' OR nq = public.normalize_search_text(p_specialty))
        AND (p_date_from IS NULL OR d.joined_at >= p_date_from)
        AND (p_date_to IS NULL OR d.joined_at <= p_date_to)

      UNION ALL

      SELECT
        'companies',
        coalesce(d.profile_id, d.id)::text,
        coalesce(nullif(d.company, ''), d.full_name),
        nullif(concat_ws(' · ', d.location, d.role), ''),
        '/companies/' || replace(lower(trim(coalesce(nullif(d.company, ''), d.full_name))), ' ', '%20'),
        public.search_rank(
          nq,
          public.normalize_search_text(coalesce(nullif(d.company, ''), d.full_name)),
          coalesce(d.search_norm, ''),
          ts_rank_cd(dd.search_vector, q),
          similarity(coalesce(d.search_norm, ''), nq),
          coalesce(d.is_verified, false) OR coalesce(d.is_featured, false),
          LEAST((CASE WHEN d.website IS NOT NULL THEN 0.5 ELSE 0 END) + (CASE WHEN d.location IS NOT NULL THEN 0.5 ELSE 0 END), 1),
          0.2
        ),
        coalesce(d.joined_at, now()),
        left(coalesce(d.bio, ''), 160),
        coalesce(d.is_verified, false)
      FROM public.member_directory d
      JOIN public.member_directory_data dd ON dd.id = d.id
      WHERE (cardinality(want) = 0 OR 'companies' = ANY (want))
        AND d.member_type = 'company'
        AND NOT public.search_viewer_hidden_author(coalesce(d.profile_id, d.id))
        AND public.search_term_matches(nq, coalesce(d.search_norm, ''), dd.search_vector, q, 0.28)
        AND (p_country IS NULL OR coalesce(d.location, '') ILIKE '%' || p_country || '%')
        AND (p_specialty IS NULL OR coalesce(d.specialty, '') ILIKE '%' || p_specialty || '%')

      UNION ALL

      SELECT
        'suppliers',
        s.id::text,
        s.name,
        s.reliability,
        '/market',
        public.search_rank(
          nq,
          public.normalize_search_text(s.name),
          public.normalize_search_text(s.name),
          0,
          similarity(public.normalize_search_text(s.name), nq),
          false,
          0.3,
          0.1
        ),
        now(),
        left(coalesce(s.url, ''), 160),
        false
      FROM public.market_sources s
      WHERE (cardinality(want) = 0 OR 'suppliers' = ANY (want))
        AND public.search_term_matches(nq, public.normalize_search_text(s.name), NULL, q, 0.3)

      UNION ALL

      SELECT
        'raw_materials',
        m.id::text,
        m.name,
        m.category,
        '/market#' || m.slug,
        public.search_rank(
          nq,
          public.normalize_search_text(m.name),
          coalesce(m.search_norm, ''),
          ts_rank_cd(m.search_vector, q),
          similarity(coalesce(m.search_norm, ''), nq),
          false,
          0.4,
          0.1
        ),
        now(),
        left(coalesce(m.category, m.unit, ''), 160),
        false
      FROM public.market_materials m
      WHERE (cardinality(want) = 0 OR 'raw_materials' = ANY (want))
        AND public.search_term_matches(nq, coalesce(m.search_norm, ''), m.search_vector, q, 0.28)
        AND (p_category IS NULL OR coalesce(m.category, '') ILIKE '%' || p_category || '%')

      UNION ALL

      SELECT
        'jobs',
        j.id::text,
        j.title,
        nullif(concat_ws(' · ', j.company_name, j.location), ''),
        '/jobs/' || coalesce(j.slug, j.id::text),
        public.search_rank(
          nq,
          public.normalize_search_text(j.title),
          public.normalize_search_text(concat_ws(' ', j.title, j.company_name, j.location)),
          ts_rank_cd(j.search_vector, q),
          similarity(public.normalize_search_text(j.title), nq),
          false,
          0.4,
          LEAST(EXTRACT(EPOCH FROM (now() - coalesce(j.published_at, j.created_at))) / 86400.0 / 180.0, 1)::real
        ),
        coalesce(j.published_at, j.created_at, now()),
        left(coalesce(j.location, ''), 160),
        false
      FROM public.job_listings j
      WHERE (cardinality(want) = 0 OR 'jobs' = ANY (want))
        AND j.deleted_at IS NULL
        AND j.is_published
        AND j.status IN ('open', 'published')
        AND (
          public.search_term_matches(nq, public.normalize_search_text(j.title), j.search_vector, q, 0.28)
          OR public.normalize_search_text(coalesce(j.company_name, '')) LIKE '%' || nq || '%'
        )
        AND (p_country IS NULL OR coalesce(j.country, j.location, '') ILIKE '%' || p_country || '%')
        AND (p_date_from IS NULL OR coalesce(j.published_at, j.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR coalesce(j.published_at, j.created_at) <= p_date_to)

      UNION ALL

      SELECT
        CASE WHEN pub.type = 'book' THEN 'books' ELSE 'research' END,
        pub.id::text,
        pub.title,
        pub.primary_language,
        '/publications/' || pub.slug,
        public.search_rank(
          nq,
          public.normalize_search_text(pub.title),
          public.normalize_search_text(concat_ws(' ', pub.title, pub.subtitle, pub.abstract, array_to_string(pub.keywords, ' '))),
          ts_rank_cd(pub.search_vector, q),
          similarity(public.normalize_search_text(pub.title), nq),
          coalesce(pub.is_featured, false),
          LEAST((CASE WHEN pub.abstract IS NOT NULL THEN 0.5 ELSE 0 END) + (CASE WHEN coalesce(cardinality(pub.keywords), 0) > 0 THEN 0.5 ELSE 0 END), 1),
          LEAST(ln(1 + LEAST(coalesce(pub.view_count, 0), 200)) / ln(201), 1)::real * 0.5
            + LEAST(EXTRACT(EPOCH FROM (now() - coalesce(pub.published_at, pub.created_at))) / 86400.0 / 365.0, 1)::real * 0.5
        ),
        coalesce(pub.published_at, pub.created_at, now()),
        left(coalesce(pub.abstract, ''), 160),
        coalesce(pub.is_featured, false)
      FROM public.publications pub
      WHERE (
          cardinality(want) = 0
          OR 'publications' = ANY (want)
          OR (pub.type = 'book' AND 'books' = ANY (want))
          OR (pub.type IS DISTINCT FROM 'book' AND 'research' = ANY (want))
        )
        AND pub.status IN ('published', 'corrected', 'retracted')
        AND pub.visibility = 'public'
        AND NOT public.search_viewer_hidden_author(pub.created_by)
        AND (
          public.search_term_matches(nq, public.normalize_search_text(pub.title), pub.search_vector, q, 0.28)
          OR EXISTS (
            SELECT 1 FROM public.publication_authors a
            WHERE a.publication_id = pub.id
              AND public.normalize_search_text(a.full_name) LIKE '%' || nq || '%'
          )
        )
        AND (p_language IS NULL OR pub.primary_language = p_language)
        AND (p_category IS NULL OR coalesce(pub.application_area, '') ILIKE '%' || p_category || '%' OR p_category = ANY (coalesce(pub.keywords, ARRAY[]::text[])))
        AND (p_date_from IS NULL OR coalesce(pub.published_at, pub.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR coalesce(pub.published_at, pub.created_at) <= p_date_to)

      UNION ALL

      SELECT
        'posts',
        p.id::text,
        left(p.body, 80),
        NULL,
        '/community#post-' || p.id::text,
        public.search_rank(
          nq,
          public.normalize_search_text(left(p.body, 80)),
          public.normalize_search_text(p.body),
          ts_rank_cd(p.search_vector, q),
          similarity(public.normalize_search_text(left(p.body, 80)), nq),
          false,
          0.2,
          LEAST(ln(1 + LEAST(coalesce(p.likes_count, 0), 40)) / ln(41), 1)::real * 0.4
            + LEAST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400.0 / 120.0, 1)::real * 0.6
        ),
        p.created_at,
        left(p.body, 160),
        false
      FROM public.social_posts p
      WHERE (cardinality(want) = 0 OR 'posts' = ANY (want))
        AND p.deleted_at IS NULL
        AND p.is_published
        AND NOT p.is_hidden
        AND NOT coalesce(p.is_draft, false)
        AND NOT public.search_viewer_hidden_author(p.author_id)
        AND (
          p.search_vector @@ q
          OR public.normalize_search_text(p.body) LIKE '%' || nq || '%'
        )
        AND (p_date_from IS NULL OR p.created_at >= p_date_from)
        AND (p_date_to IS NULL OR p.created_at <= p_date_to)

      UNION ALL

      SELECT
        'forum',
        t.id::text,
        t.title,
        NULL,
        '/forum/t/' || t.id::text,
        public.search_rank(
          nq,
          public.normalize_search_text(t.title),
          public.normalize_search_text(concat_ws(' ', t.title, t.body, array_to_string(t.tags, ' '))),
          ts_rank_cd(t.search_vector, q),
          similarity(public.normalize_search_text(t.title), nq),
          false,
          0.3,
          LEAST(ln(1 + LEAST(coalesce(t.reply_count, 0), 40)) / ln(41), 1)::real * 0.4
            + LEAST(EXTRACT(EPOCH FROM (now() - coalesce(t.last_reply_at, t.created_at))) / 86400.0 / 180.0, 1)::real * 0.6
        ),
        t.created_at,
        left(t.body, 160),
        false
      FROM public.forum_topics t
      WHERE (cardinality(want) = 0 OR 'forum' = ANY (want))
        AND t.deleted_at IS NULL
        AND NOT public.search_viewer_hidden_author(t.author_id)
        AND public.search_term_matches(nq, public.normalize_search_text(t.title), t.search_vector, q, 0.28)
        AND (p_date_from IS NULL OR t.created_at >= p_date_from)
        AND (p_date_to IS NULL OR t.created_at <= p_date_to)

      UNION ALL

      SELECT
        'events',
        e.id::text,
        e.title,
        nullif(concat_ws(' · ', e.event_type, e.location), ''),
        '/events/' || e.slug,
        public.search_rank(
          nq,
          public.normalize_search_text(e.title),
          coalesce(e.search_norm, ''),
          ts_rank_cd(e.search_vector, q),
          similarity(coalesce(e.search_norm, ''), nq),
          false,
          0.4,
          0.3
        ),
        e.starts_at,
        left(coalesce(e.description, ''), 160),
        false
      FROM public.events e
      WHERE (cardinality(want) = 0 OR 'events' = ANY (want))
        AND e.status = 'published'
        AND e.deleted_at IS NULL
        AND NOT public.search_viewer_hidden_author(e.created_by)
        AND public.search_term_matches(nq, coalesce(e.search_norm, ''), e.search_vector, q, 0.28)
        AND (p_language IS NULL OR e.language = p_language)
        AND (p_country IS NULL OR coalesce(e.location, '') ILIKE '%' || p_country || '%')
        AND (p_category IS NULL OR e.event_type = p_category)
        AND (p_date_from IS NULL OR e.starts_at >= p_date_from)
        AND (p_date_to IS NULL OR e.starts_at <= p_date_to)
    ) u
    WHERE p_cursor_id IS NULL
      OR (
        newest AND (
          u.created_at < p_cursor_created
          OR (u.created_at = p_cursor_created AND (u.entity_type, u.entity_id) < (p_cursor_type, p_cursor_id))
        )
      )
      OR (
        NOT newest AND (
          u.rank < p_cursor_rank
          OR (u.rank = p_cursor_rank AND u.created_at < p_cursor_created)
          OR (u.rank = p_cursor_rank AND u.created_at = p_cursor_created AND (u.entity_type, u.entity_id) < (p_cursor_type, p_cursor_id))
        )
      )
  ),
  ordered AS (
    SELECT h.*
    FROM hits h
    ORDER BY
      CASE WHEN newest THEN extract(epoch FROM h.created_at) ELSE h.rank END DESC,
      h.created_at DESC,
      h.entity_type DESC,
      h.entity_id DESC
    LIMIT lim + 1
  )
  SELECT
    o.entity_type,
    o.entity_id,
    o.title,
    o.subtitle,
    o.href,
    o.rank,
    o.created_at,
    o.snippet,
    o.is_verified,
    (count(*) OVER () > lim) AS has_more
  FROM ordered o
  LIMIT lim;
END;
$$;

REVOKE ALL ON FUNCTION public.global_search(text, text[], int, text, text, text, text, text, timestamptz, timestamptz, real, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_search(text, text[], int, text, text, text, text, text, timestamptz, timestamptz, real, timestamptz, text, text) TO anon, authenticated;
