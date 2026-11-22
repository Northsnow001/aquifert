import Link from "next/link";
import { requestHubAccessAction } from "@/app/hub/tools/analytics/actions";
import { btnPrimary, input, textarea } from "@/components/admin/ui";
import { PLAN_COMPARE, PLANS } from "@/lib/aq-analytics/contracts";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getSession();
  return (
    <>
      <div className="text-center">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Plans & access</h2>
        <p className="mx-auto mt-1 max-w-xl text-[14px] text-mid">B2B subscription by invitation. Every user is set up by the Aquifert team. AQ ZERO trading customers get Premium analytics included.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article key={plan.code} className={`aq-card p-5 ${plan.recommended ? "ring-2 ring-blue" : ""}`}>
            {plan.recommended ? <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue">Recommended</p> : null}
            <h3 className="text-[18px] font-semibold">{plan.name}</h3>
            <p className="text-[13px] text-mid">{plan.tagline}</p>
            <p className="mt-2 text-[18px] font-semibold">{plan.price}</p>
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
          <p className="text-[13px] text-white/70">Your AQ ZERO subscription includes Premium analytics, unlimited AQ Bot and reports, alongside your trade dashboard and document folders.</p>
        </div>
        <Link href="/hub/order-desk/trades" className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#10263b] no-underline">
          Go to my trades
        </Link>
      </section>
      <section className="aq-card overflow-x-auto">
        <h3 className="px-5 py-4 font-semibold">Compare plans</h3>
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-border font-mono text-[10.5px] uppercase text-dim">
              <th className="px-4 py-2">Feature</th>
              <th>Standard</th>
              <th>Premium</th>
              <th>Enterprise</th>
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
      <form action={requestHubAccessAction} className="aq-card grid gap-3 p-5 sm:grid-cols-2">
        <h3 className="sm:col-span-2 font-semibold">Request access</h3>
        <select name="plan" className={input} defaultValue="premium">
          {PLANS.map((plan) => (
            <option key={plan.code} value={plan.code}>
              {plan.name}
            </option>
          ))}
        </select>
        <input name="company" className={input} placeholder="Company" defaultValue="" />
        <textarea name="message" className={`${textarea} sm:col-span-2`} rows={3} placeholder="What you trade, and which markets you follow" />
        <p className="text-[12.5px] text-dim sm:col-span-2">Sent as {user?.email ?? "your account email"}.</p>
        <button className={`${btnPrimary} sm:col-span-2 sm:w-fit`}>Request access</button>
      </form>
    </>
  );
}
