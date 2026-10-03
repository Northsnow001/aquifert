import { IndicatorsForm } from "@/components/admin/indicators-form";
import { PageHeader } from "@/components/admin/ui";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

export default async function IndicatorsAdminPage() {
  const { indicators, indicatorsUpdatedAt } = await getHubContent();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Market Indicators"
        description="Nitrogen, phosphate and potassium sentiment. Each reading drives a dial on the hub home page. The caption sits under the dial, and the notes fill the Market Analysis column."
      />
      <IndicatorsForm indicators={indicators} updatedAt={indicatorsUpdatedAt} />
    </div>
  );
}
