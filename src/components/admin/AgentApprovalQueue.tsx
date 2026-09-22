import { useState } from "react";
import { BadgeDollarSign, Check, FileSignature, Mail, Pencil, ShieldAlert, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

type Draft = NonNullable<ReturnType<typeof useQueue>["data"]>[number];
function useQueue() {
  return trpc.agent.queue.useQuery({ status: "PENDING" });
}

type MarginPayload = {
  dealType?: string;
  buyerMarginProfilePct?: number;
  appliedPct?: number;
  inputs?: {
    buyPricePerMt?: number; freightPerMt?: number; quantityMt?: number;
    marginPerMt?: number; sellPricePerMt?: number; currency?: string;
  };
  rationale?: Record<string, string>;
};

const KIND_META: Record<string, { label: string; icon: typeof Mail; cls: string }> = {
  MARGIN_REVIEW: { label: "Margin review", icon: BadgeDollarSign, cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  FIRM_OFFER: { label: "Firm offer", icon: Mail, cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  RECAP: { label: "Trade recap", icon: FileSignature, cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  CONTRACT: { label: "Contract", icon: FileSignature, cls: "bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-200" },
  STATUS_UPDATE: { label: "Status update", icon: Mail, cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" },
};

const money = (cur: string | undefined, n: number | undefined) =>
  n == null ? "N/A" : `${cur ?? "USD"} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MarginBreakdown({ payload }: { payload: MarginPayload }) {
  const i = payload.inputs ?? {};
  const cur = i.currency;
  const isZero = payload.dealType === "AQ_ZERO";
  return (
    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50/50 p-3 dark:bg-amber-500/5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        <div><p className="text-muted-foreground">Buy side /MT</p><p className="font-data font-semibold">{money(cur, i.buyPricePerMt)}</p></div>
        <div><p className="text-muted-foreground">Freight /MT</p><p className="font-data font-semibold">{money(cur, i.freightPerMt)}</p></div>
        <div><p className="text-muted-foreground">Buyer profile</p><p className="font-data font-semibold">{payload.buyerMarginProfilePct ?? 0}%</p></div>
        <div>
          <p className="text-muted-foreground">Margin /MT</p>
          <p className={`font-data font-semibold ${isZero ? "text-teal-600 dark:text-teal-400" : "text-amber-700 dark:text-amber-300"}`}>
            {isZero ? "0.00 (AQ Zero)" : `${money(cur, i.marginPerMt)} @ ${payload.appliedPct ?? 0}%`}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Proposed sell /MT (buyer-facing)</p>
          <p className="font-data text-base font-bold text-foreground">{money(cur, i.sellPricePerMt)}</p>
        </div>
      </div>
      {payload.rationale && (
        <ul className="mt-2.5 space-y-1 border-t border-amber-500/20 pt-2.5 text-[11px] text-muted-foreground">
          {Object.values(payload.rationale).map((r, j) => <li key={j}>· {r}</li>)}
        </ul>
      )}
    </div>
  );
}

function DraftCard({ draft }: { draft: Draft }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [editText, setEditText] = useState(draft.draftText);
  const [note, setNote] = useState("");

  const meta = KIND_META[draft.kind] ?? KIND_META.STATUS_UPDATE;
  const Icon = meta.icon;
  const payload = (draft.payload as MarginPayload | null) ?? {};

  const invalidate = () => {
    utils.agent.queue.invalidate();
    utils.trade.list.invalidate();
    utils.comms.inbox.invalidate();
  };
  const approve = trpc.agent.approve.useMutation({
    onSuccess: () => {
      toast.success(draft.kind === "MARGIN_REVIEW" ? "Margin approved & sent to buyer" : "Approved & sent");
      setEditing(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.agent.reject.useMutation({
    onSuccess: () => { toast.success("Draft rejected"); setRejecting(false); setNote(""); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="aqf-card-3d p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        {draft.tradeRef && <span className="font-data text-[11px] text-muted-foreground">{draft.tradeRef}</span>}
        <span className="text-[11px] text-muted-foreground">· {timeAgo(draft.createdAt)}</span>
        {draft.kind === "MARGIN_REVIEW" && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-500/15 dark:text-red-300">
            <ShieldAlert className="h-3 w-3" /> Human approval required
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold">{draft.title}</p>
      {draft.buyerName && <p className="text-xs text-muted-foreground">To: {draft.buyerName}</p>}

      {draft.kind === "MARGIN_REVIEW" && <MarginBreakdown payload={payload} />}

      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-data text-[11px] leading-relaxed">
        {draft.draftText}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 aqf-btn-press" disabled={approve.isPending}
          onClick={() => approve.mutate({ draftId: draft.id })}>
          <Check className="mr-1 h-3.5 w-3.5" /> {draft.kind === "MARGIN_REVIEW" ? "Approve margin & send" : "Approve & send"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditText(draft.draftText); setEditing(true); }}>
          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit before send
        </Button>
        <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={() => setRejecting(true)}>
          <X className="mr-1 h-3.5 w-3.5" /> Reject
        </Button>
      </div>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={(o) => !o && setEditing(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit before send, {meta.label}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            The edited text is re-screened against the trade's protected-entity set before release, a leak refuses the send even after approval.
          </p>
          <Textarea className="mt-2 min-h-56 font-data text-xs" value={editText} onChange={(e) => setEditText(e.target.value)} />
          <Button className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700" disabled={approve.isPending || !editText.trim()}
            onClick={() => approve.mutate({ draftId: draft.id, editedText: editText })}>
            Approve edited version & send
          </Button>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejecting} onOpenChange={(o) => !o && setRejecting(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject, {meta.label}</DialogTitle></DialogHeader>
          <Label className="text-xs text-muted-foreground">Reason (audit-logged)</Label>
          <Textarea className="mt-1.5 min-h-20 text-sm" placeholder="e.g. Margin too thin for this lane, re-read freight…" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="mt-3 w-full" variant="outline" disabled={note.trim().length < 2 || reject.isPending}
            onClick={() => reject.mutate({ draftId: draft.id, note: note.trim() })}>
            Reject draft
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Human approval rail inside the AI communication channel.
 * Every AI commitment point, firm offer, recap, contract, and above all the
 * per-buyer profit margin, waits here until a human releases it.
 */
export function AgentApprovalQueue() {
  const queue = useQueue();
  const drafts = queue.data ?? [];

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold tracking-tight">Human approval queue</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${drafts.length ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
          {drafts.length} pending
        </span>
        <p className="w-full text-xs text-muted-foreground sm:w-auto sm:flex-1 sm:text-right">
          Nothing reaches a buyer until a human approves it here, margins included.
        </p>
      </div>
      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Queue clear, the AI agent is holding nothing for review.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {drafts.map((d) => <DraftCard key={d.id} draft={d} />)}
        </div>
      )}
    </section>
  );
}
