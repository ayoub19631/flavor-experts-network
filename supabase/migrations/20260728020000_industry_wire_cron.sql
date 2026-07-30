-- Industry news wire: dedup columns + daily intelligence cron

ALTER TABLE public.industry_news
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS ingestion_source text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_industry_news_wire_dedup
  ON public.industry_news (ingestion_source, external_id)
  WHERE external_id IS NOT NULL AND ingestion_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_industry_news_published_desc
  ON public.industry_news (published_at DESC)
  WHERE is_published = true;

-- Helper: invoke edge functions with cron secret from Vault (name: cron_secret)
CREATE OR REPLACE FUNCTION public.invoke_edge_function(path text, body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  secret text;
  base_url text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF secret IS NULL OR length(secret) < 8 THEN
    RAISE WARNING 'cron_secret missing in vault — skip edge invoke for %', path;
    RETURN NULL;
  END IF;

  base_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://imucfofvdwfyexdwrsfe.supabase.co'
  );

  SELECT net.http_post(
    url := base_url || '/functions/v1/' || path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := body
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM PUBLIC;

-- Daily market intelligence at 05:00 UTC (09:00 UAE)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('daily-industry-wire', 'daily-market-briefing');

    PERFORM cron.schedule(
      'daily-industry-wire',
      '0 5 * * *',
      $$SELECT public.invoke_edge_function('curate-industry-news');$$
    );

    PERFORM cron.schedule(
      'daily-market-briefing',
      '15 5 * * *',
      $$SELECT public.invoke_edge_function('refresh-market-briefing');$$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;
