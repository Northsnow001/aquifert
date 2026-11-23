import { ToolsBoard } from "@/components/tools/tools-board";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getHubContent } from "@/lib/hub-content";
import { sanitizeRichText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ user, admin }, { toolsCommentary }, { view }] = await Promise.all([getHubAccess(), getHubContent(), searchParams]);
  return <ToolsBoard commentaryHtml={sanitizeRichText(toolsCommentary.html)} mapLocked={!admin && user.plan === "core"} plan={user.plan} view={view} />;
}
