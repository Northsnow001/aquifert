-- Sheets in the workbook that were not a first-class table in 010:
-- Offers to Buyers, Deal Pricing, Leads. Safe to re-run.

create table if not exists public.trade_leads (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  buyer_name text,
  status text,
  next_action text,
  next_action_at date,
  expected_volume_mt numeric,
  expected_margin_pct numeric,
  enquiry_code text,
  comments text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_buyer_offers (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  offer_date date,
  status text,
  enquiry_code text,
  quote_code text,
  buyer_name text,
  product_label text,
  quantity_mt numeric,
  packing text,
  incoterm text,
  port text,
  payment_terms text,
  shipping_month text,
  supplier_unit_price numeric,
  offered_unit_price numeric,
  margin_per_mt numeric,
  margin_pct numeric,
  total_margin numeric,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_deal_pricing (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  rfq_code text,
  buyer_company text,
  deal_type text,
  selected_offer_code text,
  supplier_name text,
  seller_unit_price numeric,
  seller_incoterm text,
  selected_freight_code text,
  freight_per_mt numeric,
  insurance_per_mt numeric,
  landed_cost_per_mt numeric,
  margin_type text,
  margin_value numeric,
  margin_per_mt numeric,
  floor_per_mt numeric,
  buyer_unit_price numeric,
  buyer_incoterm text,
  currency text not null default 'USD',
  quantity_mt numeric,
  notes text,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['trade_leads', 'trade_buyer_offers', 'trade_deal_pricing']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.trade_set_updated_at()',
      t || '_updated', t
    );
  end loop;
end $$;

alter table public.trade_leads enable row level security;
alter table public.trade_buyer_offers enable row level security;
alter table public.trade_deal_pricing enable row level security;

revoke all on public.trade_leads, public.trade_buyer_offers, public.trade_deal_pricing
from anon, authenticated;
