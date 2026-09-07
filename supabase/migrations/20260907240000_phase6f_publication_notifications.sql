-- Phase 6F — in-app publication notifications through Phase 5 emit_event_notification.
-- Email stays skipped. No self-notify. Honors block/mute/preferences.

CREATE OR REPLACE FUNCTION public.notify_publication_staff(
  p_title text,
  p_body text,
  p_type text,
  p_link text,
  p_actor uuid,
  p_publication_id uuid,
  p_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff uuid;
BEGIN
  FOR staff IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.publication_staff
      UNION
      SELECT user_id FROM public.platform_roles WHERE role IN ('platform_admin', 'super_admin', 'research_editor', 'content_editor')
      UNION
      SELECT id FROM public.user_profiles WHERE is_admin = true
    ) s
  LOOP
    PERFORM public.emit_event_notification(
      staff, p_title, p_body, p_type, p_link, p_actor, 'publication', p_publication_id::text, p_key || ':' || staff::text
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_publication_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  link text := '/dashboard/publications';
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'submitted' THEN
    PERFORM public.notify_publication_staff(
      'Publication submitted',
      coalesce(NEW.title, 'A publication') || ' was submitted for review.',
      'publication_submitted',
      '/admin/publications',
      actor,
      NEW.id,
      'pub:submitted:' || NEW.id::text || ':' || NEW.updated_at::text
    );
  ELSIF NEW.status IN ('revision_requested', 'revision_required') THEN
    PERFORM public.emit_event_notification(
      NEW.created_by,
      'Revision requested',
      coalesce(NEW.decision_reason, 'A reviewer requested changes to your publication.'),
      'publication_revision',
      link,
      actor,
      'publication',
      NEW.id::text,
      'pub:revision:' || NEW.id::text || ':' || NEW.updated_at::text
    );
  ELSIF NEW.status IN ('approved', 'accepted') THEN
    PERFORM public.emit_event_notification(
      NEW.created_by,
      'Publication approved',
      coalesce(NEW.title, 'Your publication') || ' was approved.',
      'publication_approved',
      link,
      actor,
      'publication',
      NEW.id::text,
      'pub:approved:' || NEW.id::text
    );
  ELSIF NEW.status = 'rejected' THEN
    PERFORM public.emit_event_notification(
      NEW.created_by,
      'Publication rejected',
      coalesce(NEW.decision_reason, 'Your publication was rejected.'),
      'publication_rejected',
      link,
      actor,
      'publication',
      NEW.id::text,
      'pub:rejected:' || NEW.id::text || ':' || NEW.updated_at::text
    );
  ELSIF NEW.status = 'scheduled' THEN
    PERFORM public.emit_event_notification(
      NEW.created_by,
      'Publication scheduled',
      coalesce(NEW.title, 'Your publication') || ' was scheduled.',
      'publication_scheduled',
      link,
      actor,
      'publication',
      NEW.id::text,
      'pub:scheduled:' || NEW.id::text || ':' || coalesce(NEW.scheduled_at, now())::text
    );
  ELSIF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    PERFORM public.emit_event_notification(
      NEW.created_by,
      'Publication published',
      coalesce(NEW.title, 'Your publication') || ' is now published.',
      'publication_published',
      '/publications/' || NEW.slug,
      actor,
      'publication',
      NEW.id::text,
      'pub:published:' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_publication_workflow ON public.publications;
CREATE TRIGGER trg_notify_publication_workflow
  AFTER UPDATE OF status ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.notify_publication_workflow();

CREATE OR REPLACE FUNCTION public.notify_publication_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  title text;
BEGIN
  SELECT p.title INTO title FROM public.publications p WHERE p.id = NEW.publication_id;
  IF NEW.profile_id IS NOT NULL AND NEW.profile_id IS DISTINCT FROM actor THEN
    PERFORM public.emit_event_notification(
      NEW.profile_id,
      CASE TG_TABLE_NAME
        WHEN 'publication_contributors' THEN 'Added as a contributor'
        ELSE 'Added as an author'
      END,
      'You were added to ' || coalesce(title, 'a publication') || '.',
      'publication_credit',
      '/dashboard/publications',
      actor,
      'publication',
      NEW.publication_id::text,
      'pub:credit:' || TG_TABLE_NAME || ':' || NEW.publication_id::text || ':' || NEW.profile_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_publication_author ON public.publication_authors;
CREATE TRIGGER trg_notify_publication_author
  AFTER INSERT ON public.publication_authors
  FOR EACH ROW EXECUTE FUNCTION public.notify_publication_credit();

DROP TRIGGER IF EXISTS trg_notify_publication_contributor ON public.publication_contributors;
CREATE TRIGGER trg_notify_publication_contributor
  AFTER INSERT ON public.publication_contributors
  FOR EACH ROW EXECUTE FUNCTION public.notify_publication_credit();

CREATE OR REPLACE FUNCTION public.notify_publication_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pub_id uuid;
BEGIN
  IF NEW.entity_type <> 'publication' THEN
    RETURN NEW;
  END IF;
  BEGIN
    pub_id := NEW.entity_id::uuid;
  EXCEPTION WHEN others THEN
    pub_id := NULL;
  END;
  PERFORM public.notify_publication_staff(
    'Publication report',
    'A publication was reported: ' || left(coalesce(NEW.reason, 'unspecified'), 80),
    'publication_report',
    '/admin/publications',
    NEW.reporter_id,
    pub_id,
    'pub:report:' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_publication_report ON public.content_reports;
CREATE TRIGGER trg_notify_publication_report
  AFTER INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_publication_report();

REVOKE ALL ON FUNCTION public.notify_publication_staff(text, text, text, text, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_publication_workflow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_publication_credit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_publication_report() FROM PUBLIC, anon, authenticated;
