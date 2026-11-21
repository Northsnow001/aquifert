-- Trade book: replaces Google Sheets "Aquifert Trade Database" as source of truth.
--
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once. Service-role only (same as desk_deals).
--
-- Improvements vs the workbook
--   * uuid PKs; human codes (rfq#067, S-001) are unique labels, not the row key
--   * phones and WeChat ids are text; never Excel numbers
--   * dates are timestamptz / date, not serial 46334
--   * quantity is numeric tonnes; "3000MT" is a display rule, not storage
--   * one quotes table for RFQ replies and weekly/broadcast rates
--   * RFQ completeness and mill-quote readiness are generated, not a sheet column
--   * no duplicated Status / Linked Request ID columns
--   * parties linked by id, not company-name string match
--   * channel_messages is the audit log (Twilio SID / WeChat msgid)
--   * Airtable Trades / test POs are not mixed into live RFQs
--   * bank details stay out of this migration — put them in desk-settings later
--
-- Status map from the sheet
--   New / Open            → collecting | open
--   Awaiting supplier     → rfq_sent
--   Awaiting Matt         → awaiting_desk
--   Sent to buyer         → indication_sent
--   Firm interest         → firm_interest
--   (new)                 → firm_offer_sent | won | lost | expired | closed
--
-- desk_deals.request_id should equal trade_rfqs.code after import.

create extension if not exists pgcrypto;

create or replace function public.trade_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.trade_digits(raw text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(raw, ''), '\D', '', 'g'), '');
$$;

-- E.164-ish: digits only, leading +. Import must pass a string, not 4.47E11.
create or replace function public.trade_e164(raw text)
returns text
language sql
immutable
as $$
  select case
    when public.trade_digits(raw) is null then null
    else '+' || public.trade_digits(raw)
  end;
$$;

create or replace function public.trade_qty_mt(raw text)
returns numeric
language sql
immutable
as $$
  select nullif(substring(replace(coalesce(raw, ''), ',', '') from '(\d+(?:\.\d+)?)'), '')::numeric;
$$;

-- ---------------------------------------------------------------------------
-- Counters
-- ---------------------------------------------------------------------------
create table if not exists public.trade_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.trade_settings (key, value) values
  ('next_rfq_number', '68'),
  ('next_buyer_number', '8'),
  ('next_supplier_number', '11'),
  ('next_forwarder_number', '1'),
  ('next_offer_number', '1')
on conflict (key) do nothing;

create or replace function public.trade_next_code(counter_key text, prefix text, pad int default 3)
returns text
language plpgsql
as $$
declare
  n int;
begin
  insert into public.trade_settings (key, value) values (counter_key, '1')
  on conflict (key) do nothing;

  update public.trade_settings
  set value = (value::int + 1)::text, updated_at = now()
  where key = counter_key
  returning value::int into n;

  return prefix || lpad(n::text, pad, '0');
end;
$$;

create or replace function public.trade_next_rfq_code()
returns text
language sql
as $$
  select public.trade_next_code('next_rfq_number', 'rfq#', 3);
$$;

-- ---------------------------------------------------------------------------
-- Reference lists (from Lists tab — packing / incoterm / payment stay data)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_list_options (
  list_key text not null,
  value text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  primary key (list_key, value)
);

