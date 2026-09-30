-- AQ1 and AQ Analytics modules: rows members create from the hub.
--
-- Desk-written content (analysis notes, market price series, community call schedule,
-- supply and demand balances, briefing issues, which plan unlocks each module, AQ1
-- allowances) lives in app_documents under the key 'aq-modules', so it needs no table.
--
-- Same shape and rules as 003: the full record in `data`, filter columns alongside,
-- reached only through the service-role key. Safe to run more than once.

-- A table with one of these names but a different shape (for example from an earlier
-- prototype) is kept, renamed to <name>_legacy_<timestamp> with its indexes, so the
-- tables below can be created. Nothing is deleted.
do $$
declare
  t text;
  idx record;
  stamp text := to_char(now(), 'YYYYMMDDHH24MISS');
begin
  foreach t in array array['nitrogen_reports', 'community_call_registrations', 'member_alerts', 'member_prefs', 'membership_requests'] loop
    if to_regclass('public.' || t) is not null and (
      select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name in ('id', 'at', 'user_id', 'email', 'data')
    ) < 5 then
      for idx in select indexname from pg_indexes where schemaname = 'public' and tablename = t loop
        execute format('alter index public.%I rename to %I', idx.indexname, left(idx.indexname, 40) || '_legacy_' || stamp);
      end loop;
      execute format('alter table public.%I rename to %I', t, t || '_legacy_' || stamp);
      raise notice 'Kept the existing % as %_legacy_%', t, t, stamp;
    end if;
  end loop;
end $$;

create table if not exists public.nitrogen_reports (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists nitrogen_reports_user_idx on public.nitrogen_reports (user_id, at desc);
create index if not exists nitrogen_reports_at_idx on public.nitrogen_reports (at desc);

create table if not exists public.community_call_registrations (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists community_call_registrations_user_idx on public.community_call_registrations (user_id, at desc);
create index if not exists community_call_registrations_at_idx on public.community_call_registrations (at desc);

create table if not exists public.member_alerts (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists member_alerts_user_idx on public.member_alerts (user_id, at desc);

-- One row per member; the id is the account id.
create table if not exists public.member_prefs (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists member_prefs_user_idx on public.member_prefs (user_id);

create table if not exists public.membership_requests (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists membership_requests_at_idx on public.membership_requests (at desc);
create index if not exists membership_requests_user_idx on public.membership_requests (user_id, at desc);

alter table public.nitrogen_reports enable row level security;
alter table public.community_call_registrations enable row level security;
alter table public.member_alerts enable row level security;
alter table public.member_prefs enable row level security;
alter table public.membership_requests enable row level security;

revoke all on public.nitrogen_reports, public.community_call_registrations, public.member_alerts,
  public.member_prefs, public.membership_requests
  from anon, authenticated;
