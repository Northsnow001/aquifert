-- Per-supplier fan-out of a buyer request (workflow 7).
create table if not exists public.trade_rfq_asks (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.trade_rfqs (id) on delete cascade,
  supplier_id uuid not null references public.trade_suppliers (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'skipped', 'sent', 'failed', 'quoted', 'no_offer')),
  error text,
  sent_at timestamptz,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);
create index if not exists trade_rfq_asks_rfq_idx on public.trade_rfq_asks (rfq_id, status);
create index if not exists trade_rfq_asks_supplier_idx on public.trade_rfq_asks (supplier_id, updated_at desc);

alter table public.trade_rfq_asks enable row level security;
revoke all on public.trade_rfq_asks from anon, authenticated;
