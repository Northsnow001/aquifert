create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  plan text not null default 'core' check (plan in ('core', 'growth', 'enterprise')),
  created_at timestamptz not null default now()
);

create table if not exists public.ports (
  code text primary key,
  name text not null,
  country text not null,
  region text not null,
  lat double precision not null,
  lon double precision not null
);

create table if not exists public.urea_benchmarks (
  key text primary key,
  label text not null,
  port text not null,
  region text not null,
  fob numeric not null,
  lat double precision not null,
  lon double precision not null
);

create table if not exists public.import_duties (
  country text primary key,
  rate numeric not null default 0,
  active boolean not null default false,
  afrmm boolean not null default false,
  note text
);

create table if not exists public.bunker_prices (
  city text primary key,
  price numeric not null
);

create table if not exists public.market_inputs (
  key text primary key,
  value numeric not null
);

create table if not exists public.freight_fixtures (
  id bigint generated always as identity primary key,
  load_code text,
  discharge_code text,
  rate_low numeric not null,
  rate_high numeric not null,
  cargo_min_kt numeric,
  cargo_max_kt numeric,
  fixture_date date,
  status text not null default 'active'
);

create table if not exists public.calculation_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  calculator text not null check (calculator in ('freight', 'netback')),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

-- Shared with the marketing contact form. On the existing Aquifert project this
-- table already exists (channel NOT NULL, camelCase "createdAt"), so only the
-- channel default is added there.
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  channel text not null default 'message',
  name text,
  email text not null,
  company text,
  message text not null,
  status text not null default 'NEW',
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_messages' and column_name = 'channel'
  ) then
    alter table public.contact_messages alter column channel set default 'message';
  end if;
end $$;

create table if not exists public.order_enquiries (
  id bigint generated always as identity primary key,
  product text not null,
  quantity text,
  origin text,
  destination text,
  incoterm text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.ports enable row level security;
alter table public.urea_benchmarks enable row level security;
alter table public.import_duties enable row level security;
alter table public.bunker_prices enable row level security;
alter table public.market_inputs enable row level security;
alter table public.freight_fixtures enable row level security;
alter table public.calculation_logs enable row level security;
alter table public.contact_messages enable row level security;
alter table public.order_enquiries enable row level security;

drop policy if exists "members read reference" on public.ports;
create policy "members read reference" on public.ports for select to authenticated using (true);
drop policy if exists "members read benchmarks" on public.urea_benchmarks;
create policy "members read benchmarks" on public.urea_benchmarks for select to authenticated using (true);
drop policy if exists "members read duties" on public.import_duties;
create policy "members read duties" on public.import_duties for select to authenticated using (true);
drop policy if exists "members read bunkers" on public.bunker_prices;
create policy "members read bunkers" on public.bunker_prices for select to authenticated using (true);
drop policy if exists "members read market" on public.market_inputs;
create policy "members read market" on public.market_inputs for select to authenticated using (true);
drop policy if exists "members read fixtures" on public.freight_fixtures;
create policy "members read fixtures" on public.freight_fixtures for select to authenticated using (true);
drop policy if exists "members read own profile" on public.profiles;
create policy "members read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
drop policy if exists "members insert own logs" on public.calculation_logs;
create policy "members insert own logs" on public.calculation_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "members read own logs" on public.calculation_logs;
create policy "members read own logs" on public.calculation_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "members insert contact" on public.contact_messages;
create policy "members insert contact" on public.contact_messages for insert to authenticated with check (true);
drop policy if exists "members insert orders" on public.order_enquiries;
create policy "members insert orders" on public.order_enquiries for insert to authenticated with check (true);

-- Distinct names: the existing project already uses on_auth_user_created /
-- handle_supabase_auth_user() to sync public.users, which must keep working.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, plan)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    'core'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill profiles for accounts created before this migration.
insert into public.profiles (id, full_name, plan)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  'core'
from auth.users u
on conflict (id) do nothing;
