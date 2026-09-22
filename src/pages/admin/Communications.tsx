import { useState } from "react";
import {
  Mail, MessageCircle, MonitorSmartphone, MessagesSquare, Plus, RefreshCw, ScanText,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill, ConfidenceBadge } from "@/components/shared/StatusPill";
import { ChatThread, type ChatMessage } from "@/components/shared/ChatThread";
import { AIProcessing } from "@/components/shared/AIProcessing";
import { EmptyState } from "@/components/shared/EmptyState";
import { AgentApprovalQueue } from "@/components/admin/AgentApprovalQueue";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_META, fmtDateTime, timeAgo } from "@/lib/format";
import { toast } from "sonner";

type Conv = NonNullable<ReturnType<typeof useInbox>["data"]>[number];
function useInbox(source?: "WHATSAPP" | "WECHAT" | "EMAIL" | "PORTAL") {
  return trpc.comms.inbox.useQuery(source ? { source } : undefined);
}

const SOURCE_ICONS: Record<string, typeof Mail> = {
  WHATSAPP: MessageCircle,
  WECHAT: MessagesSquare,
  EMAIL: Mail,
  PORTAL: MonitorSmartphone,
};

type Extracted = {
  product?: string | null;
  quantity?: number | null;
  destination?: string | null;
  deliveryDate?: string | null;
  specialInstructions?: string | null;
};

