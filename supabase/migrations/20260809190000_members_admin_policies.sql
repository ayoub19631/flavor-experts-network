-- =============================================================================
-- Complete member administration policies
-- Idempotent. Safe to re-apply.
-- =============================================================================

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_admin_update ON public.members;
CREATE POLICY members_admin_update ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS members_admin_delete ON public.members;
CREATE POLICY members_admin_delete ON public.members
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

COMMENT ON POLICY members_admin_update ON public.members IS
  'Platform administrators may update directory member records.';
COMMENT ON POLICY members_admin_delete ON public.members IS
  'Platform administrators may delete directory member records.';