insert into public.trade_list_options (list_key, value, sort_order) values
  ('incoterm', 'EXW', 1), ('incoterm', 'FCA', 2), ('incoterm', 'FOB', 3),
  ('incoterm', 'CFR', 4), ('incoterm', 'CFR FO', 5), ('incoterm', 'CFR FIO', 6),
  ('incoterm', 'CFR FILO', 7), ('incoterm', 'CFR FLIO', 8),
  ('incoterm', 'CIF', 9), ('incoterm', 'CIF FIO', 10), ('incoterm', 'CIF FILO', 11),
  ('incoterm', 'DAP', 12), ('incoterm', 'DDP', 13),
  ('channel', 'email', 1), ('channel', 'whatsapp', 2), ('channel', 'wechat', 3),
  ('channel', 'phone', 4), ('channel', 'other', 5),
  ('kyc_status', 'pending', 1), ('kyc_status', 'verified', 2), ('kyc_status', 'rejected', 3),
  ('party_status', 'active', 1), ('party_status', 'inactive', 2), ('party_status', 'dormant', 3),
  ('quote_kind', 'rfq', 1), ('quote_kind', 'weekly', 2), ('quote_kind', 'broadcast', 3),
  ('margin_type', 'fixed', 1), ('margin_type', 'percent', 2), ('margin_type', 'aq0_fee', 3),
  ('deal_type', 'standard', 1), ('deal_type', 'aq0', 2),
  ('shipment_type', 'single', 1), ('shipment_type', 'recurring', 2),
  ('freight_mode', 'bulk_vessel', 1), ('freight_mode', 'container', 2),
  ('rate_basis', 'per_container', 1), ('rate_basis', 'per_mt', 2), ('rate_basis', 'lump_sum', 3),
  ('rfq_status', 'collecting', 1), ('rfq_status', 'open', 2), ('rfq_status', 'rfq_sent', 3),
  ('rfq_status', 'awaiting_desk', 4), ('rfq_status', 'indication_sent', 5),
  ('rfq_status', 'negotiating', 6), ('rfq_status', 'firm_interest', 7),
  ('rfq_status', 'firm_offer_sent', 8), ('rfq_status', 'won', 9),
  ('rfq_status', 'lost', 10), ('rfq_status', 'expired', 11), ('rfq_status', 'closed', 12),
  ('quote_status', 'incomplete', 1), ('quote_status', 'received', 2),
  ('quote_status', 'firm', 3), ('quote_status', 'general_rate', 4),
  ('quote_status', 'no_offer', 5), ('quote_status', 'superseded', 6),
  ('packing', 'Bulk', 1), ('packing', 'Big Bags', 2), ('packing', '1000kg Big Bags', 3),
  ('packing', 'Big Bags (BBV)', 4), ('packing', 'Big Bags 2 bags per Pallet', 5),
  ('packing', 'Big Bags 1000-1300KG', 6), ('packing', '25kg Neutral', 7),
  ('packing', '25kg Neutral (Loose FCL)', 8), ('packing', '25kg Neutral in Big Bags (BBV)', 9),
  ('packing', '25kg Neutral Pallets', 10), ('packing', '25kg Bags Neutral marks', 11),
  ('packing', '25kg Buyer Design', 12), ('packing', '25kg Buyer Design (Loose FCL)', 13),
  ('packing', '25kg Buyer Design Pallets', 14), ('packing', '25kg Buyers design in Big Bags (BBV)', 15),
  ('packing', '25kg bags Buyers Marks', 16), ('packing', '50kg bags Neutral', 17),
  ('packing', '50kg Bags Buyer Design', 18), ('packing', '9.5kg Neutral in Big Bags (BBV)', 19),
  ('packing', 'IBC', 20)
on conflict (list_key, value) do nothing;

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------
create table if not exists public.trade_products (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  grade text,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists trade_products_name_key on public.trade_products (lower(name));

create table if not exists public.trade_buyers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  company_name text not null,
  contact_name text,
  email text,
  whatsapp_e164 text,
  wechat_id text,
  country text,
  kyc_status text not null default 'pending'
    check (kyc_status in ('pending', 'verified', 'rejected')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'dormant')),
  buyer_type text,
  job_title text,
  address text,
  partner_name text,
  partner_email text,
  products_of_interest text,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists trade_buyers_whatsapp_key
  on public.trade_buyers (whatsapp_e164) where whatsapp_e164 is not null;
create unique index if not exists trade_buyers_email_key
  on public.trade_buyers (lower(email)) where email is not null and email <> '';
create index if not exists trade_buyers_company_idx on public.trade_buyers (lower(company_name));

create table if not exists public.trade_suppliers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  company_name text not null,
  contact_name text,
  email text,
  whatsapp_e164 text,
  wechat_openid text,
  country text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'dormant')),
  origins text[] not null default '{}',
  load_ports text[] not null default '{}',
  products_supplied text,
  typical_payment_terms text,
  awaiting_reply text,
  last_rfq_code text,
  last_contact_at timestamptz,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists trade_suppliers_wechat_key
  on public.trade_suppliers (wechat_openid) where wechat_openid is not null;
create unique index if not exists trade_suppliers_email_key
  on public.trade_suppliers (lower(email)) where email is not null and email <> '';
create index if not exists trade_suppliers_company_idx on public.trade_suppliers (lower(company_name));

