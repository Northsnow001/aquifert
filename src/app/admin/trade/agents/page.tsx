import { PageHeader } from "@/components/admin/ui";
import { AgentsEditor } from "@/components/admin/trade/agents-editor";
import { listTradeAgents } from "@/lib/wechat/agent-store";

export const dynamic = "force-dynamic";

export default async function TradeAgentsPage() {
  const agents = await listTradeAgents().catch(() => []);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        crumbs={[{ href: "/admin/trade", label: "Trade book" }]}
        title="WeChat agents"
        description="Named prompts for the Official Account inbox. Matt talks to known suppliers. Supplier desk registers people who are not on the list yet. Edits apply to the next WeChat message."
      />
      <AgentsEditor initial={agents} />
    </div>
  );
}
