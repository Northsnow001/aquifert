import { Check, Lock } from "lucide-react";
import { ALLOWANCE_LABEL, amount, PLAN_ORDER, type Allowances } from "@/components/hub/plans/shared";
import { MODULES, PLAN_LABEL, PLAN_RANK, type AccessRules, type ModuleKey } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

const ALLOWANCE_KEYS = Object.keys(ALLOWANCE_LABEL) as (keyof Allowances)[];

const Included = () => <Check className="mx-auto h-4 w-4 text-teal-600" aria-label="Included" />;
const Excluded = () => <Lock className="mx-auto h-4 w-4 text-[#b8c3ce]" aria-label="Not included" />;

/** Plan-by-plan table of allowances and AQ Analytics modules, read from the desk's current settings. */
export function ComparePlans({
  plan,
  allowances,
  access,
  className = "",
}: {
  plan: Plan | null;
  allowances: Record<Plan, Allowances>;
  access: AccessRules;
  className?: string;
}) {
  const includedIn = (tier: Plan, key: ModuleKey) => PLAN_RANK[tier] >= PLAN_RANK[access[key]];

  return (
    <section className={`aq-card overflow-hidden ${className}`} aria-labelledby="compare-title">
      <header className="border-b border-border px-5 py-3.5">
        <h2 id="compare-title" className="text-[16.5px] font-semibold text-ink">
          Compare plans
        </h2>
        <p className="text-[13px] text-dim">Modules and allowances come straight from the desk&rsquo;s current settings.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[14.5px]">
          <thead>
            <tr className="border-b border-border bg-s2/70">
              <th scope="col" className="sticky left-0 bg-s2 px-5 py-3 font-semibold text-ink">
                Feature
              </th>
              {PLAN_ORDER.map((tier) => (
                <th key={tier} scope="col" className={`px-4 py-3 text-center font-semibold ${tier === plan ? "text-teal-700" : "text-ink"}`}>
                  {PLAN_LABEL[tier]}
                  {tier === plan ? <span className="block text-[11.5px] font-bold uppercase tracking-[0.08em]">Your plan</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                AQ ONE hub, Telex, analysis and library
              </th>
              {PLAN_ORDER.map((tier) => (
                <td key={tier} className="px-4 py-2.5 text-center">
                  <Included />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                Cost-to-cost quotes (no margin)
              </th>
              {PLAN_ORDER.map((tier) => (
                <td key={tier} className="px-4 py-2.5 text-center">
                  {tier === "enterprise" ? <Included /> : <Excluded />}
                </td>
              ))}
            </tr>
            {ALLOWANCE_KEYS.map((key) => (
              <tr key={key}>
                <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                  {ALLOWANCE_LABEL[key]}
                </th>
                {PLAN_ORDER.map((tier) => (
                  <td key={tier} className={`px-4 py-2.5 text-center tabular-nums ${allowances[tier][key] === 0 ? "font-semibold text-teal-700" : "text-ink"}`}>
                    {amount(allowances[tier][key])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-s2/50">
              <th scope="row" colSpan={4} className="px-5 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-teal-700">
                AQ Analytics modules
              </th>
            </tr>
            {MODULES.map((item) => (
              <tr key={item.key}>
                <th scope="row" className="sticky left-0 bg-white px-5 py-2.5 font-medium text-ink">
                  {item.label}
                </th>
                {PLAN_ORDER.map((tier) => (
                  <td key={tier} className="px-4 py-2.5 text-center">
                    {includedIn(tier, item.key) ? <Included /> : <Excluded />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
