-- Card subscriptions. Members cannot change these columns; the Stripe webhook uses the service role.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists membership_tier text;

alter table public.profiles drop constraint if exists profiles_membership_tier_check;
alter table public.profiles
  add constraint profiles_membership_tier_check
  check (membership_tier is null or membership_tier in ('sprout', 'harvest', 'scale'));

create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create or replace function public.protect_profile_billing()
returns trigger
language plpgsql
as $$
begin
  -- Logged-in members may edit their name. Plan and Stripe ids change only from the service role or SQL.
  if coalesce(auth.role(), '') = 'authenticated'
    and (
      new.plan is distinct from old.plan
      or new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.membership_tier is distinct from old.membership_tier
    )
  then
    raise exception 'Plan and billing are updated from Stripe';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing on public.profiles;
create trigger protect_profile_billing
  before update on public.profiles
  for each row execute function public.protect_profile_billing();
