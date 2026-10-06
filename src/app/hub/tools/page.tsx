import { ToolsBoard } from "@/components/tools/tools-board";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getHubContent } from "@/lib/hub-content";
import { sanitizeRichText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const [{ user, admin }, { toolsCommentary }] = await Promise.all([getHubAccess(), getHubContent()]);
  return <ToolsBoard commentaryHtml={sanitizeRichText(toolsCommentary.html)} mapLocked={!admin && user.plan === "core"} plan={user.plan} />;
}