create table if not exists public.trade_forwarders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  company_name text not null,
  contact_name text,
  email text,
  whatsapp_e164 text,
  wechat_id text,
  country text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'dormant')),
  routes_covered text,
  vessel_types text,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists trade_forwarders_email_key
  on public.trade_forwarders (lower(email)) where email is not null and email <> '';

-- ---------------------------------------------------------------------------
-- RFQs (Buyer Requests)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_rfqs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  buyer_id uuid references public.trade_buyers (id) on delete set null,
  product_id uuid references public.trade_products (id) on delete set null,
  product_label text not null default '',
  specification text,
  quantity_mt numeric,
  shipment_type text check (shipment_type is null or shipment_type in ('single', 'recurring')),
  packing text,
  bag_specification text,
  destination_port text,
  destination_country text,
  incoterm text,
  shipment_window text,
  payment_terms text,
  inspection_company text,
  inspection_paid_by text,
  origin_preference text,
  discharge_rate text,
  currency text not null default 'USD',
  target_price numeric,
  validity_requested text,
  buyer_documents text,
  source_channel text not null default 'whatsapp'
    check (source_channel in ('email', 'whatsapp', 'wechat', 'phone', 'other')),
  status text not null default 'collecting'
    check (status in (
      'collecting', 'open', 'rfq_sent', 'awaiting_desk', 'indication_sent',
      'negotiating', 'firm_interest', 'firm_offer_sent', 'won', 'lost', 'expired', 'closed'
    )),
  raw_message text,
  notes text,
  week_start date,
  selected_quote_id uuid,
  selected_supplier_id uuid references public.trade_suppliers (id) on delete set null,
  supplier_unit_price numeric,
  margin_type text check (margin_type is null or margin_type in ('fixed', 'percent', 'aq0_fee')),
  margin_value numeric,
  buyer_unit_price numeric,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_rfqs_qty_positive check (quantity_mt is null or quantity_mt > 0)
);

-- Fan-out / mill-ask allowed only when the buyer side is usable.
alter table public.trade_rfqs
  drop constraint if exists trade_rfqs_ready_check;
alter table public.trade_rfqs
  add column if not exists buyer_ready boolean generated always as (
    coalesce(product_label, '') <> ''
    and quantity_mt is not null
    and coalesce(destination_port, destination_country, '') <> ''
  ) stored;

create index if not exists trade_rfqs_status_idx on public.trade_rfqs (status, created_at desc);
create index if not exists trade_rfqs_buyer_idx on public.trade_rfqs (buyer_id, created_at desc);
create index if not exists trade_rfqs_week_idx on public.trade_rfqs (week_start desc);

