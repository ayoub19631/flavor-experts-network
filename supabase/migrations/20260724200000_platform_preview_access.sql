-- Platform preview access: allow selected users to view the site while it is private
-- Idempotent — safe to re-run

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS platform_preview_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_profiles.platform_preview_access IS
  'When platform is in private mode, grants full site preview access (admin-managed).';

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_platform_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.is_admin := false;
      NEW.platform_preview_access := false;
      NEW.subscription_active := false;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.is_admin := OLD.is_admin;
      NEW.platform_preview_access := OLD.platform_preview_access;
      NEW.subscription_active := OLD.subscription_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
