-- Phase 8A — supplier marketplace profiles. Additive. No hard deletes.
-- Reuses user_profiles company accounts and platform_roles.verified_company.
-- Does not reuse market_sources (commodity intel only).
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE OR REPLACE FUNCTION public.marketplace_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
      OR public.is_super_admin()
      OR public.has_capability('moderate_community');
$$;

CREATE OR REPLACE FUNCTION public.marketplace_is_verified_company(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p_uid IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.platform_roles
      WHERE user_id = p_uid AND role = 'verified_company'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = p_uid AND coalesce(is_verified, false) = true
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_is_company_account(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_uid AND account_type = 'company'
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_slugify(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(lower(trim(coalesce(p_text, ''))), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  company_id uuid NOT NULL REFERENCES auth.users(id),
  slug text NOT NULL,
  legal_name text,
  trade_name text NOT NULL,
  supplier_type text NOT NULL CHECK (supplier_type IN ('manufacturer', 'distributor', 'agent')),
  logo_url text,
  cover_url text,
  country text,
  city text,
  about text,
  website text,
  linkedin_url text,
  public_email text,
  public_phone text,
  markets text[] NOT NULL DEFAULT '{}',
  listing_status text NOT NULL DEFAULT 'draft'
    CHECK (listing_status IN ('draft', 'pending_review', 'approved', 'hidden', 'rejected')),
  listed_at timestamptz,
  last_catalog_update_at timestamptz,
  is_suspended boolean NOT NULL DEFAULT false,
  suspended_reason text,
  search_norm text,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text,
  CONSTRAINT supplier_profiles_owner_unique UNIQUE (owner_id),
  CONSTRAINT supplier_profiles_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS supplier_profiles_listing_idx
  ON public.supplier_profiles (listing_status, deleted_at)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS supplier_profiles_country_idx
  ON public.supplier_profiles (country)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS supplier_profiles_search_vec_idx
  ON public.supplier_profiles USING gin (search_vector);
CREATE INDEX IF NOT EXISTS supplier_profiles_search_trgm_idx
  ON public.supplier_profiles USING gin (search_norm gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.supplier_profiles_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.owner_id := OLD.owner_id;
    NEW.company_id := OLD.company_id;
    NEW.created_at := OLD.created_at;
    IF NOT public.marketplace_is_staff() THEN
      NEW.is_suspended := OLD.is_suspended;
      NEW.suspended_reason := OLD.suspended_reason;
      NEW.deleted_at := OLD.deleted_at;
      NEW.listed_at := OLD.listed_at;
      IF NEW.listing_status = 'approved' AND OLD.listing_status IS DISTINCT FROM 'approved' THEN
        NEW.listing_status := 'pending_review';
      END IF;
    END IF;
  ELSIF NOT public.marketplace_is_staff() AND NEW.listing_status NOT IN ('draft', 'pending_review') THEN
    NEW.listing_status := 'draft';
  END IF;
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) < 2 THEN
    NEW.slug := coalesce(
      public.marketplace_slugify(NEW.trade_name),
      'supplier'
    ) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  ELSE
    NEW.slug := public.marketplace_slugify(NEW.slug);
  END IF;
  NEW.updated_at := now();
  NEW.search_norm := public.normalize_search_text(concat_ws(
    ' ', NEW.legal_name, NEW.trade_name, NEW.supplier_type, NEW.country, NEW.city, NEW.about, array_to_string(NEW.markets, ' ')
  ));
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.search_norm, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_profiles_before_write ON public.supplier_profiles;
CREATE TRIGGER trg_supplier_profiles_before_write
  BEFORE INSERT OR UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.supplier_profiles_before_write();

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_profiles_select ON public.supplier_profiles;
CREATE POLICY supplier_profiles_select ON public.supplier_profiles
  FOR SELECT TO anon, authenticated
  USING (
    public.marketplace_is_staff()
    OR owner_id = (SELECT auth.uid())
    OR (
      listing_status = 'approved'
      AND deleted_at IS NULL
      AND is_suspended = false
    )
  );

DROP POLICY IF EXISTS supplier_profiles_insert ON public.supplier_profiles;
CREATE POLICY supplier_profiles_insert ON public.supplier_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND company_id = (SELECT auth.uid())
    AND public.marketplace_is_company_account((SELECT auth.uid()))
    AND listing_status IN ('draft', 'pending_review')
  );

DROP POLICY IF EXISTS supplier_profiles_update ON public.supplier_profiles;
CREATE POLICY supplier_profiles_update ON public.supplier_profiles
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.marketplace_is_staff())
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR public.marketplace_is_staff()
  );

REVOKE ALL ON TABLE public.supplier_profiles FROM PUBLIC;
GRANT SELECT ON TABLE public.supplier_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.supplier_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_owns_supplier(p_uid uuid, p_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_profiles
    WHERE id = p_supplier_id
      AND owner_id = p_uid
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_public_supplier_visible(p_row public.supplier_profiles)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_row.listing_status = 'approved'
     AND p_row.deleted_at IS NULL
     AND p_row.is_suspended = false;
$$;

CREATE OR REPLACE FUNCTION public.upsert_supplier_profile(
  p_legal_name text,
  p_trade_name text,
  p_supplier_type text,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_about text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_linkedin_url text DEFAULT NULL,
  p_public_email text DEFAULT NULL,
  p_public_phone text DEFAULT NULL,
  p_markets text[] DEFAULT '{}',
  p_logo_url text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_submit_review boolean DEFAULT false
)
RETURNS public.supplier_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  rec public.supplier_profiles%ROWTYPE;
  next_status text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  IF NOT public.marketplace_is_company_account(me) THEN
    RAISE EXCEPTION 'Only company accounts can publish a supplier listing.';
  END IF;
  IF p_trade_name IS NULL OR length(trim(p_trade_name)) < 2 THEN
    RAISE EXCEPTION 'Trade name is required.';
  END IF;
  IF p_supplier_type NOT IN ('manufacturer', 'distributor', 'agent') THEN
    RAISE EXCEPTION 'Supplier type must be manufacturer, distributor, or agent.';
  END IF;
  next_status := CASE WHEN p_submit_review THEN 'pending_review' ELSE 'draft' END;

  INSERT INTO public.supplier_profiles (
    owner_id, company_id, slug, legal_name, trade_name, supplier_type,
    country, city, about, website, linkedin_url, public_email, public_phone,
    markets, logo_url, cover_url, listing_status
  ) VALUES (
    me, me,
    coalesce(public.marketplace_slugify(p_trade_name), 'supplier') || '-' || substr(replace(me::text, '-', ''), 1, 8),
    NULLIF(trim(p_legal_name), ''),
    trim(p_trade_name),
    p_supplier_type,
    NULLIF(trim(p_country), ''),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_about), ''),
    NULLIF(trim(p_website), ''),
    NULLIF(trim(p_linkedin_url), ''),
    NULLIF(trim(p_public_email), ''),
    NULLIF(trim(p_public_phone), ''),
    coalesce(p_markets, '{}'),
    NULLIF(trim(p_logo_url), ''),
    NULLIF(trim(p_cover_url), ''),
    next_status
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    trade_name = EXCLUDED.trade_name,
    supplier_type = EXCLUDED.supplier_type,
    country = EXCLUDED.country,
    city = EXCLUDED.city,
    about = EXCLUDED.about,
    website = EXCLUDED.website,
    linkedin_url = EXCLUDED.linkedin_url,
    public_email = EXCLUDED.public_email,
    public_phone = EXCLUDED.public_phone,
    markets = EXCLUDED.markets,
    logo_url = EXCLUDED.logo_url,
    cover_url = EXCLUDED.cover_url,
    listing_status = CASE
      WHEN public.supplier_profiles.listing_status = 'approved' AND NOT p_submit_review
        THEN public.supplier_profiles.listing_status
      ELSE next_status
    END,
    updated_at = now()
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_suppliers(
  p_query text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_market text DEFAULT NULL,
  p_limit int DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  slug text,
  legal_name text,
  trade_name text,
  supplier_type text,
  logo_url text,
  cover_url text,
  country text,
  city text,
  about text,
  website text,
  linkedin_url text,
  markets text[],
  is_verified boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id, s.slug, s.legal_name, s.trade_name, s.supplier_type,
    s.logo_url, s.cover_url, s.country, s.city, s.about, s.website, s.linkedin_url,
    s.markets,
    public.marketplace_is_verified_company(s.owner_id),
    s.updated_at
  FROM public.supplier_profiles s
  WHERE public.marketplace_public_supplier_visible(s)
    AND (p_country IS NULL OR s.country ILIKE p_country)
    AND (p_type IS NULL OR s.supplier_type = p_type)
    AND (p_market IS NULL OR p_market = ANY (s.markets))
    AND (
      p_query IS NULL
      OR char_length(trim(p_query)) < 2
      OR public.search_term_matches(
        public.normalize_search_text(p_query),
        coalesce(s.search_norm, ''),
        s.search_vector,
        public.search_parse_tsquery(p_query),
        0.28
      )
    )
  ORDER BY s.updated_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 24), 1), 60);