-- ---------------------------------------------------------------------------
-- Quotes (Supplier Offers + weekly suppliers_responses)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_quotes (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  kind text not null default 'rfq'
    check (kind in ('rfq', 'weekly', 'broadcast')),
  rfq_id uuid references public.trade_rfqs (id) on delete set null,
  supplier_id uuid references public.trade_suppliers (id) on delete set null,
  product_label text not null default '',
  specification text,
  unit_price numeric,
  currency text not null default 'USD',
  quantity_mt numeric,
  packing text,
  origin text,
  load_port text,
  destination_port text,
  incoterm text,
  delivery_window text,
  validity_until date,
  payment_terms text,
  prepayment_pct numeric,
  loading_rate text,
  inspection text,
  other_conditions text,
  status text not null default 'received'
    check (status in ('incomplete', 'received', 'firm', 'general_rate', 'no_offer', 'superseded')),
  source_channel text
    check (source_channel is null or source_channel in ('email', 'whatsapp', 'wechat', 'phone', 'other')),
  is_no_offer boolean not null default false,
  week_start date,
  broadcast_ref text,
  raw_message text,
  extras jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mill RFQ quotes: price, product, qty, load port required before the row is "ready"
-- (same rule as WF2 merge_rfq_offer). Weekly rates skip load_port.
alter table public.trade_quotes drop column if exists ready;
alter table public.trade_quotes
  add column if not exists ready boolean generated always as (
    case
      when is_no_offer then true
      when kind = 'rfq' then (
        unit_price is not null and unit_price > 0
        and coalesce(product_label, '') <> ''
        and quantity_mt is not null
        and coalesce(load_port, '') <> ''
      )
      else (unit_price is not null and unit_price > 0 and coalesce(product_label, '') <> '')
    end
  ) stored;

create index if not exists trade_quotes_rfq_idx on public.trade_quotes (rfq_id, received_at desc);
create index if not exists trade_quotes_supplier_idx on public.trade_quotes (supplier_id, received_at desc);
create index if not exists trade_quotes_kind_week_idx on public.trade_quotes (kind, week_start desc);
create index if not exists trade_quotes_ready_idx on public.trade_quotes (ready, kind);

-- One live RFQ quote per mill per RFQ; updates supersede rather than duplicate the shortlist.
create unique index if not exists trade_quotes_one_live_rfq
  on public.trade_quotes (supplier_id, rfq_id)
  where kind = 'rfq' and rfq_id is not null and supplier_id is not null
    and status not in ('superseded', 'no_offer');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trade_rfqs_selected_quote_fk'
  ) then
    alter table public.trade_rfqs
      add constraint trade_rfqs_selected_quote_fk
      foreign key (selected_quote_id) references public.trade_quotes (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Freight
-- ---------------------------------------------------------------------------
create table if not exists public.trade_freight_quotes (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'rfq' check (kind in ('rfq', 'weekly')),
  rfq_id uuid references public.trade_rfqs (id) on delete set null,
  forwarder_id uuid references public.trade_forwarders (id) on delete set null,
  mode text check (mode is null or mode in ('bulk_vessel', 'container')),
  container_type text,
  origin_port text,
  destination_port text,
  route text,
  rate numeric,
  rate_basis text check (rate_basis is null or rate_basis in ('per_container', 'per_mt', 'lump_sum')),
  mt_per_container numeric,
  rate_per_mt numeric,
  insurance_per_mt numeric,
  currency text not null default 'USD',
  transit_days text,
  validity_until date,
  conditions text,
  is_no_offer boolean not null default false,
  week_start date,
  source_channel text,
  raw_message text,
  extras jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trade_freight_rfq_idx on public.trade_freight_quotes (rfq_id, received_at desc);

-- ---------------------------------------------------------------------------
-- Channel audit (replaces scattering raw_body across sheets)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('in', 'out')),
  channel text not null check (channel in ('email', 'whatsapp', 'wechat', 'phone', 'other')),
  buyer_id uuid references public.trade_buyers (id) on delete set null,
  supplier_id uuid references public.trade_suppliers (id) on delete set null,
  forwarder_id uuid references public.trade_forwarders (id) on delete set null,
  rfq_id uuid references public.trade_rfqs (id) on delete set null,
  quote_id uuid references public.trade_quotes (id) on delete set null,
  from_address text,
  to_address text,
  provider_message_id text,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists trade_messages_provider_key
  on public.trade_messages (channel, provider_message_id)
  where provider_message_id is not null;
create index if not exists trade_messages_rfq_idx on public.trade_messages (rfq_id, created_at desc);
create index if not exists trade_messages_supplier_idx on public.trade_messages (supplier_id, created_at desc);
create index if not exists trade_messages_buyer_idx on public.trade_messages (buyer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Documents (Drive links become Storage paths later)
-- ---------------------------------------------------------------------------
create table if not exists public.trade_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null
    check (doc_type in (
      'firm_offer', 'proforma', 'purchase_order', 'sales_contract',
      'commercial_invoice', 'packing_list', 'bl', 'coa', 'coo', 'other'
    )),
  doc_number text,
  version int not null default 1,
  rfq_id uuid references public.trade_rfqs (id) on delete set null,
  quote_id uuid references public.trade_quotes (id) on delete set null,
  counterparty_name text,
  counterparty_kind text check (counterparty_kind is null or counterparty_kind in ('buyer', 'supplier', 'forwarder')),
  currency text,
  total_amount numeric,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'sent', 'superseded', 'void')),
  storage_path text,
  data jsonb not null default '{}'::jsonb,
  warnings text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trade_documents_rfq_idx on public.trade_documents (rfq_id, created_at desc);

-- Execution / logistics (Airtable Trades migrate here later; not the RFQ spine)
create table if not exists public.trade_shipments (
  id uuid primary key default gen_random_uuid(),
  legacy_trade_code text unique,
  rfq_id uuid references public.trade_rfqs (id) on delete set null,
  status text not null default 'pending'
    check (status in (
      'pending', 'contract_negotiation', 'contract_signed', 'loading_pending',
      'loading', 'shipped', 'delivered', 'cancelled'
    )),
  pol text,
  pod text,
  etd date,
  eta date,
  lsd date,
  packing text,
  shipping_mode text,
  forwarder_id uuid references public.trade_forwarders (id) on delete set null,
  carrier text,
  booking_ref text,
  inspection text,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'trade_settings', 'trade_products', 'trade_buyers', 'trade_suppliers', 'trade_forwarders',
    'trade_rfqs', 'trade_quotes', 'trade_freight_quotes', 'trade_documents', 'trade_shipments'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.trade_set_updated_at()',
      t || '_updated', t
    );
  end loop;
