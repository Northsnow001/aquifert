import { FreightEditor } from "@/components/admin/freight-editor";
import { PageHeader } from "@/components/admin/ui";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

export default async function FreightAdminPage() {
  const { freight } = await getHubContent();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Freight Routes"
        description="Open freight enquiries shown as Freight Analytics on the hub home page. Hidden rows stay here for later without members seeing them."
      />
      <FreightEditor initial={freight} />
    </div>
  );
}
