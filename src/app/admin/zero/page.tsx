import Link from "next/link";
import { Download } from "lucide-react";
import { ZeroRegistrationsPanel } from "@/components/admin/zero/registrations-panel";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import { getDeskSettings } from "@/lib/desk-settings/store";
import { listZeroRegistrations } from "@/lib/zero-interest";

export const dynamic = "force-dynamic";

const PILOT_SLOTS = 12;

export default async function ZeroAdminPage() {
  const rows = await listZeroRegistrations();
  const settings = await getDeskSettings();
  const quarterStart = (() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)).toISOString();
  })();
  const fresh = rows.filter((row) => row.status === "new").length;
  const offered = rows.filter((row) => row.status === "offered" && (row.updatedAt ?? row.at) >= quarterStart).length;
  const volume = rows.filter((row) => row.status !== "declined").reduce((sum, row) => sum + (Number(row.annualVolume) || 0), 0);
  const products = new Map<string, number>();
  for (const row of rows) products.set(row.product, (products.get(row.product) ?? 0) + 1);
  const top = [...products.entries()].sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: "Registrations", value: rows.length.toLocaleString(), meta: settings.zero.showOnHub ? "Tab is live on the Order Desk" : "Tab is hidden on the hub", tone: "text-ink" },
    { label: "Awaiting contact", value: fresh.toLocaleString(), meta: fresh ? "Marked new" : "Everyone has been contacted", tone: fresh ? "text-[#1463a5]" : "text-ink" },
    { label: "Pilot slots this quarter", value: `${offered} of ${PILOT_SLOTS}`, meta: offered >= PILOT_SLOTS ? "Quarter is full" : `${PILOT_SLOTS - offered} left to offer`, tone: offered >= PILOT_SLOTS ? "text-[#9a5b00]" : "text-ink" },
    { label: "Pipeline volume", value: `${volume.toLocaleString("en-GB")} MT`, meta: top ? `Most asked: ${top[0]}` : "Annual, excluding not-a-fit", tone: "text-ink" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Aquifert Zero"
        description="Members who registered for the Zero pilot. Move each one through contacted and slot offered, and keep notes for the desk."
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

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 truncate text-[12px] text-mid" title={stat.meta}>
              {stat.meta}
            </p>
          </div>
        ))}
      </div>

      <ZeroRegistrationsPanel rows={rows} />
    </div>
  );
}
