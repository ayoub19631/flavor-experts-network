-- Phase 4B — community, profiles, verification, messaging, forum, search

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_title text;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS open_to_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_to_consulting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_for_peer_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS orcid text,
  ADD COLUMN IF NOT EXISTS google_scholar_url text,
  ADD COLUMN IF NOT EXISTS researchgate_url text,
  ADD COLUMN IF NOT EXISTS profile_slug text,
  ADD COLUMN IF NOT EXISTS connection_privacy text NOT NULL DEFAULT 'everyone'
    CHECK (connection_privacy IN ('everyone', 'network', 'nobody'));

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_slug_idx
  ON public.user_profiles(profile_slug)
  WHERE profile_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'platform-uploads',
  mime_type text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_mentions (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE REFERENCES public.social_posts(id) ON DELETE CASCADE,
  question text NOT NULL,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.followed_topics (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('professional', 'company', 'researcher', 'organization_representative')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'more_information_required', 'approved', 'rejected', 'revoked'
  )),
  notes text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'verifications',
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  bucket_name text NOT NULL DEFAULT 'message-attachments',
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_preferences (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived boolean NOT NULL DEFAULT false,
  muted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_solved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_reply_id uuid;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS is_accepted boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.forum_watches (
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.search_recents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, query)
);

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(body, ''))) STORED;

ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED;

ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(location, ''))) STORED;

CREATE INDEX IF NOT EXISTS social_posts_search_idx ON public.social_posts USING gin (search_vector);
CREATE INDEX IF NOT EXISTS forum_topics_search_idx ON public.forum_topics USING gin (search_vector);
CREATE INDEX IF NOT EXISTS job_listings_search_idx ON public.job_listings USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.unified_search(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE (entity_type text, entity_id text, title text, href text, rank real)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  q tsquery;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;
  BEGIN
    q := websearch_to_tsquery('simple', trim(p_query));
  EXCEPTION WHEN others THEN
    q := plainto_tsquery('simple', trim(p_query));
  END;

  RETURN QUERY
  (
    SELECT 'member'::text, d.profile_id::text, d.full_name, '/members/' || coalesce(d.profile_id::text, d.id::text), 0.8::real
    FROM public.member_directory d
    WHERE d.full_name ILIKE '%' || trim(p_query) || '%'
       OR coalesce(d.company, '') ILIKE '%' || trim(p_query) || '%'
    LIMIT 6
  )
  UNION ALL
  (
    SELECT 'post', p.id::text, left(p.body, 120), '/community#post-' || p.id::text, ts_rank(p.search_vector, q)
    FROM public.social_posts p
    WHERE p.deleted_at IS NULL AND p.is_published AND NOT p.is_hidden AND p.search_vector @@ q
    ORDER BY 5 DESC LIMIT LEAST(p_limit, 8)
  )
  UNION ALL
  (
    SELECT 'forum', t.id::text, t.title, '/forum/t/' || t.id::text, ts_rank(t.search_vector, q)
    FROM public.forum_topics t
    WHERE t.deleted_at IS NULL AND t.search_vector @@ q
    ORDER BY 5 DESC LIMIT LEAST(p_limit, 8)
  )
  UNION ALL
  (
    SELECT 'job', j.id::text, j.title, '/jobs/' || coalesce(j.slug, j.id::text), ts_rank(j.search_vector, q)
    FROM public.job_listings j
    WHERE j.deleted_at IS NULL AND j.is_published AND j.status = 'open' AND j.search_vector @@ q
    ORDER BY 5 DESC LIMIT LEAST(p_limit, 8)
  );
END;
$$;

-- job slug added here so search href works even before 4C applies extra job columns
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS slug text;

GRANT EXECUTE ON FUNCTION public.unified_search(text, int) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('verifications', 'verifications', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('message-attachments', 'message-attachments', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false;

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followed_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_recents ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_media_read ON public.post_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY post_media_write ON public.post_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id = post_id AND p.author_id = (SELECT auth.uid())));

CREATE POLICY poll_read ON public.polls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY poll_options_read ON public.poll_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY poll_votes_read ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY poll_votes_insert ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY followed_topics_own ON public.followed_topics FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY verification_requests_own ON public.verification_requests FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

CREATE POLICY verification_documents_own ON public.verification_documents FOR SELECT TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.is_super_admin()
  );

CREATE POLICY conversation_reads_own ON public.conversation_reads FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY conversation_prefs_own ON public.conversation_preferences FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY forum_watches_own ON public.forum_watches FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY search_recents_own ON public.search_recents FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS conversation_messages_insert ON public.conversation_messages;
CREATE POLICY conversation_messages_insert ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.is_conversation_member(conversation_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_members m
      WHERE m.conversation_id = conversation_messages.conversation_id
        AND public.is_blocked_pair(m.user_id, (SELECT auth.uid()))
    )
  );
