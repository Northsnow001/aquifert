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
        title="Desk agents"
        description="Named prompts. WeChat: Matt and the supplier desk. WhatsApp: buyer onboarding (workflow 6) and AQ Buyer Desk. Edits apply to the next message."
      />
      <AgentsEditor initial={agents} />
    </div>
  );
}
