import { saveHubMarketsAction } from "@/app/hub/tools/analytics/actions";
import { btnPrimary } from "@/components/admin/ui";
import { alertsPreview } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

const TYPES = [
  { id: "enquiries", label: "New freight enquiries" },
  { id: "lineups", label: "Port lineup changes" },
  { id: "shipments", label: "Concluded shipments" },
  { id: "aqview", label: "AQ View commentary" },
];
const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "inapp", label: "In-app" },
];

export default async function AlertsPage() {
  const preview = await alertsPreview();
  const markets = preview.markets;
  return (
    <>
      <div>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Alerts</h2>
        <p className="max-w-2xl text-[14px] text-mid">Tell us what you trade and where. When something moves in your markets, we message you. No need to check the platform.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={saveHubMarketsAction} className="aq-card space-y-4 p-5">
          <h3 className="font-semibold">My markets</h3>
          <input type="hidden" name="countries" value={markets.countries.join(", ")} />
          <input type="hidden" name="originCountries" value={markets.originCountries.join(", ")} />
          <input type="hidden" name="products" value={markets.products.join(", ")} />
          <p className="text-[13px] text-mid">Countries: {markets.countries.join(", ") || "None yet"}</p>
          <p className="text-[13px] text-mid">Products: {markets.products.join(", ") || "None yet"}</p>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-mid">Alert me when</legend>
            <div className="space-y-2">
              {TYPES.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-[14px]">
                  <input type="checkbox" name="alertTypes" value={item.id} defaultChecked={markets.alertTypes.includes(item.id)} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-mid">Send to</legend>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-[14px]">
                  <input type="checkbox" name="channels" value={item.id} defaultChecked={markets.channels.includes(item.id)} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-[13px]">
            Timing
            <select name="timing" defaultValue={markets.timing} className="mt-1 h-10 w-full rounded-xl border border-border px-3">
              <option value="instant">As it happens</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" name="reportEmail" defaultChecked={markets.reportEmail} />
            Email the personalised report as well
          </label>
          <button className={`${btnPrimary} w-full`}>Save my markets</button>
        </form>
        <section className="aq-card p-5">
          <h3 className="font-semibold">Recent alerts</h3>
          <p className="text-[12px] text-dim">In-app preview from the freight pipeline. WhatsApp and email are saved with the choice below. Neither is sent from here yet.</p>
          <ul className="mt-3 divide-y divide-border">
            {preview.items.map((item, index) => (
              <li key={`${item.title}-${index}`} className="py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-dim">
                  {item.type} · {item.channel}
                </p>
                <p className="text-[14px] font-medium">{item.title}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
