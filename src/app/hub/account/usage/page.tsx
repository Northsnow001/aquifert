import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Archive, ArrowLeftRight, ArrowRight, Bot, Calculator, CalendarClock, Crown, FileStack, FlaskConical, Lock, Newspaper, PhoneCall, Radio, Unlock } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { AccountIntro, Panel, Tag } from "@/components/hub/kit";
import { AllowanceRow, IncludedRow } from "@/components/hub/plans/allowance-row";
import { planAllowances } from "@/components/hub/plans/load";
import { longDay, PLAN_PRICE, shortDay } from "@/components/hub/plans/shared";
import { usageFor } from "@/lib/aquibot-engine/chat";
import { getHubAccess } from "@/lib/aq-modules/access";
import { listNitrogenReports, nitrogenReportsThisMonth } from "@/lib/aq-modules/members";
import { MODULES, PLAN_LABEL } from "@/lib/aq-modules/types";
import { monthlyUsage, nextReset } from "@/lib/freight-desk/store";
import { getHubContent } from "@/lib/hub-content";
import { netbackUsage } from "@/lib/netback-desk/store";

export const metadata: Metadata = { title: "Plan & Usage" };
export const dynamic = "force-dynamic";

export default async function PlanUsagePage() {
  const { user, admin, modules, can } = await getHubAccess();
  const [allowances, content, nitrogenUsed, saved, freightUsed, netbackUsed] = await Promise.all([
    planAllowances(modules),
    getHubContent(),
    nitrogenReportsThisMonth(user),
    listNitrogenReports(user, 500),
    monthlyUsage(user.id),
    netbackUsage(user.id),
  ]);
  const aquibotUsed = await usageFor({ user, isAdmin: admin }, content.aquibot)
    .then((usage) => usage.used)
    .catch(() => 0);

  const mine = allowances[user.plan];
  const limit = (value: number) => (admin ? 0 : value);
  const resetDate = nextReset();
  const resets = shortDay(resetDate);

  return (
    <div className="flex flex-col gap-6 pb-2">
      <AccountIntro description={`Metered allowances reset on ${longDay(resetDate)}. Reading is always unlimited.`} />

      <section className="aq-card aq-rise relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-100/60 blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="aq-chip aq-float flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-teal-700">Current plan</p>
              <p className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {PLAN_LABEL[user.plan]} <span className="text-[16.5px] font-medium text-dim">· {PLAN_PRICE[user.plan]}</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[14.5px] text-mid">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Allowances reset on {longDay(resetDate)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/hub/account/billing" className={btnSecondary}>
              Billing
            </Link>
            <Link href="/hub/account/membership" className={btnPrimary}>
              {user.plan === "enterprise" ? "View membership" : "Compare plans"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {admin ? <p className="relative mt-4 rounded-xl bg-blue-light px-3.5 py-2.5 text-[13.5px] text-blue">You are signed in as an admin, so every allowance below is unlimited for you.</p> : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Monthly allowances" sub={`Used, limit and reset date. Next reset ${resets}.`} icon={Calculator} className="lg:col-span-3">
          <ul className="divide-y divide-border">
            <AllowanceRow label="Nitrogen reports this month" icon={FlaskConical} used={nitrogenUsed} limit={limit(mine.nitrogen)} resets={resets} href="/hub/nitrogen-report" />
            <AllowanceRow label="Saved reports retained" icon={FileStack} used={saved.length} limit={limit(mine.saved)} resets={resets} href="/hub/nitrogen-report" kept />
            <AllowanceRow label="Freight calculator runs" icon={Calculator} tone="amber" used={freightUsed} limit={limit(mine.freight)} resets={resets} href="/hub/freight-calculator" />
            <AllowanceRow label="Netback calculations" icon={ArrowLeftRight} tone="amber" used={netbackUsed} limit={limit(mine.netback)} resets={resets} href="/hub/netback" />
            <AllowanceRow label="Aquibot questions" icon={Bot} tone="blue" used={aquibotUsed} limit={limit(mine.aquibot)} resets={resets} href="/hub/aquibot" />
          </ul>
        </Panel>

        <Panel title="Always included" sub="No meter, on every plan" icon={Unlock} className="lg:col-span-2">
          <ul className="divide-y divide-border">
            <IncludedRow label="Market TELEX Feed" detail="Desk flashes for your plan tier" href="/hub/telex" icon={Radio} />
            <IncludedRow label="AQ Market Analysis" detail="What a move means for buyers" href="/hub/analysis" icon={Newspaper} />
            <IncludedRow label="AQ Signal" detail="7 to 90-day price windows" href="/hub/signal" icon={Activity} />
            <IncludedRow label="Library free reports" detail="Weekly reports and research notes" href="/hub/library" icon={Archive} />
            <IncludedRow label="Freight Analytics Call" detail="A free 45-minute call with the desk" href="/hub/community-call" icon={PhoneCall} />
          </ul>
        </Panel>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">AQ Analytics on your plan</h2>
            <p className="text-[14.5px] text-mid">
              {MODULES.filter((item) => can(item.key)).length} of {MODULES.length} modules unlocked. Each one opens from the plan shown.
            </p>
          </div>
          <Link href="/hub/account/membership" className="text-[14.5px] font-semibold text-blue no-underline hover:underline">
            Compare every plan
          </Link>
        </div>
        <div className="aq-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((item) => {
            const open = can(item.key);
            const from = modules.access[item.key];
            return (
              <Link
                key={item.key}
                href={open ? item.href : `/hub/account/membership?from=${item.key}&plan=${from}`}
                className={`aq-card aq-lift group flex flex-col gap-2 p-4 no-underline ${open ? "" : "bg-s2/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`aq-chip ${open ? "aq-chip-blue" : ""} flex h-8 w-8 items-center justify-center rounded-[10px] text-white ${open ? "" : "opacity-60 saturate-50"}`}>
                    {open ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </span>
                  {open ? <Tag tone="green">Unlocked</Tag> : <Tag tone="neutral">From {PLAN_LABEL[from]}</Tag>}
                </div>
                <p className="text-[16px] font-semibold text-ink">{item.label}</p>
                <p className="line-clamp-2 text-[13.5px] leading-snug text-mid">{item.pitch}</p>
                <span className={`mt-auto inline-flex items-center gap-1 pt-1 text-[13.5px] font-semibold ${open ? "text-blue" : "text-teal-700"}`}>
                  {open ? "Open" : `Unlock with ${PLAN_LABEL[from]}`}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
