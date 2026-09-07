-- Phase 6E — versions, related works, citation helpers, rate-limited counters.
-- DOI is stored only when supplied. This does not register a DOI.

CREATE OR REPLACE FUNCTION public.safe_doi_url(p_doi text, p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  candidate text := NULLIF(trim(coalesce(p_url, '')), '');
BEGIN
  IF candidate IS NULL THEN
    RETURN NULL;
  END IF;
  IF candidate ~* '^https://(dx\.)?doi\.org/10\.' THEN
    RETURN candidate;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.publications_sanitize_identifiers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.doi := NULLIF(trim(coalesce(NEW.doi, '')), '');
  NEW.isbn := NULLIF(trim(coalesce(NEW.isbn, '')), '');
  NEW.doi_url := public.safe_doi_url(NEW.doi, NEW.doi_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publications_sanitize_identifiers ON public.publications;
CREATE TRIGGER trg_publications_sanitize_identifiers
  BEFORE INSERT OR UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.publications_sanitize_identifiers();

CREATE OR REPLACE FUNCTION public.search_publications(
  p_query text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0,
  p_sort text DEFAULT 'newest'
)
RETURNS TABLE (
  id uuid,
  type text,
  slug text,
  title text,
  abstract text,
  primary_language text,
  published_at timestamptz,
  rank real
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  q tsquery;
BEGIN
  BEGIN
    IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
      q := NULL;
    ELSE
      q := websearch_to_tsquery('simple', trim(p_query));
    END IF;
  EXCEPTION WHEN others THEN
    q := plainto_tsquery('simple', trim(p_query));
  END;

  RETURN QUERY
  SELECT
    p.id,
    p.type,
    p.slug,
    p.title,
    p.abstract,
    p.primary_language,
    p.published_at,
    CASE
      WHEN q IS NULL THEN 0::real
      ELSE ts_rank(p.search_vector, q) + coalesce(ts_rank(t.search_vector, q), 0)
    END AS rank
  FROM public.publications p
  LEFT JOIN public.publication_translations t
    ON t.publication_id = p.id
   AND (p_language IS NULL OR t.language = p_language)
  WHERE p.status IN ('published', 'corrected', 'retracted')
    AND (q IS NULL OR p.search_vector @@ q OR t.search_vector @@ q
         OR EXISTS (
           SELECT 1 FROM public.publication_authors a
           WHERE a.publication_id = p.id
             AND a.full_name ILIKE '%' || trim(p_query) || '%'
         ))
    AND (p_type IS NULL OR p.type = p_type)
    AND (p_language IS NULL OR p.primary_language = p_language OR t.language = p_language)
    AND (p_category IS NULL OR EXISTS (
      SELECT 1
      FROM public.publication_category_map m
      JOIN public.publication_categories c ON c.id = m.category_id
      WHERE m.publication_id = p.id AND c.slug = p_category
    ))
  ORDER BY
    CASE WHEN coalesce(p_sort, 'newest') = 'most_read' THEN p.view_count ELSE 0 END DESC,
    CASE WHEN q IS NULL THEN 0 ELSE ts_rank(p.search_vector, q) END DESC,
    p.published_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(coalesce(p_limit, 12), 1), 50)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_publication_event(
  p_publication_id uuid,
  p_event_type text,
  p_file_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  recent int;
BEGIN
  IF p_event_type NOT IN ('view', 'read', 'download', 'bookmark', 'citation_export') THEN
    RAISE EXCEPTION 'Unsupported event type.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.publications p
    WHERE p.id = p_publication_id
      AND public.publication_row_readable(p.status, p.visibility, p.created_by, p.id)
  ) THEN
    RAISE EXCEPTION 'Not allowed to record an event for this publication.';
  END IF;

  IF p_event_type IN ('view', 'download') THEN
    SELECT count(*) INTO recent
    FROM public.publication_events
    WHERE publication_id = p_publication_id
      AND event_type = p_event_type
      AND created_at > now() - interval '1 hour'
      AND (
        (actor IS NOT NULL AND user_id = actor)
        OR (actor IS NULL AND user_id IS NULL)
      );
    IF recent > 0 THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.publication_events (publication_id, user_id, event_type, file_id)
  VALUES (p_publication_id, actor, p_event_type, p_file_id);

  IF p_event_type = 'view' THEN
    UPDATE public.publications
    SET view_count = view_count + 1
    WHERE id = p_publication_id;
  ELSIF p_event_type = 'download' THEN
    UPDATE public.publications
    SET download_count = download_count + 1
    WHERE id = p_publication_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_related_publications(p_id uuid, p_limit int DEFAULT 6)
RETURNS SETOF public.publications
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.*
  FROM public.publications p
  WHERE p.id IN (
    SELECT related_id FROM public.publication_related WHERE publication_id = p_id
    UNION
    SELECT publication_id FROM public.publication_related WHERE related_id = p_id
  )
    AND public.publication_is_public_status(p.status)
  ORDER BY p.published_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12);
$$;

GRANT EXECUTE ON FUNCTION public.safe_doi_url(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_publications(text, text, text, text, int, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_publication_event(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_related_publications(uuid, int) TO anon, authenticated;