export default function AdminCommunications() {
  const [source, setSource] = useState<string>("all");
  const [selected, setSelected] = useState<Conv | null>(null);
  const [processing, setProcessing] = useState(false);
  const utils = trpc.useUtils();

  const inbox = useInbox(source === "all" ? undefined : (source as "WHATSAPP"));
  const summarize = trpc.comms.summarize.useMutation();
  const createCard = trpc.comms.createRequestCard.useMutation({
    onSuccess: (r) => {
      toast.success(`Request Card ${r.requestNumber} created`);
      utils.comms.inbox.invalidate();
      utils.requests.list.invalidate();
      setSelected(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const markSpam = trpc.comms.markSpam.useMutation({
    onSuccess: () => {
      toast.success("Marked as spam");
      utils.comms.inbox.invalidate();
      setSelected(null);
    },
  });
  const clarify = trpc.comms.requestClarification.useMutation({
    onSuccess: () => {
      toast.success("Clarification requested, AI message added to thread");
      utils.comms.inbox.invalidate();
    },
  });
  const simulate = trpc.comms.simulateInbound.useMutation({
    onSuccess: () => {
      toast.success("New inbound inquiry received");
      utils.comms.inbox.invalidate();
    },
  });

  const rows = inbox.data ?? [];

  const columns: Column<Conv>[] = [
    {
      key: "source",
      header: "Source",
      render: (c) => {
        const Icon = SOURCE_ICONS[c.source] ?? Mail;
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${SOURCE_META[c.source]?.color}`}>
            <Icon className="h-4 w-4" /> {SOURCE_META[c.source]?.label}
          </span>
        );
      },
    },
    { key: "buyer", header: "Buyer", searchValue: (c) => c.buyerName ?? "", render: (c) => <span className="font-medium">{c.buyerName}</span> },
    {
      key: "intent",
      header: "AI-extracted intent",
      searchValue: (c) => c.summary ?? "",
      render: (c) => <span className="line-clamp-2 max-w-md text-xs text-muted-foreground">{c.summary ?? "Not summarised yet"}</span>,
    },
    {
      key: "confidence",
      header: "Confidence",
      sortValue: (c) => c.aiConfidence,
      render: (c) => <ConfidenceBadge score={c.aiConfidence} />,
    },
    { key: "status", header: "Status", render: (c) => <StatusPill status={c.status} /> },
    {
      key: "created",
      header: "Received",
      sortValue: (c) => c.createdAt,
      render: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>,
    },
  ];

  const openDetail = async (c: Conv) => {
    setSelected(c);
    if (!c.extracted) {
      setProcessing(true);
      // Simulated AI processing latency (1.5s per PRD)
      await new Promise((r) => setTimeout(r, 1500));
      const result = await summarize.mutateAsync({ id: c.id });
      setProcessing(false);
      setSelected({ ...c, extracted: result.extracted as Extracted, aiConfidence: result.confidence, summary: result.summary });
      utils.comms.inbox.invalidate();
    }
  };

  const extracted = (selected?.extracted as Extracted | null) ?? null;

  return (
    <div>
      <PageHeader
        title="AI Communication Hub"
        description="Unified inbox, WhatsApp, WeChat, email and portal inquiries summarised by AI, approved by humans."
        actions={
          <Button onClick={() => simulate.mutate()} disabled={simulate.isPending} className="bg-teal-500 hover:bg-teal-600 aqf-btn-press">
            <Plus className="mr-1.5 h-4 w-4" /> Simulate inbound inquiry
          </Button>
        }
      />

      {/* Human approval rail, firm offers, recaps, contracts and the per-buyer margin
          all wait here for a human before anything is sent to the buyer. */}
      <AgentApprovalQueue />

      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={openDetail}
        searchPlaceholder="Search buyer or intent…"
        emptyTitle="Inbox zero"
        emptyDescription="New buyer inquiries across WhatsApp, WeChat, email and the portal will land here."
        toolbar={
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-9 w-40" aria-label="Filter by source">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="WECHAT">WeChat</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="PORTAL">Portal</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Detail slide-out */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selected && (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  {selected.buyerName}
                  <ConfidenceBadge score={selected.aiConfidence} />
                  <StatusPill status={selected.status} />
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {SOURCE_META[selected.source]?.label} thread · {fmtDateTime(selected.createdAt)}
                </p>
              </SheetHeader>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Conversation thread */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversation</p>
                  <ChatThread messages={(selected.messages as ChatMessage[]) ?? []} buyerName={selected.buyerName} />
                </div>

                {/* AI extracted data */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI extracted data</p>
                  {processing ? (
                    <AIProcessing label="Extracting intent from conversation…" />
                  ) : extracted ? (
                    <div className="space-y-2.5 rounded-xl border border-teal-500/30 bg-teal-50/50 p-4 dark:bg-teal-500/5">
                      {[
                        ["Product", extracted.product],
                        ["Quantity", extracted.quantity ? `${extracted.quantity} tons` : null],
                        ["Destination", extracted.destination],
                        ["Delivery date", extracted.deliveryDate],
                        ["Special instructions", extracted.specialInstructions],
                      ].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="text-right font-medium">{v ?? "N/A"}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-teal-500/20 pt-2.5">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <ConfidenceBadge score={selected.aiConfidence} />
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={<ScanText className="h-6 w-6" />} title="Not summarised" description="Run the AI summariser to extract structured data." />
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing || summarize.isPending}
                      onClick={async () => {
                        setProcessing(true);
                        await new Promise((r) => setTimeout(r, 1500));
                        const r = await summarize.mutateAsync({ id: selected.id });
                        setProcessing(false);
                        setSelected({ ...selected, extracted: r.extracted as Extracted, aiConfidence: r.confidence, summary: r.summary });
                        utils.comms.inbox.invalidate();
                        toast.success("AI re-summarised the thread");
                      }}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-run AI
                    </Button>
                  </div>

                  <div className="mt-6 space-y-2 border-t border-border pt-5">
                    <Button
                      className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press"
                      disabled={!extracted || createCard.isPending || selected.status === "PROCESSED"}
                      onClick={() => createCard.mutate({ conversationId: selected.id })}
                    >
                      {selected.status === "PROCESSED" ? "Request Card created" : "Create Request Card"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => clarify.mutate({ id: selected.id })} disabled={clarify.isPending}>
                        Request clarification
                      </Button>
                      <Button variant="outline" className="text-danger hover:text-danger" onClick={() => markSpam.mutate({ id: selected.id })} disabled={markSpam.isPending}>
                        Mark as spam
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