$$;

CREATE OR REPLACE FUNCTION public.get_public_supplier(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  rec public.supplier_profiles%ROWTYPE;
BEGIN
  SELECT * INTO rec
  FROM public.supplier_profiles
  WHERE slug = public.marketplace_slugify(p_slug)
  LIMIT 1;
  IF rec.id IS NULL OR NOT public.marketplace_public_supplier_visible(rec) THEN
    IF rec.id IS NULL OR rec.owner_id IS DISTINCT FROM (SELECT auth.uid()) AND NOT public.marketplace_is_staff() THEN
      RETURN NULL;
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'id', rec.id,
    'slug', rec.slug,
    'legal_name', rec.legal_name,
    'trade_name', rec.trade_name,
    'supplier_type', rec.supplier_type,
    'logo_url', rec.logo_url,
    'cover_url', rec.cover_url,
    'country', rec.country,
    'city', rec.city,
    'about', rec.about,
    'website', rec.website,
    'linkedin_url', rec.linkedin_url,
    'markets', rec.markets,
    'listing_status', rec.listing_status,
    'is_verified', public.marketplace_is_verified_company(rec.owner_id),
    'updated_at', rec.updated_at,
    'last_catalog_update_at', rec.last_catalog_update_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_is_verified_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_is_company_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_slugify(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_owns_supplier(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_public_supplier_visible(public.supplier_profiles) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_supplier_profile(text, text, text, text, text, text, text, text, text, text, text[], text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_public_suppliers(text, text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_supplier(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.marketplace_is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_is_verified_company(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_is_company_account(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_slugify(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_owns_supplier(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_public_supplier_visible(public.supplier_profiles) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_supplier_profile(text, text, text, text, text, text, text, text, text, text, text[], text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_suppliers(text, text, text, text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_supplier(text) TO anon, authenticated;
