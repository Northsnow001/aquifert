import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock, Crown, Info, Lock, Sparkles } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { HubPageHeader, Tag } from "@/components/hub/kit";
import { planAllowances } from "@/components/hub/plans/load";
import { RequestForm } from "@/components/hub/plans/request-form";
import { ALLOWANCE_LABEL, amount, isPlan, longDay, PLAN_ORDER, PLAN_PITCH, PLAN_PRICE, type Allowances } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { myMembershipRequests } from "@/lib/aq-modules/members";
import { MODULES, PLAN_LABEL, PLAN_RANK, type ModuleKey } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

export const metadata: Metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

const ALLOWANCE_KEYS = Object.keys(ALLOWANCE_LABEL) as (keyof Allowances)[];

const ALLOWANCE_LINE: Record<keyof Allowances, [string, string]> = {
  nitrogen: ["nitrogen report a month", "nitrogen reports a month"],
  saved: ["saved report kept", "saved reports kept"],
  freight: ["freight calculator run a month", "freight calculator runs a month"],
  netback: ["netback calculation a month", "netback calculations a month"],
  aquibot: ["Aquibot question a month", "Aquibot questions a month"],
};

function allowanceLine(key: keyof Allowances, value: number) {
  const [one, many] = ALLOWANCE_LINE[key];
  if (value === 0) return key === "saved" ? "Every saved report kept" : `Unlimited ${many.replace(/ a month$/, "")}`;
  return `${value.toLocaleString("en-GB")} ${value === 1 ? one : many}`;
}

const STATUS_COPY = {
  new: { label: "Received", body: "The desk has your request and will be in touch shortly." },
  contacted: { label: "In progress", body: "The desk has been in touch. Reply to their email to finish the change." },
  done: { label: "Done", body: "This request is complete." },
};

