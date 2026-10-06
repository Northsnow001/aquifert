-- TELEX read tracking: one row per member visit to a flash's full view. The browser reports
-- active seconds (tab visible, reader not idle) and how far down the story they scrolled; a
-- visit counts as read once it reaches 10 active seconds, and read_at records that moment.
--
-- Same rules as 003: the full record in `data`, reached only through the service-role key on
-- the server. telex_id and read_at mirror the record so the desk can query reads directly in
-- Supabase. Safe to run more than once.

create table if not exists public.telex_reads (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  telex_id text not null,
  read_at timestamptz,
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index if not exists telex_reads_at_idx on public.telex_reads (at desc);
create index if not exists telex_reads_user_idx on public.telex_reads (user_id, at desc);
create index if not exists telex_reads_telex_idx on public.telex_reads (telex_id, at desc);

alter table public.telex_reads enable row level security;
revoke all on public.telex_reads from anon, authenticated;
