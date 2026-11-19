import { requestAccessAction } from "@/app/admin/aq-analytics/actions";
import { Card, CardHeader, PageHeader, btnPrimary, input, textarea } from "@/components/admin/ui";
import { PLAN_COMPARE, PLANS } from "@/lib/aq-analytics/contracts";
import { getAqAnalytics } from "@/lib/aq-analytics/store";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const state = await getAqAnalytics();
  return (
    <>
      <PageHeader
        title="Plans & access"
        description="B2B by invitation. Prices stay [Price TBC]. Submissions land in this desk, not a checkout."
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/plans", label: "Plans" },
        ]}
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.code} className={plan.recommended ? "ring-2 ring-blue" : ""}>
            <div className="p-5">
              {plan.recommended ? <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue">Most popular</p> : null}
              <h2 className="text-[18px] font-semibold">{plan.name}</h2>
              <p className="text-[13px] text-mid">{plan.tagline}</p>
              <p className="mt-2 text-[15px] font-semibold">{plan.price}</p>
              <ul className="mt-3 space-y-1 text-[13px] text-ink">
                {plan.features.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mb-5 overflow-x-auto">
        <CardHeader title="Comparison" />
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border font-mono text-[10.5px] uppercase text-dim">
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
        <p className="border-t border-border px-4 py-3 text-[12px] text-dim">Port lineups are a labelled sample AIS layer. Producer availability is an Aquifert estimate.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Request access" />
          <form action={requestAccessAction} className="space-y-3 p-5">
            <select name="plan" className={input} defaultValue="premium">
              {PLANS.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name}
                </option>
              ))}
            </select>
            <input name="name" className={input} placeholder="Name" required />
            <input name="email" type="email" className={input} placeholder="Email" required />
            <input name="company" className={input} placeholder="Company" />
            <textarea name="message" className={textarea} rows={4} placeholder="Message" />
            <button className={btnPrimary}>Send request</button>
          </form>
        </Card>
        <Card>
          <CardHeader title="Inbox" meta={`${state.accessRequests.length} requests`} />
          <ul className="divide-y divide-border">
            {state.accessRequests.length ? (
              state.accessRequests.map((row) => (
                <li key={row.id} className="px-5 py-3 text-[13px]">
                  <p className="font-medium">
                    {row.name} · {row.plan}
                  </p>
                  <p className="text-mid">
                    {row.email} {row.company ? `· ${row.company}` : ""}
                  </p>
                </li>
              ))
            ) : (
              <p className="px-5 py-6 text-[13px] text-mid">No requests yet.</p>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
