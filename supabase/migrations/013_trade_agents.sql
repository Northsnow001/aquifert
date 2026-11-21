-- Named WeChat agents (prompts editable in admin). Safe to re-run.

create table if not exists public.trade_agents (
  key text primary key,
  name text not null,
  description text not null default '',
  system_prompt text not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trade_agents_updated on public.trade_agents;
create trigger trade_agents_updated
  before update on public.trade_agents
  for each row execute function public.trade_set_updated_at();

alter table public.trade_agents enable row level security;
drop policy if exists trade_agents_admin_read on public.trade_agents;
create policy trade_agents_admin_read on public.trade_agents
  for select to authenticated using (public.trade_is_admin());

revoke all on public.trade_agents from anon, authenticated;
grant select on public.trade_agents to authenticated;
