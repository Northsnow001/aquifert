-- Onboarding fields for WeChat invite (WF1), admin read for the live desk,
-- and realtime so the suppliers board updates without a refresh.
-- Paste into Supabase → SQL Editor after 010_trade_book.sql. Safe to re-run.

alter table public.trade_suppliers
  add column if not exists onboarding_status text not null default 'to_invite';

update public.trade_suppliers
set onboarding_status = case
  when wechat_openid is not null and wechat_openid <> '' then 'subscribed'
  else onboarding_status
end
where onboarding_status = 'to_invite' and wechat_openid is not null and wechat_openid <> '';

alter table public.trade_suppliers drop constraint if exists trade_suppliers_onboarding_check;
alter table public.trade_suppliers
  add constraint trade_suppliers_onboarding_check
  check (onboarding_status in ('to_invite', 'invited', 'subscribed', 'skipped'));

alter table public.trade_suppliers add column if not exists qr_ticket text;
alter table public.trade_suppliers add column if not exists qr_scene text;
alter table public.trade_suppliers add column if not exists invited_at timestamptz;
alter table public.trade_suppliers add column if not exists invited_email text;

create index if not exists trade_suppliers_onboarding_idx
  on public.trade_suppliers (onboarding_status, updated_at desc);

insert into public.trade_list_options (list_key, value, sort_order) values
  ('onboarding_status', 'to_invite', 1),
  ('onboarding_status', 'invited', 2),
  ('onboarding_status', 'subscribed', 3),
  ('onboarding_status', 'skipped', 4)
on conflict (list_key, value) do nothing;

-- Cached Official Account token (shared across QR / template / custom sends).
insert into public.trade_settings (key, value) values
  ('wechat_access_token', ''),
  ('wechat_token_expires_at', '')
on conflict (key) do nothing;

create or replace function public.trade_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin';
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'trade_list_options', 'trade_products', 'trade_buyers', 'trade_suppliers',
    'trade_forwarders', 'trade_rfqs', 'trade_quotes', 'trade_freight_quotes', 'trade_messages',
    'trade_documents', 'trade_shipments'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.trade_is_admin())',
      t || '_admin_read', t
    );
  end loop;
end $$;

alter view public.trade_rfq_board set (security_invoker = true);

revoke all on public.trade_settings from authenticated, anon;

grant select on
  public.trade_list_options, public.trade_products,
  public.trade_buyers, public.trade_suppliers, public.trade_forwarders,
  public.trade_rfqs, public.trade_quotes, public.trade_freight_quotes,
  public.trade_messages, public.trade_documents, public.trade_shipments,
  public.trade_rfq_board
to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.trade_suppliers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.trade_buyers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.trade_rfqs;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.trade_quotes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.trade_freight_quotes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.trade_messages;
  exception when duplicate_object then null;
  end;
end $$;
