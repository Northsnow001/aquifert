-- Aquifert admin data: everything the admin dashboard and the member hub read and write.
--
-- Admin-edited configuration lives in app_documents, one JSON document per module:
--   hub-content      Telex, indicators, hedge tables, freight board, tools commentary,
--                    library collections and file records, Aquibot settings
--   freight-desk     Ports, fixtures, bunker prices, BDI, calculator settings
--   netback-desk     Benchmarks, price history, import duties, netback settings
--   desk-settings    Order Desk and Aquifert Zero emails, member sign-up rules
--   wp-import-state  / wp-import-export   WordPress import staging
--
-- Rows that members and visitors create at the same time get their own tables, so
-- concurrent writes never overwrite each other. Each keeps the full record in `data`,
-- with the columns the app filters on alongside it.
--
-- Library files go to the private Storage bucket `library`, at <file id>/<file name>.
--
-- Every table is reached only through the service-role key on the server, so RLS is
-- enabled with no policies for anon or authenticated users. Safe to run more than once.

create table if not exists public.app_documents (
  key text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.freight_calc_logs (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists freight_calc_logs_at_idx on public.freight_calc_logs (at desc);
create index if not exists freight_calc_logs_user_idx on public.freight_calc_logs (user_id, at desc);

create table if not exists public.freight_debug_logs (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists freight_debug_logs_at_idx on public.freight_debug_logs (at desc);

create table if not exists public.netback_calc_logs (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists netback_calc_logs_at_idx on public.netback_calc_logs (at desc);
create index if not exists netback_calc_logs_user_idx on public.netback_calc_logs (user_id, at desc);

-- Contact and Order Desk messages as the admin Enquiries page shows them.
create table if not exists public.desk_inbox (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists desk_inbox_at_idx on public.desk_inbox (at desc);

create table if not exists public.zero_registrations (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists zero_registrations_at_idx on public.zero_registrations (at desc);
create index if not exists zero_registrations_user_idx on public.zero_registrations (user_id);
create index if not exists zero_registrations_email_idx on public.zero_registrations (email);

-- One row per banned address; the id is the lowercased email.
create table if not exists public.member_bans (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists member_bans_user_idx on public.member_bans (user_id);
create index if not exists member_bans_email_idx on public.member_bans (email);

create table if not exists public.member_access_events (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists member_access_events_at_idx on public.member_access_events (at desc);

create table if not exists public.email_outbox (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  data jsonb not null
);
create index if not exists email_outbox_at_idx on public.email_outbox (at desc);

alter table public.app_documents enable row level security;
alter table public.freight_calc_logs enable row level security;
alter table public.freight_debug_logs enable row level security;
alter table public.netback_calc_logs enable row level security;
alter table public.desk_inbox enable row level security;
alter table public.zero_registrations enable row level security;
alter table public.member_bans enable row level security;
alter table public.member_access_events enable row level security;
alter table public.email_outbox enable row level security;

revoke all on public.app_documents, public.freight_calc_logs, public.freight_debug_logs, public.netback_calc_logs,
  public.desk_inbox, public.zero_registrations, public.member_bans, public.member_access_events, public.email_outbox
  from anon, authenticated;

-- Private bucket: members download through short-lived signed links after the app checks
-- their plan, and admins upload through signed upload links. 50 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
