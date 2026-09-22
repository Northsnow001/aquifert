import { useMemo, useState } from "react";
import { CheckCircle2, KanbanSquare, Pencil, Send, XCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { gbp, tons, timeAgo } from "@/lib/format";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

type Quote = NonNullable<ReturnType<typeof useQuotes>["data"]>[number];
function useQuotes() {
  return trpc.quotes.list.useQuery();
}

const COLUMNS: { key: string; title: string; statuses: string[] }[] = [
  { key: "pending", title: "Pending Approval", statuses: ["PENDING_APPROVAL", "DRAFT"] },
  { key: "sent", title: "Sent", statuses: ["SENT"] },
  { key: "accepted", title: "Accepted", statuses: ["ACCEPTED"] },
  { key: "rejected", title: "Rejected", statuses: ["REJECTED"] },
];

export default function AdminDrafts() {
  const quotes = useQuotes();
  const [editing, setEditing] = useState<Quote | null>(null);
  const [rejecting, setRejecting] = useState<Quote | null>(null);
  const utils = trpc.useUtils();
  const { portalRole } = useProfile();
  const canSeeMargins = ["ADMIN", "FINANCE", "OPERATIONS"].includes(portalRole ?? "");

  const approve = trpc.quotes.approveAndSend.useMutation({
    onSuccess: () => {
      toast.success("Quote approved & sent, buyer notified via WhatsApp");
      utils.quotes.list.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const all = quotes.data ?? [];
    return COLUMNS.map((c) => ({ ...c, items: all.filter((q) => c.statuses.includes(q.status)) }));
  }, [quotes.data]);

  return (
    <div>
      <PageHeader
        title="Quote Draft Queue"
        description="Human-in-the-loop: every AI-drafted quote is reviewed before it reaches a buyer."
      />

      {quotes.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : (quotes.data ?? []).length === 0 ? (
        <EmptyState
          icon={<KanbanSquare className="h-7 w-7" />}
          title="No quotes yet"
          description="Create a quote from the Requests page, AI drafts will queue here for approval."
        />
      ) : (
        <div className="aqf-scroll grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
          {grouped.map((col) => (
            <div key={col.key} className="min-w-[260px] rounded-xl bg-muted/50 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{col.title}</p>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold font-data">{col.items.length}</span>
              </div>
              <div className="space-y-3">
                {col.items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                )}
                {col.items.map((q) => (
                  <div key={q.id} className="aqf-card-hover rounded-xl border border-border bg-card p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {q.request?.buyer?.organization?.name ?? q.request?.buyer?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tons(q.request?.quantity)} {q.request?.product} · {q.request?.destination}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusPill status={q.status} />
                        {q.compliant === false ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-500/10">Non-compliant, excluded from ranking</span>
                        ) : q.landedCostRank ? (
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            Landed-cost rank #{q.landedCostRank}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="font-data text-lg font-bold">{gbp(q.total)}</p>
                        {canSeeMargins ? (
                          <p className="text-[11px] font-medium text-amber-600">margin {gbp(q.margin)} ({q.marginPercentage}%)</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">margin hidden</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(q.createdAt)}</span>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => setEditing(q)}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      {["PENDING_APPROVAL", "DRAFT"].includes(q.status) && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 flex-1 bg-teal-500 text-xs hover:bg-teal-600"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate({ id: q.id })}
                          >
                            <Send className="mr-1 h-3 w-3" /> Approve & send
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-danger" onClick={() => setRejecting(q)} aria-label="Reject quote">
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <QuoteEditor
          quote={editing}
          canSeeMargins={canSeeMargins}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            utils.quotes.list.invalidate();
          }}
        />
      )}
      {rejecting && (
        <RejectDialog
          quote={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            utils.quotes.list.invalidate();
          }}
        />
      )}
    </div>
  );
}

function QuoteEditor({ quote, canSeeMargins, onClose, onSaved }: { quote: Quote; canSeeMargins: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    productCost: String(quote.productCost),
    shippingCost: String(quote.shippingCost),
    clearingCost: String(quote.clearingCost),
    marginPercentage: String(quote.marginPercentage),
    aiMessage: quote.aiMessage ?? "",
  });
  const update = trpc.quotes.update.useMutation({
    onSuccess: () => {
      toast.success("Quote updated, totals recalculated");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });
  const approve = trpc.quotes.approveAndSend.useMutation({
    onSuccess: () => {
      toast.success("Approved & sent to buyer");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const n = (v: string) => Number(v) || 0;
  const sub = n(form.productCost) + n(form.shippingCost) + n(form.clearingCost);
  const margin = Math.round(sub * n(form.marginPercentage)) / 100;
  const total = sub + margin;
  const isMember = Boolean((quote.request?.buyer as { id?: number })?.id); // membership resolved server-side; preview approximates
  void isMember;

  const field = (key: keyof typeof form, label: string, disabled = false) => (
    <div>
      <Label htmlFor={`e-${key}`}>{label}</Label>
      <Input
        id={`e-${key}`}
        type="number"
        value={form[key]}
        disabled={disabled}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quote editor · {quote.request?.requestNumber}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {tons(quote.request?.quantity)} {quote.request?.product} → {quote.request?.destination} · buyer {quote.request?.buyer?.name}
          </p>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Costing */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cost breakdown</p>
            {field("productCost", "Product cost (£)")}
            {field("shippingCost", "Shipping (£)")}
            {field("clearingCost", "Clearing (£)")}
            {canSeeMargins ? field("marginPercentage", "Margin (%)") : (
              <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                Margin fields are hidden from your role.
              </p>
            )}
            <div className="rounded-xl bg-navy-600 p-3.5 text-white">
              <div className="flex justify-between text-sm"><span className="text-white/70">Subtotal</span><span className="font-data">{gbp(sub)}</span></div>
              {canSeeMargins && (
                <div className="flex justify-between text-sm"><span className="text-white/70">Margin</span><span className="font-data">{gbp(margin)}</span></div>
              )}
              <div className="mt-1.5 flex justify-between border-t border-white/20 pt-1.5 font-bold">
                <span>Total</span><span className="font-data text-teal-300">{gbp(total)}</span>
              </div>
            </div>
          </div>

          {/* Message preview */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyer message preview</p>
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-sm">
              <p className="leading-relaxed">{form.aiMessage || "AI message will appear here."}</p>
              <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                <p className="font-semibold text-muted-foreground">Buyer sees:</p>
                <div className="flex justify-between"><span>Product cost</span><span className="font-data">{gbp(n(form.productCost))}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span className="font-data">{gbp(n(form.shippingCost))}</span></div>
                <div className="flex justify-between"><span>Clearing</span><span className="font-data">{gbp(n(form.clearingCost))}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span className="font-data">{gbp(sub + (canSeeMargins ? margin : margin))}</span></div>
                <p className="pt-1 text-[10px] text-muted-foreground">
                  Members see the full cost-to-cost breakdown (no margin line). Non-members see the total only.
                </p>
              </div>
            </div>
            <Label htmlFor="e-msg">Edit AI message</Label>
            <Textarea id="e-msg" rows={3} value={form.aiMessage} onChange={(e) => setForm({ ...form, aiMessage: e.target.value })} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                id: quote.id,
                productCost: n(form.productCost),
                shippingCost: n(form.shippingCost),
                clearingCost: n(form.clearingCost),
                marginPercentage: n(form.marginPercentage),
                aiMessage: form.aiMessage,
              })
            }
          >
            Save changes
          </Button>
          <Button
            className="bg-teal-500 hover:bg-teal-600 aqf-btn-press"
            disabled={approve.isPending}
            onClick={() => approve.mutate({ id: quote.id })}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve & send to buyer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ quote, onClose, onDone }: { quote: Quote; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const reject = trpc.quotes.reject.useMutation({
    onSuccess: () => {
      toast.success("Quote rejected, AI will re-process with your feedback");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject quote #{quote.id}</DialogTitle>
        </DialogHeader>
        <Label htmlFor="rej-reason">Reason (sent back to the AI for re-processing)</Label>
        <Textarea
          id="rej-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Margin too thin for DDP terms, re-source from alternative supplier."
        />
        <Button
          className="mt-3 w-full bg-danger hover:bg-danger/90"
          disabled={reason.length < 2 || reject.isPending}
          onClick={() => reject.mutate({ id: quote.id, reason })}
        >
          Reject quote
        </Button>
      </DialogContent>
    </Dialog>
  );
}
