-- Guests cannot SELECT user_profiles. The previous member_directory view
-- LEFT JOINed that table under security_invoker, so anon queries failed and
-- the public directory rendered empty. Filter privileged flags via a
-- SECURITY DEFINER helper instead, and join on profile_id (not member id).

CREATE OR REPLACE FUNCTION public.member_is_publicly_listed(p_member_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (NOT COALESCE(p.is_test_account, false)) AND COALESCE(p.is_active, true)
      FROM public.user_profiles p
      WHERE p.id = COALESCE(p_profile_id, p_member_id)
      LIMIT 1
    ),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.member_is_publicly_listed(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_is_publicly_listed(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE VIEW public.member_directory
  WITH (security_invoker = true)
AS
SELECT
  d.id, d.full_name, d.role, d.specialty, d.linkedin_url, d.joined_at, d.avatar_url, d.cover_url,
  d.is_featured, d.title, d.company, d.location, d.bio, d.member_type, d.years_experience,
  d.website, d.profile_id, d.skills, d.education, d.work_experience, d.projects
FROM public.member_directory_data d
WHERE NOT public.is_hidden_test_member(d.full_name, d.company, d.bio)
  AND public.member_is_publicly_listed(d.id, d.profile_id)
  AND NULLIF(btrim(COALESCE(d.full_name, '')), '') IS NOT NULL
  AND lower(btrim(d.full_name)) NOT IN ('user', 'test', 'admin', 'member');

GRANT SELECT ON public.member_directory TO anon, authenticated;

-- Avoid RLS self-recursion when a member reads the peer row or messages.
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation
      AND user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid) TO authenticated;

DROP POLICY IF EXISTS conversation_members_read ON public.conversation_members;
CREATE POLICY conversation_members_read ON public.conversation_members
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS conversations_member_read ON public.conversations;
CREATE POLICY conversations_member_read ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS conversation_messages_read ON public.conversation_messages;
CREATE POLICY conversation_messages_read ON public.conversation_messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS conversation_messages_insert ON public.conversation_messages;
CREATE POLICY conversation_messages_insert ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.is_conversation_member(conversation_id)
  );
