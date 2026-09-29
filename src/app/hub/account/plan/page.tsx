import Link from "next/link";
import { getSession } from "@/lib/session";
import type { Plan } from "@/lib/session-shared";

const PLANS: { slug: Exclude<Plan, "enterprise">; title: string; price: string; detail: string }[] = [
  { slug: "core", title: "Core", price: "$99 / month", detail: "Hub, library, and limited calculator runs." },
  { slug: "growth", title: "Growth", price: "$249 / month", detail: "Full calculator access and Aquibot history." },
];

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getSession();
  const params = await searchParams;
  const current = user?.plan ?? "core";
  const currentLabel = current.charAt(0).toUpperCase() + current.slice(1);
  const requested = params.plan === "core" || params.plan === "growth" ? params.plan : "";
  const selected = requested || PLANS.find((plan) => plan.slug !== current)?.slug || "growth";
  const selectedPlan = PLANS.find((plan) => plan.slug === selected);
  const locked = current === "growth" || current === "enterprise";

  return (
    <div className="max-w-6xl space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Your current plan is {currentLabel}.
        {locked ? (
          <>
            {" "}
            To change your plan, please contact us.{" "}
            <Link href="/hub/contact" className="font-semibold text-amber-900 underline underline-offset-2">
              Contact
            </Link>
          </>
        ) : null}
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-mid">Select Plan</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = plan.slug === current;
            const isSelected = plan.slug === selected;
            if (isCurrent) {
              return (
                <div
                  key={plan.slug}
                  className="w-full cursor-not-allowed rounded-lg border border-border bg-white p-4 text-left opacity-55"
                >
                  <PlanCard plan={plan} current />
                </div>
              );
            }
            return (
              <Link
                key={plan.slug}
                href={`/hub/account/plan?plan=${plan.slug}`}
                className={`w-full rounded-lg border p-4 text-left no-underline transition-colors ${
                  isSelected ? "border-blue bg-blue/5 text-ink" : "border-border bg-white text-ink hover:border-blue/40"
                }`}
              >
                <PlanCard plan={plan} current={false} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-mid">Premium Plan</h2>
        <div className="rounded-lg border border-border p-4 text-center">
          <h3 className="mb-2 text-base font-semibold text-ink">Enterprise</h3>
          <p className="mb-4 text-sm text-mid">For bespoke solutions and custom requirements, please contact our sales team.</p>
          <Link
            href="/hub/contact"
            className="inline-flex items-center justify-center rounded-lg border border-blue px-4 py-2.5 text-sm font-semibold text-blue no-underline transition-colors hover:bg-blue/5"
          >
            Contact Sales
          </Link>
        </div>
      </section>

      {!locked && selectedPlan && selectedPlan.slug !== current ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-2 text-lg font-semibold text-ink">{selectedPlan.title}</h2>
          <p className="text-sm text-mid">
            Billing checkout is not connected in this preview. Ask the desk to move this account to {selectedPlan.title}.
          </p>
          <Link href="/hub/contact" className="mt-4 inline-flex text-sm font-semibold text-blue">
            Contact us to change plan
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  current,
}: {
  plan: { title: string; price: string; detail: string };
  current: boolean;
}) {
  return (
    <>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-base font-semibold">{plan.title}</span>
        {current ? (
          <span className="inline-flex items-center rounded-full border border-blue/30 bg-blue-light px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue">
            Current Plan
          </span>
        ) : null}
        <span className="font-mono text-sm text-mid">{plan.price}</span>
      </div>
      <p className="text-sm text-mid">{plan.detail}</p>
    </>
  );
}
