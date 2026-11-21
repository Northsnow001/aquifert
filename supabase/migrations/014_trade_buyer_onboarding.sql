-- Buyer WhatsApp onboarding (workflow 1b). Safe to re-run.

alter table public.trade_buyers add column if not exists onboarding_status text;
alter table public.trade_buyers add column if not exists invited_at timestamptz;
alter table public.trade_buyers add column if not exists invited_email text;
alter table public.trade_buyers add column if not exists last_contact_at timestamptz;
alter table public.trade_buyers add column if not exists awaiting_reply text;

update public.trade_buyers
set onboarding_status = case
  when coalesce(whatsapp_e164, '') <> '' then 'subscribed'
  when coalesce(onboarding_status, '') <> '' then onboarding_status
  else 'to_invite'
end
where onboarding_status is null or onboarding_status = '';

alter table public.trade_buyers alter column onboarding_status set default 'to_invite';
alter table public.trade_buyers alter column onboarding_status set not null;

alter table public.trade_buyers drop constraint if exists trade_buyers_onboarding_check;
alter table public.trade_buyers
  add constraint trade_buyers_onboarding_check
  check (onboarding_status in ('to_invite', 'invited', 'subscribed', 'skipped'));
