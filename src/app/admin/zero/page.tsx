import Link from "next/link";
import { Download } from "lucide-react";
import { ZeroRegistrationsPanel } from "@/components/admin/zero/registrations-panel";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { listDeskDeals } from "@/lib/desk-hitl/store";
import { listMembers } from "@/lib/members";
import { listRecords } from "@/lib/data/records";
import { MEMBER_PREFS } from "@/lib/data/tables";
import { listZeroRegistrations } from "@/lib/zero-interest";
import { intentOf } from "@/lib/zero-types";

export const dynamic = "force-dynamic";

const PILOT_SLOTS = 12;

export default async function ZeroAdminPage() {
  const [rows, settings, members, prefs, deals] = await Promise.all([
    listZeroRegistrations(),
    getDeskSettings(),
    listMembers().catch(() => ({ available: false as const, members: [], reason: "The member list could not be loaded." })),
    listRecords(MEMBER_PREFS).catch(() => []),
    listDeskDeals().catch(() => []),
  ]);
  const quarterStart = (() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)).toISOString();
  })();
  const fresh = rows.filter((row) => row.status === "new").length;
  const calls = rows.filter((row) => intentOf(row) === "call");
  const callsWaiting = calls.filter((row) => row.status === "new" || row.status === "contacted").length;
  const offered = rows.filter((row) => row.status === "offered" && (row.updatedAt ?? row.at) >= quarterStart).length;
  const volume = rows.filter((row) => row.status !== "declined").reduce((sum, row) => sum + (Number(row.annualVolume) || 0), 0);
  const products = new Map<string, number>();
  for (const row of rows) products.set(row.product, (products.get(row.product) ?? 0) + 1);
  const top = [...products.entries()].sort((a, b) => b[1] - a[1])[0];

  const stats = [
    {
      label: "Registrations",
      value: rows.length.toLocaleString(),
      meta: `${(rows.length - calls.length).toLocaleString()} waitlist · ${calls.length.toLocaleString()} call requests${settings.zero.showOnHub ? "" : " · tab hidden on the hub"}`,
      tone: "text-ink",
    },
    {
      label: "Awaiting contact",
      value: fresh.toLocaleString(),
      meta: callsWaiting ? `${callsWaiting} ${callsWaiting === 1 ? "call" : "calls"} still to book` : fresh ? "Marked new" : "Everyone has been contacted",
      tone: fresh || callsWaiting ? "text-[#1463a5]" : "text-ink",
    },
    { label: "Pilot slots this quarter", value: `${offered} of ${PILOT_SLOTS}`, meta: offered >= PILOT_SLOTS ? "Quarter is full" : `${PILOT_SLOTS - offered} left to offer`, tone: offered >= PILOT_SLOTS ? "text-[#9a5b00]" : "text-ink" },
    { label: "Pipeline volume", value: `${volume.toLocaleString("en-GB")} MT`, meta: top ? `Most asked: ${top[0]}` : "Annual, excluding not-a-fit", tone: "text-ink" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Aquifert Zero"
        description="Members who joined the Zero waitlist or asked for a call for early discounted access. Move each one through contacted, call booked and slot offered, and keep notes for the desk."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/settings?tab=zero" className="text-[12.5px] font-semibold text-blue no-underline">
              Emails &amp; visibility
            </Link>
            <Link href="/hub/order-desk?tab=zero" className="text-[12.5px] font-semibold text-blue no-underline">
              Open on the hub
            </Link>
            {rows.length ? (
              <a href="/admin/zero/export" className={btnSecondary}>
                <Download className="h-3.5 w-3.5" />
                CSV
              </a>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-mid sm:truncate" title={stat.meta}>
              {stat.meta}
            </p>
          </div>
        ))}
      </div>

      <ZeroRegistrationsPanel rows={rows} />

      <section className="mt-8 rounded-2xl border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Subscribers and weekly bids</h2>
        <p className="mt-1 text-[13px] text-mid">Firm bids close {settings.zeroWeeklyClose}. Change that under Settings → Trade templates. An off-list request still uses the normal trade flow.</p>
        {members.available ? (
          <ul className="mt-3 divide-y divide-border">
            {members.members.filter((member) => member.plan === "enterprise").length === 0 ? <li className="py-2 text-[13px] text-mid">No AQ Zero subscription yet.</li> : null}
            {members.members
              .filter((member) => member.plan === "enterprise")
              .map((member) => {
                const pref = prefs.find((item) => item.userId === member.id);
                const products = pref?.interests?.categories?.length ? pref.interests.categories.join(", ") : pref?.briefProducts?.join(", ") || "No products chosen yet";
                return (
                  <li key={member.id} className="py-2 text-[13px]">
                    <span className="font-semibold text-ink">{member.name || member.email}</span>
                    <span className="text-mid"> · {member.company || member.email} · {products}</span>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-mid">{members.reason}</p>
        )}
        <h3 className="mt-4 text-[13px] font-semibold text-ink">AQ Zero trades</h3>
        <ul className="mt-2 space-y-1 text-[13px]">
          {deals.filter((deal) => deal.buyerPlan === "aq_zero").length === 0 ? <li className="text-mid">No inquiry is marked AQ Zero yet. Set the buyer plan on the shortlist.</li> : null}
          {deals
            .filter((deal) => deal.buyerPlan === "aq_zero")
            .map((deal) => (
              <li key={deal.id}>
                <Link href={`/admin/desk/${deal.id}`} className="font-semibold text-blue no-underline">
                  {deal.requestId}
                </Link>
                <span className="text-mid"> · {deal.product} · {deal.buyerCompany || deal.buyerName || "Buyer"} · margin locked</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
