import { useState } from "react";
import { FileText, MessageCircleQuestion, Users } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { InvoiceDownloadButton } from "@/components/shared/InvoiceButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fmtDate, gbp, tons } from "@/lib/format";
import { toast } from "sonner";

type QuoteRow = NonNullable<ReturnType<typeof useQuotes>["data"]>[number];
function useQuotes() {
  return trpc.quotes.mine.useQuery();
}

export default function BuyerQuotes() {
  const quotes = useQuotes();
  const utils = trpc.useUtils();
  const { isMember } = useProfile();
  const [selected, setSelected] = useState<QuoteRow | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [question, setQuestion] = useState("");
  const [acceptedOrder, setAcceptedOrder] = useState<{ orderNumber: string; quote: QuoteRow } | null>(null);

  const accept = trpc.quotes.accept.useMutation({
    onSuccess: (r) => {
      toast.success(`Quote accepted, order ${r.orderNumber} created`);
      setAcceptedOrder({ orderNumber: r.orderNumber, quote: selected! });
      setSelected(null);
      utils.quotes.mine.invalidate();
      utils.orders.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.quotes.rejectByBuyer.useMutation({
    onSuccess: () => {
      toast.success("Quote declined, our team will revisit pricing");
      setRejecting(false);
      setSelected(null);
      utils.quotes.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: Column<QuoteRow>[] = [
    { key: "req", header: "Request", searchValue: (q) => q.request?.requestNumber ?? "", render: (q) => <span className="font-data text-xs font-semibold">{q.request?.requestNumber}</span> },
    { key: "product", header: "Product", render: (q) => <span className="font-medium">{q.request?.product}</span> },
    { key: "qty", header: "Qty", render: (q) => <span className="font-data">{tons(q.request?.quantity)}</span> },
    { key: "total", header: "Total", sortValue: (q) => q.total, render: (q) => <span className="font-data font-bold">{gbp(q.total)}</span> },
    {
      key: "status", header: "Status",
      render: (q) => {
        const expired = q.validUntil && new Date(q.validUntil) < new Date() && q.status === "SENT";
        return <StatusPill status={expired ? "EXPIRED" : q.status} />;
      },
    },
    { key: "expires", header: "Expires", sortValue: (q) => q.validUntil, render: (q) => <span className="text-xs text-muted-foreground">{fmtDate(q.validUntil)}</span> },
    {
      key: "actions", header: "",
      render: (q) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelected(q); }}>View quote</Button>,
    },
  ];

  return (
    <div>
      <PageHeader title="Quotes & Invoices" description="Review AI-prepared quotes, accept to generate your proforma invoice." />

      <DataTable
        columns={columns}
        rows={quotes.data ?? []}
        onRowClick={setSelected}
        emptyTitle="No quotes yet"
        emptyDescription="When the sourcing team prices your requests, quotes will land here."
      />

      {/* Quote detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setRejecting(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Quote · {selected.request?.requestNumber}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {tons(selected.request?.quantity)} {selected.request?.product} → {selected.request?.destination} ({selected.request?.incoterms})
                </p>
              </DialogHeader>

              {/* AI message */}
              {selected.aiMessage && (
                <div className="rounded-xl border border-teal-500/30 bg-teal-50/50 p-3.5 dark:bg-teal-500/5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                    <Users className="h-3.5 w-3.5" /> From your sourcing team
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed">{selected.aiMessage}</p>
                </div>
              )}

              {/* Breakdown */}
              <div className="rounded-xl border border-border p-4">
                {isMember ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Product cost</span><span className="font-data">{gbp(selected.productCost)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-data">{gbp(selected.shippingCost)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Clearing & duties</span><span className="font-data">{gbp(selected.clearingCost)}</span></div>
                    <div className="flex justify-between text-teal-600 font-medium"><span>Margin (member benefit)</span><span className="font-data">£0</span></div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span className="font-data">{gbp(selected.total)}</span></div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-base font-bold"><span>All-inclusive total</span><span className="font-data">{gbp(selected.total)}</span></div>
                    <p className="text-xs text-muted-foreground">Includes product, freight, insurance, clearing & duties.</p>
                  </div>
                )}
                <p className="mt-2.5 text-xs text-muted-foreground">Valid until {fmtDate(selected.validUntil)}</p>
              </div>

              {selected.status === "SENT" ? (
                rejecting ? (
                  <div className="space-y-2">
                    <Label htmlFor="decline-reason">Why are you declining?</Label>
                    <Textarea id="decline-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Price above budget, can you re-source?" />
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setRejecting(false)}>Keep quote</Button>
                      <Button className="flex-1 bg-danger hover:bg-danger/90" disabled={reason.length < 2 || reject.isPending} onClick={() => reject.mutate({ id: selected.id, reason })}>
                        Decline quote
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="col-span-2 bg-teal-500 hover:bg-teal-600 aqf-btn-press" disabled={accept.isPending} onClick={() => accept.mutate({ id: selected.id })}>
                      Accept quote, generate proforma invoice
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(true)}>Decline</Button>
                    <Button variant="outline" onClick={() => toast.success("Question sent to the sourcing team, reply lands in your notifications")}>
                      <MessageCircleQuestion className="mr-1.5 h-4 w-4" /> Ask a question
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">This quote is</span>
                  <StatusPill status={selected.status} />
                </div>
              )}

              {selected.status === "SENT" && (
                <div>
                    <Label htmlFor="q-question" className="text-xs">Quick question</Label>
                    <div className="mt-1 flex gap-2">
                    <Textarea id="q-question" rows={1} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about timings, grades, payment terms…" />
                    <Button variant="outline" disabled={!question.trim()} onClick={() => { toast.success("Question sent"); setQuestion(""); }}>Send</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Accepted: invoice ready */}
      <Dialog open={!!acceptedOrder} onOpenChange={(o) => !o && setAcceptedOrder(null)}>
        <DialogContent className="max-w-md text-center">
          {acceptedOrder && (
            <div className="py-4">
              <div className="aqf-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <DialogTitle className="mt-4">Proforma invoice ready</DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Order <span className="font-data font-semibold text-foreground">{acceptedOrder.orderNumber}</span> created.
                Pay the proforma within 7 days to lock pricing, bank details are on the invoice.
              </p>
              <div className="mt-5 flex justify-center">
                <InvoiceDownloadButton
                  label="Download proforma PDF"
                  data={{
                    invoiceNumber: `INV-${acceptedOrder.orderNumber.slice(4)}`,
                    type: "PROFORMA",
                    date: new Date(),
                    dueDate: new Date(Date.now() + 7 * 864e5),
                    buyerName: acceptedOrder.quote.request?.requestNumber ?? "Buyer",
                    buyerOrg: null,
                    orderNumber: acceptedOrder.orderNumber,
                    product: acceptedOrder.quote.request?.product ?? "",
                    quantity: Number(acceptedOrder.quote.request?.quantity ?? 0),
                    productCost: acceptedOrder.quote.productCost,
                    shippingCost: acceptedOrder.quote.shippingCost,
                    clearingCost: acceptedOrder.quote.clearingCost,
                    total: acceptedOrder.quote.total,
                    showBreakdown: isMember,
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