end $$;

-- Keep mill last-contact in sync when a quote lands
create or replace function public.trade_touch_supplier_from_quote()
returns trigger
language plpgsql
as $$
begin
  if new.supplier_id is not null then
    update public.trade_suppliers
    set
      last_contact_at = coalesce(new.received_at, now()),
      last_rfq_code = coalesce((select code from public.trade_rfqs where id = new.rfq_id), last_rfq_code),
      awaiting_reply = case
        when new.kind = 'rfq' and new.ready then null
        else awaiting_reply
      end,
      updated_at = now()
    where id = new.supplier_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trade_quotes_touch_supplier on public.trade_quotes;
create trigger trade_quotes_touch_supplier
  after insert or update of ready, rfq_id, supplier_id on public.trade_quotes
  for each row execute function public.trade_touch_supplier_from_quote();

-- Incomplete RFQ mill quotes must not sit as firm/received
create or replace function public.trade_quotes_enforce_ready()
returns trigger
language plpgsql
as $$
begin
  if new.is_no_offer then
    new.status := 'no_offer';
    return new;
  end if;
  if new.kind = 'rfq' then
    if new.unit_price is not null and new.unit_price > 0
      and coalesce(new.product_label, '') <> ''
      and new.quantity_mt is not null
      and coalesce(new.load_port, '') <> ''
    then
      if new.status in ('incomplete', 'received') then
        new.status := 'firm';
      end if;
    else
      new.status := 'incomplete';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trade_quotes_enforce_ready on public.trade_quotes;
create trigger trade_quotes_enforce_ready
  before insert or update of unit_price, product_label, quantity_mt, load_port, kind, is_no_offer, status
  on public.trade_quotes
  for each row execute function public.trade_quotes_enforce_ready();

-- Desk lookup
create index if not exists desk_deals_request_id_idx on public.desk_deals (request_id);

-- Board for Matt / admin (not a sheet clone)
create or replace view public.trade_rfq_board as
select
  r.id,
  r.code,
  r.status,
  r.buyer_ready,
  b.company_name as buyer_company,
  b.contact_name as buyer_contact,
  b.whatsapp_e164,
  r.product_label,
  r.quantity_mt,
  r.packing,
  r.incoterm,
  r.destination_port,
  r.destination_country,
  r.shipment_window,
  r.buyer_unit_price,
  r.supplier_unit_price,
  r.margin_value,
  r.margin_type,
  s.company_name as selected_supplier,
  (
    select count(*) from public.trade_quotes q
    where q.rfq_id = r.id and q.kind = 'rfq' and q.ready and q.status not in ('superseded', 'no_offer')
  ) as ready_quote_count,
  r.created_at,
  r.updated_at
from public.trade_rfqs r
left join public.trade_buyers b on b.id = r.buyer_id
left join public.trade_suppliers s on s.id = r.selected_supplier_id;

-- ---------------------------------------------------------------------------
-- Lock down
-- ---------------------------------------------------------------------------
alter table public.trade_settings enable row level security;
alter table public.trade_list_options enable row level security;
alter table public.trade_products enable row level security;
alter table public.trade_buyers enable row level security;
alter table public.trade_suppliers enable row level security;
alter table public.trade_forwarders enable row level security;
alter table public.trade_rfqs enable row level security;
alter table public.trade_quotes enable row level security;
alter table public.trade_freight_quotes enable row level security;
alter table public.trade_messages enable row level security;
alter table public.trade_documents enable row level security;
alter table public.trade_shipments enable row level security;

revoke all on
  public.trade_settings, public.trade_list_options, public.trade_products,
  public.trade_buyers, public.trade_suppliers, public.trade_forwarders,
  public.trade_rfqs, public.trade_quotes, public.trade_freight_quotes,
  public.trade_messages, public.trade_documents, public.trade_shipments
from anon, authenticated;

revoke all on public.trade_rfq_board from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('trade-docs', 'trade-docs', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
