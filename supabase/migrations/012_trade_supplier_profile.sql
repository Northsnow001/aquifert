-- Mill profile fields used on the admin Add supplier form.
alter table public.trade_suppliers add column if not exists address text;
