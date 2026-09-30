import { ToolsBoard } from "@/components/tools/tools-board";
import { getHubContent } from "@/lib/hub-content";
import { sanitizeRichText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const { toolsCommentary } = await getHubContent();
  return <ToolsBoard commentaryHtml={sanitizeRichText(toolsCommentary.html)} />;
}
