import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Info, Lock, Sparkles } from "lucide-react";
import { btnPrimary } from "@/components/app/form";
import { Tag } from "@/components/hub/kit";
import { ComparePlans } from "@/components/hub/plans/compare-plans";
import { planAllowances } from "@/components/hub/plans/load";
import { MembershipBoard } from "@/components/hub/plans/membership-board";
import { isPlan, longDay } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { isTier, TIER_LABEL, type MembershipOffer } from "@/lib/aq-modules/membership";
import { myMembershipRequests } from "@/lib/aq-modules/members";
import { MODULES, PLAN_LABEL } from "@/lib/aq-modules/types";

export const metadata: Metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

const STATUS_COPY = {
  new: { label: "Received", body: "The desk has your request and will be in touch shortly." },
  contacted: { label: "In progress", body: "The desk has been in touch. Reply to their email to finish the change." },
  done: { label: "Done", body: "This request is complete." },
};

const FAQ = [
  {
    q: "How do I change my plan?",
    a: "Select a plan above and send the request. The desk confirms the details by email and moves your account, usually the same working day.",
  },
  {
    q: "Which membership tier fits me?",
    a: "Tiers follow the tonnage you buy through the desk each month: AQ Zero Sprout covers up to 200 tonnes, AQ Zero Harvest 201 to 600 tonnes, and AQ Zero Scale has no limit. If you outgrow your tier, the desk suggests the next one.",
  },
  {
    q: "What is the difference between AQ Analytics and AQ ZERO?",
    a: "AQ Analytics is for analysis and licensed market data, with no physical trading. AQ Zero Sprout, AQ Zero Harvest and AQ Zero Scale are AQ ZERO memberships: one flat fee replaces the margin on every quote, and every AQ Analytics module is included.",
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
    q: "How am I billed?",
    a: "The desk confirms pricing with you and invoices you directly. Your invoices and billing contact are on the Billing page.",
  },
];

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ plan?: string; tier?: string; from?: string }> }) {
  const [{ plan: planParam, tier: tierParam, from }, { user, admin, modules, can }] = await Promise.all([searchParams, getHubAccess()]);
  const [allowances, requests] = await Promise.all([planAllowances(modules), myMembershipRequests(user)]);

  const fromModule = MODULES.find((item) => item.key === from);
  const sorted = [...requests].sort((a, b) => b.at.localeCompare(a.at));
  const open = sorted.find((item) => item.status !== "done");
  const lastTier = sorted.find((item) => item.status === "done" && item.requestedPlan === "enterprise" && item.tier)?.tier ?? null;
  const currentTier = user.plan === "enterprise" ? lastTier : null;

  let initialOffer: MembershipOffer["id"] | null = null;
  if (isPlan(planParam) && !open) {
    if (planParam === "growth" && user.plan === "core" && !admin) initialOffer = "analytics";
    if (planParam === "enterprise" && user.plan !== "enterprise") initialOffer = isTier(tierParam) ? tierParam : "harvest";
  }

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div className="flex flex-col gap-4">
        <MembershipBoard plan={user.plan} admin={admin} currentTier={currentTier} initialOffer={initialOffer} source={from ?? ""} />
      </div>

      {fromModule ? (
        <div className="aq-rise flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
          <span className="aq-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
            {can(fromModule.key) ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          <div className="text-[15px] leading-relaxed text-mid">
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
          <div className="min-w-0 flex-1 text-[15px]">
            <p className="font-semibold text-ink">
              Your request for {open.tier ? `${TIER_LABEL[open.tier]} (${PLAN_LABEL.enterprise})` : PLAN_LABEL[open.requestedPlan]}{" "}
              <Tag tone={open.status === "new" ? "amber" : "blue"} className="ml-1 align-middle">
                {STATUS_COPY[open.status].label}
              </Tag>
            </p>
            <p className="text-mid">
              Sent {longDay(open.at)}. {STATUS_COPY[open.status].body}
            </p>
          </div>
        </div>
      ) : null}

      {admin ? (
        <p className="flex items-start gap-2 rounded-xl bg-blue-light px-4 py-3 text-[14.5px] text-blue">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          You are an admin, so everything is unlocked for you. Member plan changes are made in Supabase or the admin console; requests sent here arrive in the admin queue.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <ComparePlans plan={user.plan} allowances={allowances} access={modules.access} className="lg:col-span-3" />

        <section className="lg:col-span-2" aria-labelledby="faq-title">
          <h2 id="faq-title" className="mb-3 text-[17px] font-semibold text-ink">
            Questions
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item) => (
              <details key={item.q} className="aq-card group p-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-semibold text-ink">
                  {item.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-s3 text-mid transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-[14.5px] leading-relaxed text-mid">{item.a}</p>
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
