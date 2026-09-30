import { GuideBrowser } from "@/components/admin/guide/guide-browser";
import { PageHeader } from "@/components/admin/ui";
import { GUIDE } from "@/lib/admin-guide";

export default function AdminGuidePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Admin guide"
        description="How to run Aquifert ONE from this admin, module by module. Search for a task, or open a module straight from its section."
      />
      <GuideBrowser sections={GUIDE} />
    </div>
  );
}
