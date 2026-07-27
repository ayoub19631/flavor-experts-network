-- Phase 1: Prevent self-service privilege / subscription escalation
-- Run in Supabase SQL Editor or via migration

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Non-admins cannot set or change tier/admin on their own row
  IF auth.uid() = NEW.id AND NOT public.is_platform_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'free';
      NEW.is_admin := false;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
