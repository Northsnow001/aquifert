import Link from "next/link";
import { subscription } from "@/data/sample";
import { getSession } from "@/lib/session";

const PRICES: Record<string, string> = {
  core: "$99.00",
  growth: "$249.00",
  enterprise: "Custom",
};

export default async function SubscriptionsPage() {
  const user = await getSession();
  const plan = user?.plan ?? "growth";
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="max-w-6xl overflow-hidden rounded-lg border border-border bg-s2">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Subscriptions</caption>
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-dim">
              <th className="px-4 py-3 font-semibold">Membership</th>
              <th className="px-4 py-3 font-semibold">Subscription</th>
              <th className="px-4 py-3 font-semibold">Active</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Card Exp.</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-4">
                <div className="font-semibold text-ink">{label}</div>
              </td>
              <td className="px-4 py-4 text-mid">
                <div className="font-medium text-ink">Enabled</div>
                <div className="mt-1">{PRICES[plan] ?? subscription.plan}</div>
                <div className="mt-1 text-xs text-dim">Next Billing: {subscription.renews}</div>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full border border-teal/40 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  Yes
                </span>
              </td>
              <td className="px-4 py-4 text-ink">01 Aug 2026</td>
              <td className="px-4 py-4 text-dim">--</td>
              <td className="px-4 py-4">
                <Link
                  href="/hub/account/plan"
                  className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink no-underline transition-colors hover:border-blue hover:text-blue"
                >
                  Change plan
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
