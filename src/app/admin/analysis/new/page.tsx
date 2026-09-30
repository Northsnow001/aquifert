import { AnalysisEditor } from "@/components/admin/aq-content/analysis-editor";
import { telexOptions } from "@/components/admin/aq-content/telex-options";
import { PageHeader } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";
import { deskNow } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export default async function NewAnalysisPage() {
  const [modules, telex] = await Promise.all([getAqModules(), telexOptions()]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="New analysis note" crumbs={[{ href: "/admin/analysis", label: "AQ Market Analysis" }]} />
      <AnalysisEditor defaultPublishedAt={deskNow()} slugs={modules.analysis.map((item) => ({ id: item.id, slug: item.slug }))} telex={telex} />
    </div>
  );
}
