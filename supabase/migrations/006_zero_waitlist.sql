-- Aquifert Zero waitlist: the Register interest form on the hub. Members either join the
-- waitlist or ask for a call for early discounted access.
--
-- Same rules as 003: the full record in `data`, reached only through the service-role key
-- on the server. The columns beside it mirror the record so the desk can filter and export
-- straight from Supabase. Safe to run more than once.

create table if not exists public.zero_waitlist (
  id text primary key,
  at timestamptz not null,
  user_id text,
  email text,
  name text,
  company text,
  intent text not null default 'waitlist' check (intent in ('waitlist', 'call')),
  programme text,
  product text,
  annual_volume text,
  phone text,
  call_date date,
  call_window text,
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'offered', 'declined')),
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index if not exists zero_waitlist_at_idx on public.zero_waitlist (at desc);
create index if not exists zero_waitlist_user_idx on public.zero_waitlist (user_id);
create index if not exists zero_waitlist_email_idx on public.zero_waitlist (email);
create index if not exists zero_waitlist_intent_idx on public.zero_waitlist (intent, status);

alter table public.zero_waitlist enable row level security;
revoke all on public.zero_waitlist from anon, authenticated;

-- Registrations made before the waitlist existed move across as waitlist sign-ups.
-- zero_registrations itself is left in place.
do $$
begin
  if to_regclass('public.zero_registrations') is not null then
    insert into public.zero_waitlist (id, at, user_id, email, name, company, intent, programme, product, annual_volume, status, data)
    select
      r.id,
      r.at,
      r.user_id,
      r.email,
      nullif(r.data->>'name', ''),
      nullif(r.data->>'company', ''),
      'waitlist',
      nullif(r.data->>'programme', ''),
      nullif(r.data->>'product', ''),
      nullif(r.data->>'annualVolume', ''),
      case when r.data->>'status' in ('new', 'contacted', 'scheduled', 'offered', 'declined') then r.data->>'status' else 'new' end,
      r.data
    from public.zero_registrations r
    on conflict (id) do nothing;
  end if;
end $$;
