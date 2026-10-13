-- Background indexing for the Aquibot knowledge base: every 5 minutes Supabase calls the site's
-- /api/aquibot/index-pending endpoint, which indexes up to 10 new, changed or failed sources
-- (failures are retried after six hours). Uploads and telex saves still index straight away; this
-- clears the backlog and catches anything that was missed.
--
-- Before running this file:
--   1. In Vercel, set AQUIBOT_INDEX_SECRET to a long random value and redeploy.
--   2. Store the same value in the Supabase Vault, once, in the SQL editor (do not commit it):
--        select vault.create_secret('<the same value>', 'aquibot_index_secret');
--      To change it later:
--        select vault.update_secret((select id from vault.secrets where name = 'aquibot_index_secret'), '<new value>');
--
-- Safe to run more than once: scheduling under the same name replaces the job.
--
-- Useful checks:
--   select * from cron.job_run_details order by start_time desc limit 10;          -- did the job fire
--   select status_code, content, created from net._http_response order by created desc limit 10;  -- what the site replied
--   select cron.unschedule('aquibot-index-pending');                                -- stop it

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'aquibot-index-pending',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://www.aquifert.com/api/aquibot/index-pending?limit=10',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'aquibot_index_secret')
    ),
    timeout_milliseconds := 300000
  );
  $$
);
