import { AccessForm } from "@/components/admin/aq-content/access-form";
import { PageHeader } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";

export const dynamic = "force-dynamic";

export default async function AqAccessAdminPage() {
  const { access, limits, updatedAt } = await getAqModules();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Access & allowances"
        description="Which plan unlocks each AQ Analytics module on the hub, and how many AQ ONE reports each plan gets a month."
      />
      <AccessForm access={access} limits={limits} updatedAt={updatedAt} />
    </div>
  );
}
