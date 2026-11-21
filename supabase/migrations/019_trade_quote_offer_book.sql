-- Offer IDs for live WeChat quotes, and treat dest-term quotes as ready without a load port.

drop trigger if exists trade_quotes_touch_supplier on public.trade_quotes;
drop trigger if exists trade_quotes_enforce_ready on public.trade_quotes;
drop view if exists public.trade_rfq_board;
drop index if exists public.trade_quotes_ready_idx;
alter table public.trade_quotes drop column if exists ready;
alter table public.trade_quotes
  add column if not exists ready boolean generated always as (
    case
      when is_no_offer then true
      when kind = 'rfq' then (
        unit_price is not null and unit_price > 0
        and coalesce(product_label, '') <> ''
        and quantity_mt is not null
        and (
          coalesce(load_port, '') <> ''
          or (
            coalesce(destination_port, '') <> ''
            and upper(coalesce(incoterm, '')) ~ '^(CFR|CIF|CPT|CIP|DAP|DPU|DDP)'
          )
        )
      )
      else (unit_price is not null and unit_price > 0 and coalesce(product_label, '') <> '')
    end
  ) stored;

create index if not exists trade_quotes_ready_idx on public.trade_quotes (ready, kind);

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
      and (
        coalesce(new.load_port, '') <> ''
        or (
          coalesce(new.destination_port, '') <> ''
          and upper(coalesce(new.incoterm, '')) ~ '^(CFR|CIF|CPT|CIP|DAP|DPU|DDP)'
        )
      )
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
  before insert or update of unit_price, product_label, quantity_mt, load_port, destination_port, incoterm, kind, is_no_offer, status
  on public.trade_quotes
  for each row execute function public.trade_quotes_enforce_ready();

drop trigger if exists trade_quotes_touch_supplier on public.trade_quotes;
create trigger trade_quotes_touch_supplier
  after insert or update of ready, rfq_id, supplier_id on public.trade_quotes
  for each row execute function public.trade_touch_supplier_from_quote();

with numbered as (
  select
    id,
    'OFF-' || to_char(received_at at time zone 'utc', 'YYYYMMDDHH24MISS')
      || '-' || (row_number() over (
        partition by to_char(received_at at time zone 'utc', 'YYYYMMDDHH24MISS')
        order by created_at, id
      ) - 1)::text as next_code
  from public.trade_quotes
  where code is null or btrim(code) = ''
)
update public.trade_quotes q
set code = n.next_code
from numbered n
where q.id = n.id
  and not exists (select 1 from public.trade_quotes x where x.code = n.next_code);

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
