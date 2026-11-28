import Link from "next/link";
import { startCheckout } from "@/app/hub/billing/actions";
import { PLAN_COMPARE, PLANS } from "@/lib/aq-analytics/contracts";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

const OFFER = { standard: "sprout", premium: "harvest", enterprise: "scale" } as const;

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getSession();
  const supabase = await createClient();
  const profile = user && supabase ? await supabase.from("profiles").select("membership_tier").eq("id", user.id).maybeSingle() : { data: null };
  const tier = profile.data?.membership_tier;
  const current = tier === "sprout" ? "standard" : tier === "harvest" ? "premium" : tier === "scale" ? "enterprise" : null;
  return (
    <>
      <div className="text-center">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Plans & access</h2>
        <p className="mx-auto mt-1 max-w-xl text-[14px] text-mid">Annual membership, billed by Stripe. The plan you are on is marked. Choosing another opens checkout for that plan.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article key={plan.code} className={`aq-card p-5 ${plan.recommended ? "ring-2 ring-blue" : ""}`}>
            {plan.recommended ? <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue">Recommended</p> : null}
            <h3 className="text-[18px] font-semibold">{plan.name}</h3>
            <p className="text-[13px] text-mid">{plan.tagline}</p>
            <p className="mt-2 text-[18px] font-semibold">{plan.price}</p>
            <p className="text-[12.5px] text-dim">annual membership</p>
            {current === plan.code ? (
              <p className="mt-3 rounded-full bg-[#f1faf4] px-3 py-1.5 text-center text-[13px] font-semibold text-[#1f7a45]">Current plan</p>
            ) : (
              <form action={startCheckout} className="mt-3">
                <input type="hidden" name="offer" value={OFFER[plan.code as keyof typeof OFFER]} />
                <button className="w-full rounded-full bg-navy-700 px-4 py-2 text-[13px] font-semibold text-white">
                  {current ? "Switch to this plan" : "Choose this plan"}
                </button>
              </form>
            )}
            <ul className="mt-3 space-y-1 text-[13.5px]">
              {plan.features.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#10263b] px-5 py-4 text-white">
        <div>
          <p className="font-semibold">Trading with Aquifert on AQ ZERO?</p>
          <p className="text-[13px] text-white/70">An AQ Zero membership includes this analytics desk, alongside your trade dashboard and document folders.</p>
        </div>
        <Link href="/hub/trade" className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#10263b] no-underline">
          Go to my trades
        </Link>
      </section>
      <section className="aq-card overflow-x-auto">
        <h3 className="px-5 py-4 font-semibold">Compare plans</h3>
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-4 py-2">Feature</th>
              <th>AQ Zero Standard</th>
              <th>AQ Zero Premium</th>
              <th>AQ Zero Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARE.map((row) => (
              <tr key={row.feature} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{row.feature}</td>
                <td>{row.standard}</td>
                <td>{row.premium}</td>
                <td>{row.enterprise}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
