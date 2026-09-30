import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Banknote, Building2, Clock, CreditCard, FileText, Mail, MessageSquare, Receipt, ShieldCheck } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { EmptyPanel, HubPageHeader, Panel, Tag } from "@/components/hub/kit";
import { longDay, PLAN_PRICE } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { myMembershipRequests } from "@/lib/aq-modules/members";
import { PLAN_LABEL } from "@/lib/aq-modules/types";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const HOW = [
  { icon: Receipt, title: "Invoiced by the desk", body: "Your membership is invoiced by the Aquifert desk each billing period, and every invoice is emailed to your billing contact." },
  { icon: Banknote, title: "Ways to pay", body: "Pay by bank transfer using the details on your invoice, or by card through a secure payment link the desk sends you." },
  { icon: ShieldCheck, title: "Card details stay out of the hub", body: "Aquifert never asks for card details inside the hub. If a message asks you to, check with billing first." },
  { icon: Building2, title: "Company and VAT details", body: "Tell billing your registered company name, address and VAT number and they appear on every invoice." },
];

export default async function BillingPage() {
  const { user, admin } = await getHubAccess();
  const requests = await myMembershipRequests(user);
  const open = [...requests].sort((a, b) => b.at.localeCompare(a.at)).find((item) => item.status !== "done");
  const address = [user.address1, user.address2, user.city, user.country].map((line) => line?.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-6 pb-2">
      <HubPageHeader
        eyebrow="Your account"
        title="Billing"
        tip="Your plan and price, the contact the desk invoices, your invoices and payment history, and how billing works."
        guide="billing"
        description="Your plan, billing contact and invoices in one place. The desk handles billing directly, so a person is always on hand."
        actions={
          <Link href="/hub/contact?topic=Billing" className={btnSecondary}>
            <MessageSquare className="h-4 w-4" /> Talk to billing
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="aq-card aq-rise flex flex-col p-5 md:p-6" aria-labelledby="plan-title">
          <div className="flex items-center gap-3">
            <span className="aq-chip flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <CreditCard className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-700">Current plan</p>
              <h2 id="plan-title" className="text-[20px] font-semibold leading-tight text-ink">
                {PLAN_LABEL[user.plan]}
              </h2>
            </div>
            <Tag tone="green" className="ml-auto">
              Active
            </Tag>
          </div>
          <p className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">{PLAN_PRICE[user.plan]}</p>
          <p className="mt-1.5 text-[13px] text-mid">
            {user.plan === "enterprise" ? "Pricing and terms are agreed with the desk for your team." : "Billed monthly by the desk. Change plan whenever your needs change."}
          </p>
          {open ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff4df] px-3.5 py-2.5 text-[12.5px] text-[#9a5b00]">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your request to move to {PLAN_LABEL[open.requestedPlan]} was sent on {longDay(open.at)}. Billing updates once the desk confirms it.
            </p>
          ) : null}
          {admin ? <p className="mt-4 rounded-xl bg-blue-light px-3.5 py-2.5 text-[12.5px] text-blue">Admin account: plan and billing changes for members are made in Supabase or the admin console.</p> : null}
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <Link href="/hub/membership" className={btnPrimary}>
              Change plan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/hub/plan-usage" className={btnSecondary}>
              Plan & usage
            </Link>
          </div>
        </section>

        <section className="aq-card aq-rise flex flex-col p-5 md:p-6" aria-labelledby="contact-title">
          <div className="flex items-center gap-3">
            <span className="aq-chip aq-chip-blue flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <Mail className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-700">Billing contact</p>
              <h2 id="contact-title" className="text-[16px] font-semibold text-ink">
                Who the desk invoices
              </h2>
            </div>
          </div>
          <dl className="mt-4 divide-y divide-border text-[13.5px]">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-dim">Name</dt>
              <dd className="min-w-0 truncate text-right font-medium text-ink">{user.name || "Not set"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-dim">Email</dt>
              <dd className="min-w-0 truncate text-right font-medium text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-dim">Address</dt>
              <dd className="min-w-0 text-right font-medium text-ink">
                {address.length ? (
                  address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))
                ) : (
                  <span className="font-normal text-dim">No address on file yet</span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-auto pt-4 text-[12.5px] text-mid">
            Update your name and address in{" "}
            <Link href="/hub/account/profile" className="font-semibold text-blue no-underline hover:underline">
              Profile
            </Link>
            . For a different billing email or company details,{" "}
            <Link href="/hub/contact?topic=Billing" className="font-semibold text-blue no-underline hover:underline">
              tell billing
            </Link>
            .
          </p>
        </section>
      </div>

      <Panel title="Invoices and payments" sub="Your payment history with the desk" icon={FileText} bodyClassName="p-4">
        <EmptyPanel
          title="No invoices yet"
          body={
            <>
              Invoices from the desk appear here once your first payment is recorded. Each one is also emailed to <strong className="font-semibold text-ink">{user.email}</strong>. You have no pending payments.
            </>
          }
          action={
            <Link href="/hub/contact?topic=Billing" className={btnSecondary}>
              Ask for a copy of an invoice
            </Link>
          }
        />
      </Panel>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="mb-3 text-[18px] font-semibold tracking-[-0.01em] text-ink">
          How billing works
        </h2>
        <div className="aq-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {HOW.map((item) => (
            <div key={item.title} className="aq-card p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-border bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px] text-mid">A question about an invoice, a refund or changing how you pay? Billing replies by email, usually the same working day.</p>
          <Link href="/hub/contact?topic=Billing" className={btnPrimary}>
            <MessageSquare className="h-4 w-4" /> Talk to billing
          </Link>
        </div>
      </section>
    </div>
  );
}
