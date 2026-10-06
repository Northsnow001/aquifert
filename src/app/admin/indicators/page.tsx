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
        description="Nitrogen, phosphate and potassium sentiment. Each reading sets the direction in the hub's moving market ticker: Firming above 66, Steady from 34 to 66, Softening below 34. The caption runs beside it, and the notes give Aquibot the reasoning."
      />
      <IndicatorsForm indicators={indicators} updatedAt={indicatorsUpdatedAt} />
    </div>
  );
}
