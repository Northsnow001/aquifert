import { saveToolsCommentary } from "@/app/admin/actions";
import { PageHeader } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

export default async function ToolsCommentaryAdminPage() {
  const { toolsCommentary } = await getHubContent();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tools commentary"
        description="The Commentary block beneath the Tools tabs on the member Tools page. What you see here is how members read it. Leave it empty to hide the block."
      />
      <RichTextEditor initialHtml={toolsCommentary.html} updatedAt={toolsCommentary.updatedAt} save={saveToolsCommentary} publicHref="/hub/tools" />
    </div>
  );
}
