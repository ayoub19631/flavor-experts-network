-- Phase 8B — supplier raw-material catalog and claimed documents.
-- Public rows are approved listings only. Certificates are never auto-validated.
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '15s';

CREATE TABLE IF NOT EXISTS public.supplier_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.supplier_profiles(id),
  slug text NOT NULL,
  trade_name text NOT NULL,
  generic_name text,
  category text,
  e_number text,
  fema text,
  cas text,
  food_grade boolean,
  manufacturer text,
  country_of_origin text,
  country_of_manufacture text,
  physical_form text,
  applications text[] NOT NULL DEFAULT '{}',
  solubility text,
  shelf_life text,
  packaging text,
  moq text,
  moq_unit text,
  lead_time_days int,
  sample_available boolean,
  incoterms text[] NOT NULL DEFAULT '{}',
  regulatory_regions text[] NOT NULL DEFAULT '{}',
  certifications text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'hidden', 'rejected')),
  search_norm text,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text,
  CONSTRAINT supplier_materials_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS supplier_materials_supplier_idx
  ON public.supplier_materials (supplier_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS supplier_materials_search_vec_idx
  ON public.supplier_materials USING gin (search_vector);
CREATE INDEX IF NOT EXISTS supplier_materials_search_trgm_idx
  ON public.supplier_materials USING gin (search_norm gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.supplier_material_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.supplier_materials(id),
  doc_type text NOT NULL CHECK (doc_type IN (
    'coa', 'tds', 'sds', 'halal', 'kosher', 'allergen', 'gmo', 'other'
  )),
  version int NOT NULL DEFAULT 1,
  storage_path text,
  mime_type text,
  byte_size bigint,
  original_name text,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_reason text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_material_documents_material_idx
  ON public.supplier_material_documents (material_id, archived_at);

CREATE OR REPLACE FUNCTION public.supplier_materials_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.supplier_id := OLD.supplier_id;
    NEW.created_at := OLD.created_at;
    IF NOT public.marketplace_is_staff() AND NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
      NEW.status := 'pending_review';
    END IF;
  ELSIF NOT public.marketplace_is_staff() AND NEW.status = 'published' THEN
    NEW.status := 'pending_review';
  END IF;
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) < 2 THEN
    NEW.slug := coalesce(public.marketplace_slugify(NEW.trade_name), 'material')
      || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  ELSE
    NEW.slug := public.marketplace_slugify(NEW.slug);
  END IF;
  NEW.updated_at := now();
  NEW.search_norm := public.normalize_search_text(concat_ws(
    ' ', NEW.trade_name, NEW.generic_name, NEW.category, NEW.e_number, NEW.fema, NEW.cas,
    NEW.manufacturer, NEW.country_of_origin, NEW.physical_form, array_to_string(NEW.applications, ' ')
  ));
  NEW.search_vector := to_tsvector('simple', coalesce(NEW.search_norm, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_materials_before_write ON public.supplier_materials;
CREATE TRIGGER trg_supplier_materials_before_write
  BEFORE INSERT OR UPDATE ON public.supplier_materials
  FOR EACH ROW EXECUTE FUNCTION public.supplier_materials_before_write();

ALTER TABLE public.supplier_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_materials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_material_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_material_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_materials_select ON public.supplier_materials;
CREATE POLICY supplier_materials_select ON public.supplier_materials
  FOR SELECT TO anon, authenticated
  USING (
    public.marketplace_is_staff()
    OR EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = supplier_id AND s.owner_id = (SELECT auth.uid())
    )
    OR (
      status = 'published'
      AND deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.supplier_profiles s
        WHERE s.id = supplier_id
          AND public.marketplace_public_supplier_visible(s)
      )
    )
  );

DROP POLICY IF EXISTS supplier_materials_write ON public.supplier_materials;
CREATE POLICY supplier_materials_write ON public.supplier_materials
  FOR ALL TO authenticated
  USING (
    public.marketplace_is_staff()
    OR EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = supplier_id AND s.owner_id = (SELECT auth.uid()) AND s.deleted_at IS NULL
    )
  )
  WITH CHECK (
    public.marketplace_is_staff()
    OR EXISTS (
      SELECT 1 FROM public.supplier_profiles s
      WHERE s.id = supplier_id AND s.owner_id = (SELECT auth.uid()) AND s.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS supplier_material_documents_select ON public.supplier_material_documents;
CREATE POLICY supplier_material_documents_select ON public.supplier_material_documents
  FOR SELECT TO authenticated
  USING (
    public.marketplace_is_staff()
    OR uploaded_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.supplier_materials m
      JOIN public.supplier_profiles s ON s.id = m.supplier_id
      WHERE m.id = material_id AND s.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS supplier_material_documents_write ON public.supplier_material_documents;
CREATE POLICY supplier_material_documents_write ON public.supplier_material_documents
  FOR ALL TO authenticated
  USING (
    public.marketplace_is_staff()
    OR uploaded_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.supplier_materials m
      JOIN public.supplier_profiles s ON s.id = m.supplier_id
      WHERE m.id = material_id AND s.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    OR public.marketplace_is_staff()
  );

REVOKE ALL ON TABLE public.supplier_materials FROM PUBLIC;
REVOKE ALL ON TABLE public.supplier_material_documents FROM PUBLIC;
GRANT SELECT ON TABLE public.supplier_materials TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.supplier_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.supplier_material_documents TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_public_material_visible(p_row public.supplier_materials)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p_row.status = 'published'
     AND p_row.deleted_at IS NULL
     AND EXISTS (
       SELECT 1 FROM public.supplier_profiles s
       WHERE s.id = p_row.supplier_id
         AND public.marketplace_public_supplier_visible(s)
     );
$$;

CREATE OR REPLACE FUNCTION public.upsert_supplier_material(
  p_id uuid,
  p_trade_name text,
  p_generic_name text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_e_number text DEFAULT NULL,
  p_fema text DEFAULT NULL,
  p_cas text DEFAULT NULL,
  p_food_grade boolean DEFAULT NULL,
  p_manufacturer text DEFAULT NULL,
  p_country_of_origin text DEFAULT NULL,
  p_country_of_manufacture text DEFAULT NULL,
  p_physical_form text DEFAULT NULL,
  p_applications text[] DEFAULT '{}',
  p_solubility text DEFAULT NULL,
  p_shelf_life text DEFAULT NULL,
  p_packaging text DEFAULT NULL,
  p_moq text DEFAULT NULL,
  p_moq_unit text DEFAULT NULL,
  p_lead_time_days int DEFAULT NULL,
  p_sample_available boolean DEFAULT NULL,
  p_incoterms text[] DEFAULT '{}',
  p_regulatory_regions text[] DEFAULT '{}',
  p_certifications text[] DEFAULT '{}',
  p_submit_review boolean DEFAULT false
)
RETURNS public.supplier_materials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  supplier public.supplier_profiles%ROWTYPE;
  rec public.supplier_materials%ROWTYPE;
  next_status text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;
  SELECT * INTO supplier FROM public.supplier_profiles WHERE owner_id = me AND deleted_at IS NULL;
  IF supplier.id IS NULL THEN
    RAISE EXCEPTION 'Create a supplier profile before adding catalog items.';
  END IF;
  IF p_trade_name IS NULL OR length(trim(p_trade_name)) < 2 THEN
    RAISE EXCEPTION 'Trade name is required.';
  END IF;
  next_status := CASE WHEN p_submit_review THEN 'pending_review' ELSE 'draft' END;

  IF p_id IS NULL THEN
    INSERT INTO public.supplier_materials (
      supplier_id, slug, trade_name, generic_name, category, e_number, fema, cas, food_grade,
      manufacturer, country_of_origin, country_of_manufacture, physical_form, applications,
      solubility, shelf_life, packaging, moq, moq_unit, lead_time_days, sample_available,
      incoterms, regulatory_regions, certifications, status
    ) VALUES (
      supplier.id,
      coalesce(public.marketplace_slugify(p_trade_name), 'material') || '-' || substr(md5(random()::text), 1, 8),
      trim(p_trade_name), NULLIF(trim(p_generic_name), ''), NULLIF(trim(p_category), ''),
      NULLIF(trim(p_e_number), ''), NULLIF(trim(p_fema), ''), NULLIF(trim(p_cas), ''),
      p_food_grade, NULLIF(trim(p_manufacturer), ''), NULLIF(trim(p_country_of_origin), ''),
      NULLIF(trim(p_country_of_manufacture), ''), NULLIF(trim(p_physical_form), ''),
      coalesce(p_applications, '{}'), NULLIF(trim(p_solubility), ''), NULLIF(trim(p_shelf_life), ''),
      NULLIF(trim(p_packaging), ''), NULLIF(trim(p_moq), ''), NULLIF(trim(p_moq_unit), ''),
      p_lead_time_days, p_sample_available, coalesce(p_incoterms, '{}'),
      coalesce(p_regulatory_regions, '{}'), coalesce(p_certifications, '{}'), next_status
    ) RETURNING * INTO rec;
  ELSE
    UPDATE public.supplier_materials
    SET trade_name = trim(p_trade_name),
        generic_name = NULLIF(trim(p_generic_name), ''),
        category = NULLIF(trim(p_category), ''),
        e_number = NULLIF(trim(p_e_number), ''),
        fema = NULLIF(trim(p_fema), ''),
        cas = NULLIF(trim(p_cas), ''),
        food_grade = p_food_grade,
        manufacturer = NULLIF(trim(p_manufacturer), ''),
        country_of_origin = NULLIF(trim(p_country_of_origin), ''),
        country_of_manufacture = NULLIF(trim(p_country_of_manufacture), ''),
        physical_form = NULLIF(trim(p_physical_form), ''),
        applications = coalesce(p_applications, '{}'),
        solubility = NULLIF(trim(p_solubility), ''),
        shelf_life = NULLIF(trim(p_shelf_life), ''),
        packaging = NULLIF(trim(p_packaging), ''),
        moq = NULLIF(trim(p_moq), ''),
        moq_unit = NULLIF(trim(p_moq_unit), ''),
        lead_time_days = p_lead_time_days,
        sample_available = p_sample_available,
        incoterms = coalesce(p_incoterms, '{}'),
        regulatory_regions = coalesce(p_regulatory_regions, '{}'),
        certifications = coalesce(p_certifications, '{}'),
        status = CASE
          WHEN status = 'published' AND NOT p_submit_review THEN status
          ELSE next_status
        END
    WHERE id = p_id AND supplier_id = supplier.id AND deleted_at IS NULL
    RETURNING * INTO rec;
    IF rec.id IS NULL THEN
      RAISE EXCEPTION 'Material not found.';
    END IF;
  END IF;

  UPDATE public.supplier_profiles SET last_catalog_update_at = now() WHERE id = supplier.id;
  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_materials(
  p_query text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_supplier_slug text DEFAULT NULL,
  p_limit int DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  slug text,
  trade_name text,
  generic_name text,
  category text,
  physical_form text,
  country_of_origin text,
  sample_available boolean,
  supplier_id uuid,
  supplier_slug text,
  supplier_name text,
  supplier_verified boolean,
  certifications text[],
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    m.id, m.slug, m.trade_name, m.generic_name, m.category, m.physical_form,
    m.country_of_origin, m.sample_available, s.id, s.slug, s.trade_name,
    public.marketplace_is_verified_company(s.owner_id),
    m.certifications,
    m.updated_at
  FROM public.supplier_materials m
  JOIN public.supplier_profiles s ON s.id = m.supplier_id
  WHERE public.marketplace_public_material_visible(m)
    AND (p_category IS NULL OR m.category ILIKE p_category)
    AND (p_country IS NULL OR m.country_of_origin ILIKE p_country)
    AND (p_supplier_slug IS NULL OR s.slug = public.marketplace_slugify(p_supplier_slug))
    AND (
      p_query IS NULL
      OR char_length(trim(p_query)) < 2
      OR public.search_term_matches(
        public.normalize_search_text(p_query),
        coalesce(m.search_norm, ''),
        m.search_vector,
        public.search_parse_tsquery(p_query),
        0.28
      )
    )
  ORDER BY m.updated_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 24), 1), 60);
$$;

CREATE OR REPLACE FUNCTION public.get_public_material(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.supplier_materials%ROWTYPE;
  s public.supplier_profiles%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.supplier_materials WHERE slug = public.marketplace_slugify(p_slug) LIMIT 1;
  IF m.id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO s FROM public.supplier_profiles WHERE id = m.supplier_id;
  IF NOT public.marketplace_public_material_visible(m)
     AND s.owner_id IS DISTINCT FROM (SELECT auth.uid())
     AND NOT public.marketplace_is_staff() THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', m.id,
    'slug', m.slug,
    'trade_name', m.trade_name,
    'generic_name', m.generic_name,
    'category', m.category,
    'e_number', m.e_number,
    'fema', m.fema,
    'cas', m.cas,
    'food_grade', m.food_grade,
    'manufacturer', m.manufacturer,
    'country_of_origin', m.country_of_origin,
    'country_of_manufacture', m.country_of_manufacture,
    'physical_form', m.physical_form,
    'applications', m.applications,
    'solubility', m.solubility,
    'shelf_life', m.shelf_life,
    'packaging', m.packaging,
    'moq', m.moq,
    'moq_unit', m.moq_unit,
    'lead_time_days', m.lead_time_days,
    'sample_available', m.sample_available,
    'incoterms', m.incoterms,
    'regulatory_regions', m.regulatory_regions,
    'certifications', m.certifications,
    'certifications_claimed_only', true,
    'status', m.status,
    'updated_at', m.updated_at,
    'documents', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id,
        'doc_type', d.doc_type,
        'review_status', d.review_status,
        'version', d.version
      ) ORDER BY d.created_at DESC), '[]'::jsonb)
      FROM public.supplier_material_documents d
      WHERE d.material_id = m.id AND d.archived_at IS NULL
    ),
    'supplier', jsonb_build_object(
      'id', s.id,
      'slug', s.slug,
      'trade_name', s.trade_name,
      'legal_name', s.legal_name,
      'supplier_type', s.supplier_type,
      'country', s.country,
      'city', s.city,
      'is_verified', public.marketplace_is_verified_company(s.owner_id)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_materials()
RETURNS SETOF public.supplier_materials
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.*
  FROM public.supplier_materials m
  JOIN public.supplier_profiles s ON s.id = m.supplier_id
  WHERE s.owner_id = (SELECT auth.uid())
    AND m.deleted_at IS NULL
  ORDER BY m.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.marketplace_public_material_visible(public.supplier_materials) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_supplier_material(uuid, text, text, text, text, text, text, boolean, text, text, text, text, text[], text, text, text, text, text, int, boolean, text[], text[], text[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_public_materials(text, text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_material(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_materials() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.marketplace_public_material_visible(public.supplier_materials) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_supplier_material(uuid, text, text, text, text, text, text, boolean, text, text, text, text, text[], text, text, text, text, text, int, boolean, text[], text[], text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_materials(text, text, text, text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_material(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_materials() TO authenticated;
