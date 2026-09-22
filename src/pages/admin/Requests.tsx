import { useMemo, useState } from "react";
import { FileCheck, Languages, Reply, Send, StepForward } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { AIProcessing } from "@/components/shared/AIProcessing";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REQUEST_STATUSES } from "@contracts/constants";
import { fmtDate, gbp, statusLabel, tons, timeAgo } from "@/lib/format";
import { toast } from "sonner";

type Req = NonNullable<ReturnType<typeof useList>["data"]>[number];
function useList() {
  return trpc.requests.list.useQuery();
}

export default function AdminRequests() {
  const [tab, setTab] = useState("ALL");
  const [quoteFlow, setQuoteFlow] = useState<Req | null>(null);
  const utils = trpc.useUtils();
  const list = useList();

  const rows = useMemo(() => {
    const all = (list.data ?? []).filter((r) => !r.archived);
    return tab === "ALL" ? all : all.filter((r) => r.status === tab);
  }, [list.data, tab]);

  const counts = useMemo(() => {
    const all = (list.data ?? []).filter((r) => !r.archived);
    const map: Record<string, number> = { ALL: all.length };
    for (const r of all) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [list.data]);

  const columns: Column<Req>[] = [
    { key: "id", header: "Request", searchValue: (r) => r.requestNumber, sortValue: (r) => r.requestNumber, render: (r) => <span className="font-data text-xs font-semibold">{r.requestNumber}</span> },
    {
      key: "buyer", header: "Buyer", searchValue: (r) => `${r.buyer?.name} ${r.buyer?.organization?.name ?? ""}`,
      render: (r) => (
        <div>
          <p className="text-sm font-medium">{r.buyer?.organization?.name ?? r.buyer?.name}</p>
          <p className="text-[11px] text-muted-foreground">{r.buyer?.name}</p>
        </div>
      ),
    },
    { key: "product", header: "Product", render: (r) => <span className="font-medium">{r.product}</span> },
    { key: "qty", header: "Qty", sortValue: (r) => Number(r.quantity), render: (r) => <span className="font-data">{tons(r.quantity)}</span> },
    { key: "dest", header: "Destination", searchValue: (r) => r.destination, render: (r) => <span className="text-sm">{r.destination}</span> },
    { key: "channel", header: "Channel", render: (r) => <span className="text-xs text-muted-foreground">{r.originChannel}</span> },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    {
      key: "created", header: "Created", sortValue: (r) => r.createdAt,
      render: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>,
    },
    {
      key: "actions", header: "",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setQuoteFlow(r); }}>
          Create quote
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Request Management" description="Every sourcing request, from first inquiry to completed delivery." />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="aqf-scroll h-auto max-w-full flex-nowrap justify-start overflow-x-auto">
          <TabsTrigger value="ALL">All ({counts.ALL ?? 0})</TabsTrigger>
          {REQUEST_STATUSES.slice(0, 8).map((s) => (
            <TabsTrigger key={s} value={s}>
              {statusLabel(s)} {counts[s] ? `(${counts[s]})` : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="No requests in this view"
        emptyDescription="Requests created from the AI inbox or buyer portal will appear here."
      />

      {quoteFlow && (
        <QuoteFlowDialog
          request={quoteFlow}
          onClose={() => setQuoteFlow(null)}
          onDone={() => {
            setQuoteFlow(null);
            utils.requests.list.invalidate();
            utils.quotes.list.invalidate();
            utils.supplier.inbox.invalidate();
            utils.admin.stats.invalidate();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Quote flow: supplier select → AI bilingual message → costs   */
/* → send → supplier reply simulation → draft queue                    */
/* ------------------------------------------------------------------ */
function QuoteFlowDialog({ request, onClose, onDone }: { request: Req; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [supplierIds, setSupplierIds] = useState<number[]>([]);
  const [lang, setLang] = useState<"EN" | "ZH">("EN");
  const [message, setMessage] = useState(
    `AQUIFERT request: please quote your best price per ton for ${Number(request.quantity)}t ${request.product}, delivery to ${request.destination} (${request.incoterms}). Confirm availability and earliest ship date.`,
  );
  const [costs, setCosts] = useState({ product: "", shipping: "", clearing: "", marginPct: "8" });
  const [aiBusy, setAiBusy] = useState(false);

  const directory = trpc.admin.directory.useQuery();
  const send = trpc.requests.sendToSuppliers.useMutation();
  const simulateReply = trpc.quotes.simulateSupplierReply.useMutation();

  const suppliers = directory.data?.suppliers ?? [];
  const suppliersReady = step >= 2 && directory.isLoading;

  const zhMessage = `【AQUIFERT】询价请求:请为 ${Number(request.quantity)}吨 ${request.product} 报每吨最优价格,交货至 ${request.destination}(${request.incoterms})。请确认货源及最早装船日期。`;

  const toggleSupplier = (id: number) =>
    setSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const subtotal = (Number(costs.product) || 0) + (Number(costs.shipping) || 0) + (Number(costs.clearing) || 0);
  const margin = Math.round(subtotal * (Number(costs.marginPct) || 0)) / 100;

  const steps = ["Select suppliers", "AI message", "Costing", "Send", "Supplier reply", "Draft queued"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create quote · <span className="font-data text-sm">{request.requestNumber}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {tons(request.quantity)} {request.product} → {request.destination} · due {fmtDate(request.deliveryDate)}
          </p>
        </DialogHeader>

        {/* Stepper */}
        <div className="aqf-scroll mb-5 flex gap-1 overflow-x-auto">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                step === i + 1 ? "bg-navy-600 text-white" : step > i + 1 ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Select supplier(s) to approach:</p>
            {suppliersReady ? <AIProcessing label="Loading supplier directory…" /> : (
              <div className="space-y-2">
                {suppliers.map((sup) => (
                  <label
                    key={sup.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                      supplierIds.includes(sup.id) ? "border-teal-500 bg-teal-50/60 dark:bg-teal-500/10" : "border-border hover:border-teal-500/40"
                    }`}
                  >
                    <Checkbox checked={supplierIds.includes(sup.id)} onCheckedChange={() => toggleSupplier(sup.id)} aria-label={`Select ${sup.name}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{sup.organization?.name ?? sup.name}</p>
                      <p className="text-xs text-muted-foreground">{sup.name} · {sup.organization?.country}</p>
                    </div>
                    {sup.organization?.verified && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">VERIFIED</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <Button className="w-full bg-navy-600 hover:bg-navy-700" disabled={supplierIds.length === 0} onClick={() => setStep(2)}>
              Continue <StepForward className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">AI-generated supplier message</p>
              <Button variant="outline" size="sm" onClick={() => setLang(lang === "EN" ? "ZH" : "EN")}>
                <Languages className="mr-1.5 h-3.5 w-3.5" /> {lang === "EN" ? "中文" : "English"}
              </Button>
            </div>
            {lang === "EN" ? (
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} aria-label="Supplier message (English)" />
            ) : (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm leading-relaxed">{zhMessage}</div>
            )}
            <p className="text-[11px] text-muted-foreground">Both versions are sent, English and Mandarin.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1 bg-navy-600 hover:bg-navy-700" onClick={() => setStep(3)}>Continue to costing</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Review margin & logistics estimate (internal, hidden from buyer):</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-product">Product cost (£)</Label>
                <Input id="c-product" type="number" value={costs.product} onChange={(e) => setCosts({ ...costs, product: e.target.value })} placeholder="31400" />
              </div>
              <div>
                <Label htmlFor="c-shipping">Shipping (£)</Label>
                <Input id="c-shipping" type="number" value={costs.shipping} onChange={(e) => setCosts({ ...costs, shipping: e.target.value })} placeholder="5900" />
              </div>
              <div>
                <Label htmlFor="c-clearing">Clearing (£)</Label>
                <Input id="c-clearing" type="number" value={costs.clearing} onChange={(e) => setCosts({ ...costs, clearing: e.target.value })} placeholder="1750" />
              </div>
              <div>
                <Label htmlFor="c-margin">Margin (%)</Label>
                <Input id="c-margin" type="number" value={costs.marginPct} onChange={(e) => setCosts({ ...costs, marginPct: e.target.value })} />
              </div>
            </div>
            <div className="rounded-xl bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>Cost subtotal</span><span className="font-data">{gbp(subtotal)}</span></div>
              <div className="flex justify-between text-amber-600"><span>Margin ({costs.marginPct}%)</span><span className="font-data">{gbp(margin)}</span></div>
              <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold"><span>Estimated total</span><span className="font-data">{gbp(subtotal + margin)}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1 bg-navy-600 hover:bg-navy-700" onClick={() => setStep(4)}>Review & send</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-4 text-sm">
              <p className="font-semibold">Ready to send to {supplierIds.length} supplier(s)</p>
              <p className="mt-1 text-muted-foreground">
                The bilingual message will be delivered via WeChat/email. Status moves to <StatusPill status="QUOTED" className="mx-1" />.
              </p>
            </div>
            <Button
              className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press"
              disabled={send.isPending}
              onClick={async () => {
                try {
                  await send.mutateAsync({ requestId: request.id, supplierIds, message });
                  toast.success("Sent to suppliers, bilingual message delivered");
                  setStep(5);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Send className="mr-1.5 h-4 w-4" /> Send to suppliers
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            {aiBusy ? (
              <AIProcessing label="Supplier replying… AI rewriting into buyer-friendly quote…" />
            ) : (
              <div className="rounded-xl border border-border p-4 text-sm">
                <p className="font-semibold">Waiting for supplier reply</p>
                <p className="mt-1 text-muted-foreground">
                  In production this arrives via WeChat/email. For the demo, simulate the reply, the AI will rewrite it into a buyer-friendly draft quote.
                </p>
              </div>
            )}
            <Button
              className="w-full bg-navy-600 hover:bg-navy-700"
              disabled={aiBusy}
              onClick={async () => {
                setAiBusy(true);
                await new Promise((r) => setTimeout(r, 1800));
                try {
                  const r = await simulateReply.mutateAsync({ requestId: request.id });
                  toast.success(`AI drafted a quote, ${gbp(r.total)} total`);
                  setStep(6);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setAiBusy(false);
                }
              }}
            >
              <Reply className="mr-1.5 h-4 w-4" /> Simulate supplier reply
            </Button>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 text-center">
            <div className="aqf-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Draft quote is in the approval queue</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A human must approve it in the Draft Queue before it reaches the buyer.
              </p>
            </div>
            <Button className="w-full bg-teal-500 hover:bg-teal-600" onClick={onDone}>Done, open queue later</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
