-- Prefer vault email_from for Resend sender; notify topic authors on new replies

CREATE OR REPLACE FUNCTION public.send_resend_email(
  p_to text,
  p_subject text,
  p_html text,
  p_text text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  api_key text;
  request_id bigint;
  from_addr text;
BEGIN
  api_key := public.get_resend_api_key();
  IF api_key IS NULL OR length(api_key) < 10 THEN
    RAISE WARNING 'Resend API key missing in vault';
    RETURN NULL;
  END IF;

  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_from' LIMIT 1),
    'Flavor Experts <onboarding@resend.dev>'
  ) INTO from_addr;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', from_addr,
      'to', jsonb_build_array(p_to),
      'subject', p_subject,
      'html', p_html,
      'text', p_text
    )
  ) INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_reply_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  topic_rec record;
  author_email text;
  author_name text;
  replier_name text;
BEGIN
  SELECT t.id, t.title, t.author_id INTO topic_rec
  FROM public.forum_topics t WHERE t.id = NEW.topic_id;

  IF topic_rec.author_id IS NULL OR topic_rec.author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT email, full_name INTO author_email, author_name
  FROM public.user_profiles WHERE id = topic_rec.author_id;

  SELECT coalesce(full_name, split_part(email, '@', 1)) INTO replier_name
  FROM public.user_profiles WHERE id = NEW.author_id;

  IF author_email IS NULL OR author_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public.send_resend_email(
    author_email,
    'New reply on: ' || topic_rec.title,
    '<p>Hi ' || replace(coalesce(author_name, 'there'), '<', '') || ',</p>'
      || '<p><strong>' || replace(coalesce(replier_name, 'A member'), '<', '') || '</strong> replied to your topic <strong>'
      || replace(topic_rec.title, '<', '') || '</strong>.</p>'
      || '<p><a href="https://flavorexpertsnetwork.com/forum/t/' || NEW.topic_id::text || '">View the reply</a></p>',
    coalesce(replier_name, 'A member') || ' replied to your topic: ' || topic_rec.title
  );

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (
    topic_rec.author_id,
    'New forum reply',
    coalesce(replier_name, 'A member') || ' replied to "' || topic_rec.title || '"',
    'forum',
    '/forum/t/' || NEW.topic_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_forum_reply_email ON public.forum_replies;
CREATE TRIGGER trg_notify_forum_reply_email
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply_email();

REVOKE ALL ON FUNCTION public.notify_forum_reply_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_forum_reply_email() FROM anon;
REVOKE ALL ON FUNCTION public.notify_forum_reply_email() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_forum_reply_email() TO service_role;
