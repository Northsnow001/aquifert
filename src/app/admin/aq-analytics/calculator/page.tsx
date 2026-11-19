import { CalculatorForm } from "@/components/admin/aq-analytics/calculator-form";
import { PageHeader } from "@/components/admin/ui";
import { listPorts } from "@/lib/aq-analytics/queries";

export const dynamic = "force-dynamic";

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ load?: string; disch?: string; qty?: string; product?: string }>;
}) {
  const params = await searchParams;
  const ports = await listPorts();
  return (
    <>
      <PageHeader
        title="Freight calculator & FOB netback"
        description="Great-circle × 1.18, 12.5 kn, 28 t/day at sea and 5 t/day in port, VLSFO USD 590/t, hire by vessel band, BDI 1642."
        crumbs={[
          { href: "/admin/aq-analytics", label: "Map" },
          { href: "/admin/aq-analytics/calculator", label: "Calculator" },
        ]}
      />
      <CalculatorForm
        loadPorts={ports.load}
        dischPorts={ports.disch}
        initial={{
          load: params.load,
          disch: params.disch,
          product: params.product,
          qty: params.qty ? Number(params.qty) : undefined,
        }}
      />
    </>
  );
}
