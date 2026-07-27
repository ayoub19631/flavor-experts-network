-- Premium content protection: store paid URLs separately from public metadata

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT subscription_tier IN ('professional', 'enterprise')
        AND COALESCE(subscription_active, true)
      FROM public.user_profiles
      WHERE id = auth.uid()
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO service_role;

CREATE TABLE IF NOT EXISTS public.resource_secure_links (
  resource_id UUID PRIMARY KEY REFERENCES public.educational_resources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_secure_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "secure_links_select" ON public.resource_secure_links;
CREATE POLICY "secure_links_select"
  ON public.resource_secure_links FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.has_active_subscription()
  );

DROP POLICY IF EXISTS "secure_links_insert" ON public.resource_secure_links;
CREATE POLICY "secure_links_insert"
  ON public.resource_secure_links FOR INSERT
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "secure_links_update" ON public.resource_secure_links;
CREATE POLICY "secure_links_update"
  ON public.resource_secure_links FOR UPDATE
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "secure_links_delete" ON public.resource_secure_links;
CREATE POLICY "secure_links_delete"
  ON public.resource_secure_links FOR DELETE
  USING (public.is_platform_admin());

-- Migrate existing premium links out of the public column
INSERT INTO public.resource_secure_links (resource_id, url)
SELECT id, link
FROM public.educational_resources
WHERE premium IS TRUE
  AND link IS NOT NULL
  AND btrim(link) <> ''
ON CONFLICT (resource_id) DO UPDATE
SET url = EXCLUDED.url, updated_at = now();

UPDATE public.educational_resources
SET link = ''
WHERE premium IS TRUE
  AND link IS NOT NULL
  AND btrim(link) <> '';

-- Keep premium metadata visible; URLs only via resource_secure_links
CREATE OR REPLACE FUNCTION public.resolve_resource_url(p_resource_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.educational_resources%ROWTYPE;
  secure_url text;
BEGIN
  SELECT * INTO r
  FROM public.educational_resources
  WHERE id = p_resource_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT (r.is_published OR public.is_platform_admin()) THEN
    RETURN NULL;
  END IF;

  IF r.premium IS TRUE THEN
    IF NOT (public.is_platform_admin() OR public.has_active_subscription()) THEN
      RETURN NULL;
    END IF;
    SELECT url INTO secure_url
    FROM public.resource_secure_links
    WHERE resource_id = p_resource_id;
    RETURN secure_url;
  END IF;

  RETURN NULLIF(btrim(r.link), '');
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_resource_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_resource_url(uuid) TO service_role;
