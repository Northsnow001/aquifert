-- Matt's HITL shortlists (WF8 first-3) and buyer WhatsApp thread.
-- Full deal lives in `data`; status / request_id / phone are columns for the desk.
-- Same rules as 003: service-role only. Safe to run more than once.

create table if not exists public.desk_deals (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  status text,
  request_id text,
  product text,
  buyer_phone text,
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index if not exists desk_deals_at_idx on public.desk_deals (at desc);
create index if not exists desk_deals_status_idx on public.desk_deals (status, at desc);

alter table public.desk_deals enable row level security;
revoke all on public.desk_deals from anon, authenticated;