const FAQ = [
  {
    q: "How do I change my plan?",
    a: "Choose a plan and send the request below. The desk confirms the details by email and moves your account, usually the same working day.",
  },
  {
    q: "When does a new plan take effect?",
    a: "As soon as the desk updates your account. New modules unlock and higher allowances apply the next time you open a page.",
  },
  {
    q: "When do allowances reset?",
    a: "Monthly allowances such as nitrogen reports, calculator runs and Aquibot questions reset on the 1st of each month. Reading the Telex, analysis and free library reports is never metered.",
  },
  {
    q: "What happens to my saved reports if I move to a smaller plan?",
    a: "Nothing is removed straight away. On a plan that keeps fewer reports, your oldest reports make way the next time you save a new one, so print or save anything you want to keep.",
  },
  {
    q: "How am I billed?",
    a: "The desk invoices you directly. Your invoices and billing contact are on the Billing page, and the billing team can help with anything else.",
  },
];

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ plan?: string; from?: string }> }) {
  const [{ plan: planParam, from }, { user, admin, modules, can }] = await Promise.all([searchParams, getHubAccess()]);
  const [allowances, requests] = await Promise.all([planAllowances(modules), myMembershipRequests(user)]);

  const fromModule = MODULES.find((item) => item.key === from);
  const includedIn = (plan: Plan, key: ModuleKey) => PLAN_RANK[plan] >= PLAN_RANK[modules.access[key]];
  const above = PLAN_ORDER.find((plan) => PLAN_RANK[plan] > PLAN_RANK[user.plan]);
  const moduleTarget = fromModule && PLAN_RANK[modules.access[fromModule.key]] > PLAN_RANK[user.plan] ? modules.access[fromModule.key] : undefined;
  const initial: Plan = isPlan(planParam) ? planParam : (moduleTarget ?? above ?? "growth");
  const open = [...requests].sort((a, b) => b.at.localeCompare(a.at)).find((item) => item.status !== "done");

  return (
    <div className="flex flex-col gap-6 pb-2">
      <HubPageHeader
        eyebrow="Your account"
        title="Membership"
        tip="Compare Core, Growth and AQ Zero, see which AQ Analytics modules and allowances each includes, and ask the desk to move your account."
        guide="membership"
        description="Every plan includes the AQ1 hub. Growth and AQ Zero add AQ Analytics and larger allowances."
        actions={
          <Link href="/hub/plan-usage" className={btnSecondary}>
            See my usage
          </Link>
        }
      />

      {fromModule ? (
        <div className="aq-rise flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
          <span className="aq-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
            {can(fromModule.key) ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          <div className="text-[13.5px] leading-relaxed text-mid">
            <p className="font-semibold text-ink">
              You opened {fromModule.label}. {can(fromModule.key) ? "It is included in your plan." : `It is included from ${PLAN_LABEL[modules.access[fromModule.key]]}.`}
            </p>
            <p>{fromModule.pitch}</p>
            {can(fromModule.key) ? (
              <Link href={fromModule.href} className="mt-1 inline-flex items-center gap-1 font-semibold text-blue no-underline hover:underline">
                Open {fromModule.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="aq-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
          <span className="aq-chip aq-chip-amber flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-[13.5px]">
            <p className="font-semibold text-ink">
              Your request for {PLAN_LABEL[open.requestedPlan]} <Tag tone={open.status === "new" ? "amber" : "blue"} className="ml-1 align-middle">{STATUS_COPY[open.status].label}</Tag>
            </p>
            <p className="text-mid">
              Sent {longDay(open.at)}. {STATUS_COPY[open.status].body}
            </p>
          </div>
        </div>
      ) : null}

      {admin ? (
        <p className="flex items-start gap-2 rounded-xl bg-blue-light px-4 py-3 text-[13px] text-blue">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          You are an admin, so everything is unlocked for you. Member plan changes are made in Supabase or the admin console; requests sent here arrive in the admin queue.
        </p>
      ) : null}

      <div className="aq-stagger grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const current = plan === user.plan;
          const chosen = plan === initial && !current;
          const limits = allowances[plan];
          return (
            <section
              key={plan}
              className={`aq-card relative flex flex-col p-5 md:p-6 ${current ? "ring-2 ring-teal-500" : chosen ? "ring-2 ring-blue/50" : ""}`}
              aria-label={`${PLAN_LABEL[plan]} plan`}
            >
              {current ? (
                <span className="absolute -top-3 left-5 rounded-full bg-teal-500 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">Your plan</span>
              ) : chosen ? (
                <span className="absolute -top-3 left-5 rounded-full bg-blue px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">Selected</span>
              ) : null}
              <div className="flex items-center gap-2">
                <Crown className={`h-5 w-5 ${plan === "enterprise" ? "text-[#d9951f]" : plan === "growth" ? "text-teal-600" : "text-dim"}`} aria-hidden />
                <h2 className="text-[18px] font-semibold text-ink">{PLAN_LABEL[plan]}</h2>
              </div>
              <p className="mt-3 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">{PLAN_PRICE[plan]}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-mid">{PLAN_PITCH[plan]}</p>

              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-[13px]">
                <li className="flex items-start gap-2 text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> AQ1 hub: Telex, analysis, AQ Signal and the library
                </li>
                {ALLOWANCE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {allowanceLine(key, limits[key])}
                  </li>
                ))}
                {MODULES.map((item) =>
                  includedIn(plan, item.key) ? (
                    <li key={item.key} className="flex items-start gap-2 text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {item.label}
                    </li>
                  ) : (
                    <li key={item.key} className="flex items-start gap-2 text-dim">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {item.label} <span className="sr-only">(not included)</span>
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-auto pt-5">
                {current ? (
                  <span className={`${btnSecondary} pointer-events-none w-full opacity-70`} aria-disabled>
                    <Check className="h-4 w-4" /> Your plan
                  </span>
                ) : (
                  <Link href={`/hub/membership?plan=${plan}${fromModule ? `&from=${fromModule.key}` : ""}#request`} className={`${chosen ? btnPrimary : btnSecondary} w-full`}>
                    {plan === "enterprise" ? "Talk to the desk about AQ Zero" : `${PLAN_RANK[plan] > PLAN_RANK[user.plan] ? "Upgrade" : "Move"} to ${PLAN_LABEL[plan]}`}
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="aq-card overflow-hidden" aria-labelledby="compare-title">
        <header className="border-b border-border px-5 py-3.5">
          <h2 id="compare-title" className="text-[15px] font-semibold text-ink">
            Compare plans
          </h2>
          <p className="text-[12px] text-dim">Allowances come straight from the desk&rsquo;s current settings.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-s2/70">
                <th scope="col" className="sticky left-0 bg-s2 px-5 py-3 font-semibold text-ink">
                  Feature
                </th>
                {PLAN_ORDER.map((plan) => (
                  <th key={plan} scope="col" className={`px-4 py-3 text-center font-semibold ${plan === user.plan ? "text-teal-700" : "text-ink"}`}>
                    {PLAN_LABEL[plan]}
                    {plan === user.plan ? <span className="block text-[10.5px] font-bold uppercase tracking-[0.08em]">Your plan</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                  AQ1 hub, Telex, analysis and library
                </th>
                {PLAN_ORDER.map((plan) => (
                  <td key={plan} className="px-4 py-2.5 text-center">
                    <Check className="mx-auto h-4 w-4 text-teal-600" aria-label="Included" />
                  </td>
                ))}
              </tr>
              {ALLOWANCE_KEYS.map((key) => (
                <tr key={key}>
                  <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                    {ALLOWANCE_LABEL[key]}
                  </th>
                  {PLAN_ORDER.map((plan) => (
                    <td key={plan} className={`px-4 py-2.5 text-center tabular-nums ${allowances[plan][key] === 0 ? "font-semibold text-teal-700" : "text-ink"}`}>
                      {amount(allowances[plan][key])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-s2/50">
                <th scope="row" colSpan={4} className="px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">
                  AQ Analytics
                </th>
              </tr>
              {MODULES.map((item) => (
                <tr key={item.key}>
                  <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                    {item.label}
                  </th>
                  {PLAN_ORDER.map((plan) => (
                    <td key={plan} className="px-4 py-2.5 text-center">
                      {includedIn(plan, item.key) ? <Check className="mx-auto h-4 w-4 text-teal-600" aria-label="Included" /> : <Lock className="mx-auto h-4 w-4 text-[#b8c3ce]" aria-label="Not included" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section id="request" className="aq-card scroll-mt-24 p-5 md:p-6 lg:col-span-3" aria-labelledby="request-title">
          <h2 id="request-title" className="text-[17px] font-semibold text-ink">
            Ask the desk to change your plan
          </h2>
          <p className="mb-5 mt-1 text-[13.5px] text-mid">
            You are on {PLAN_LABEL[user.plan]}. Pick the plan you want and the desk sets it up, usually the same working day.
          </p>
          <RequestForm
            key={initial}
            plans={PLAN_ORDER.map((plan) => ({ plan, label: PLAN_LABEL[plan], price: PLAN_PRICE[plan] }))}
            current={user.plan}
            initial={initial}
            email={user.email}
            source={from ?? ""}
          />
        </section>

        <section className="lg:col-span-2" aria-labelledby="faq-title">
          <h2 id="faq-title" className="mb-3 text-[17px] font-semibold text-ink">
            Questions
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item) => (
              <details key={item.q} className="aq-card group p-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13.5px] font-semibold text-ink">
                  {item.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-s3 text-mid transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-[13px] leading-relaxed text-mid">{item.a}</p>
              </details>
            ))}
          </div>
          <Link href="/hub/contact?topic=Membership" className={`${btnPrimary} mt-4 w-full`}>
            Talk to the desk <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
