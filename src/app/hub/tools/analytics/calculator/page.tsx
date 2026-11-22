import { CalculatorForm } from "@/components/admin/aq-analytics/calculator-form";
import { estimateHubLaneAction } from "@/app/hub/tools/analytics/actions";
import { listPorts } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

export default async function LaneCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ load?: string; disch?: string; qty?: string; product?: string }>;
}) {
  const [params, ports] = await Promise.all([searchParams, listPorts()]);
  return (
    <>
      <div>
        <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Freight calculator</h2>
        <p className="text-[14px] text-mid">Voyage cost estimate and FOB netback, powered by the Aquifert freight book.</p>
      </div>
      <CalculatorForm
        loadPorts={ports.load}
        dischPorts={ports.disch}
        initial={{ load: params.load, disch: params.disch, qty: params.qty ? Number(params.qty) : undefined, product: params.product }}
        estimate={estimateHubLaneAction}
      />
    </>
  );
}
