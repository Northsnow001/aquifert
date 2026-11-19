import { saveMarketsAction } from "@/app/admin/aq-analytics/actions";
import { Card, CardHeader, PageHeader, btnPrimary } from "@/components/admin/ui";
import { alertsPreview } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

const TYPES = [
  { id: "enquiries", label: "Enquiries" },
  { id: "shipments", label: "Shipments" },
  { id: "lineups", label: "Lineups" },
  { id: "aqview", label: "AQ View" },
];
const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "inapp", label: "In-app" },
];

export default async function AlertsPage() {
  const preview = await alertsPreview();
  const m = preview.markets;
  return (
    <>
      <PageHeader
        title="Alerts"
        description="Preferences persist on this desk. Delivery to WhatsApp/email is not wired yet — the preview uses live pipeline rows."
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/alerts", label: "Alerts" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="What to hear" />
          <form action={saveMarketsAction} className="space-y-4 p-5">
            <input type="hidden" name="countries" value={m.countries.join(",")} />
            <input type="hidden" name="originCountries" value={m.originCountries.join(",")} />
            <input type="hidden" name="products" value={m.products.join(",")} />
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium text-mid">Types</legend>
              <div className="flex flex-wrap gap-3">
                {TYPES.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-[13.5px]">
                    <input type="checkbox" name="alertTypes" value={item.id} defaultChecked={m.alertTypes.includes(item.id)} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium text-mid">Channels (minimum one)</legend>
              <div className="flex flex-wrap gap-3">
                {CHANNELS.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-[13.5px]">
                    <input type="checkbox" name="channels" value={item.id} defaultChecked={m.channels.includes(item.id)} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium text-mid">Timing</legend>
              <select name="timing" defaultValue={m.timing} className="h-10 rounded-xl border border-border px-3 text-[13.5px]">
                <option value="instant">Instant</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </fieldset>
            <label className="flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" name="reportEmail" defaultChecked={m.reportEmail} />
              Email the personalised report as well
            </label>
            <button className={btnPrimary}>Save preferences</button>
          </form>
        </Card>
        <Card>
          <CardHeader title="What you would have received" />
          <ul className="divide-y divide-border">
            {preview.items.map((item, index) => (
              <li key={`${item.title}-${index}`} className="px-5 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-dim">
                  {item.type} · {item.channel}
                </p>
                <p className="text-[13.5px] font-medium">{item.title}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
