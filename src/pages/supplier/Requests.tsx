import { useState } from "react";
import { BadgeCheck, CalendarIcon, FileCheck, Send } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/providers/trpc";
import { useSupplierText } from "./lang";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import { AIProcessing } from "@/components/shared/AIProcessing";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_META, type Product } from "@contracts/constants";
import { fmtDate, timeAgo, tons } from "@/lib/format";
import { toast } from "sonner";

type Assignment = NonNullable<ReturnType<typeof useInbox>["data"]>[number];
function useInbox() {
  return trpc.supplier.inbox.useQuery();
}

export default function SupplierRequests() {
  const t = useSupplierText();
  const inbox = useInbox();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ pricePerTon: "", currency: "USD" as "USD" | "GBP", available: true, shipDate: undefined as Date | undefined, notes: "" });

  const submitQuote = trpc.supplier.submitQuote.useMutation({
    onSuccess: (res) => {
      setSentMessage(res.message);
      utils.supplier.inbox.invalidate();
      utils.supplier.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openDetail = (a: Assignment) => {
    setSelected(a);
    setSentMessage(null);
    setForm({ pricePerTon: "", currency: "USD", available: true, shipDate: undefined, notes: "" });
  };

  const columns: Column<Assignment>[] = [
    { key: "num", header: t("Request", "询价单号"), render: (a) => <span className="font-data text-xs font-semibold">{a.request?.requestNumber}</span> },
    {
      key: "product", header: t("Product", "产品"), sortValue: (a) => a.request?.product ?? "",
      render: (a) => (
        <div>
          <p className="text-sm font-semibold">{a.request ? PRODUCT_META[a.request.product as Product].label : "N/A"}</p>
          <p className="font-data text-[11px] text-muted-foreground">{a.request ? PRODUCT_META[a.request.product as Product].formula : ""}</p>
        </div>
      ),
    },
    { key: "qty", header: t("Quantity", "数量"), sortValue: (a) => Number(a.request?.quantity ?? 0), render: (a) => <span className="font-data">{a.request ? tons(Number(a.request.quantity)) : ""}</span> },
    { key: "dest", header: t("Destination", "目的地"), render: (a) => a.request?.destination },
    { key: "delivery", header: t("Delivery by", "交付期限"), sortValue: (a) => a.request?.deliveryDate, render: (a) => <span className="text-xs text-muted-foreground">{a.request?.deliveryDate ? fmtDate(a.request.deliveryDate) : "N/A"}</span> },
    { key: "received", header: t("Received", "收到时间"), sortValue: (a) => a.createdAt, render: (a) => <span className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span> },
    { key: "status", header: t("Status", "状态"), render: (a) => <StatusPill status={a.status} /> },
    {
      key: "action", header: "", render: (a) => (
        <Button size="sm" variant={a.status === "NEW" ? "default" : "outline"} className={a.status === "NEW" ? "bg-teal-500 hover:bg-teal-600" : ""} onClick={(e) => { e.stopPropagation(); openDetail(a); }}>
          {a.status === "NEW" ? t("Quote now", "立即报价") : t("View", "查看")}
        </Button>
      ),
    },
  ];

  const req = selected?.request;
  const estTotal = form.pricePerTon && req ? Number(form.pricePerTon) * Number(req.quantity) : 0;

  return (
    <div>
      <PageHeader
        title={t("Request Inbox", "询价收件箱")}
        description={t("Quote requests matched to your product catalog. Fast replies win orders.", "与您产品目录匹配的询价请求。快速回复赢得订单。")}
      />
      <DataTable
        columns={columns}
        rows={inbox.data ?? []}
        onRowClick={openDetail}
        emptyTitle={t("No requests yet", "暂无询价请求")}
        emptyDescription={t("AQUIFERT notifies you on WhatsApp & WeChat when a matching request arrives.", "当有匹配的询价时，AQUIFERT 会通过 WhatsApp 和微信通知您。")}
      />

      <Dialog open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-data">{req?.requestNumber}</DialogTitle>
          </DialogHeader>
          {req && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-sm">
                <div><p className="text-xs text-muted-foreground">{t("Product", "产品")}</p><p className="font-semibold">{PRODUCT_META[req.product as Product].label}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("Quantity", "数量")}</p><p className="font-data font-semibold">{tons(Number(req.quantity))}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("Destination", "目的地")}</p><p className="font-semibold">{req.destination}</p></div>
                <div><p className="text-xs text-muted-foreground">{t("Delivery by", "交付期限")}</p><p className="font-semibold">{fmtDate(req.deliveryDate)}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Incoterms</p><p className="font-semibold">{req.incoterms}</p></div>
              </div>

              {selected?.supplierMessage && (
                <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm dark:border-navy-900 dark:bg-navy-900/20">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy dark:text-navy-100"><BadgeCheck className="h-3.5 w-3.5" /> AQUIFERT</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{selected.supplierMessage}</p>
                </div>
              )}

              {sentMessage ? (
                <div className="aqf-pop space-y-3">
                  <div className="rounded-xl border border-teal-300 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-500/10">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                      <FileCheck className="h-3.5 w-3.5" /> {t("AI drafted buyer-ready quote, pending AQUIFERT approval", "AI 已生成专业买家报价, 等待 AQUIFERT 审核")}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-teal-900 dark:text-teal-100">{sentMessage}</p>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>{t("Done", "完成")}</Button>
                </div>
              ) : submitQuote.isPending ? (
                <AIProcessing label={t("AI is rewriting your quote for the buyer…", "AI 正在为买家整理您的报价…")} />
              ) : selected?.status === "NEW" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="sq-price">{t("Price per ton", "每吨价格")}</Label>
                      <Input id="sq-price" type="number" min="0" step="0.01" value={form.pricePerTon} onChange={(e) => setForm({ ...form, pricePerTon: e.target.value })} placeholder="385" className="font-data" />
                    </div>
                    <div>
                      <Label>{t("Currency", "币种")}</Label>
                      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                        {(["USD", "GBP"] as const).map((c) => (
                          <button key={c} onClick={() => setForm({ ...form, currency: c })} className={`rounded-md px-2 py-1.5 text-xs font-bold ${form.currency === c ? "bg-navy text-white" : "text-muted-foreground"}`}>{c}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {estTotal > 0 && (
                    <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      {t("Estimated order value", "预估订单金额")}: <span className="font-data font-bold text-foreground">{form.currency} {estTotal.toLocaleString()}</span>
                    </p>
                  )}
                  <div>
                    <Label>{t("Earliest ship date", "最早装运日期")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.shipDate ? format(form.shipDate, "PPP") : t("Pick a date", "选择日期")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.shipDate} onSelect={(d) => setForm({ ...form, shipDate: d })} /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-semibold">{t("Product available", "有现货")}</p>
                      <p className="text-xs text-muted-foreground">{t("Confirm you can fulfil this quantity", "确认您可以满足该数量")}</p>
                    </div>
                    <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} aria-label="Availability" />
                  </div>
                  <div>
                    <Label htmlFor="sq-notes">{t("Notes for the buyer (optional)", "给买家的备注（可选）")}</Label>
                    <Textarea id="sq-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder={t("e.g. prilled urea, 50kg bags, CFR terms available", "例如：颗粒尿素，50kg 袋装，可提供 CFR 条款")} />
                  </div>
                  <Button
                    className="w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press"
                    disabled={!form.pricePerTon || Number(form.pricePerTon) <= 0}
                    onClick={() => selected && submitQuote.mutate({
                      supplierRequestId: selected.id,
                      pricePerTon: Number(form.pricePerTon),
                      currency: form.currency,
                      available: form.available,
                      earliestShipDate: form.shipDate,
                      notes: form.notes || undefined,
                    })}
                  >
                    <Send className="mr-1.5 h-4 w-4" /> {t("Submit quote, AI will polish it", "提交报价, AI 将自动润色")}
                  </Button>
                </div>
              ) : (
                <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
                  {t("Quote already submitted, AQUIFERT is reviewing it.", "报价已提交, AQUIFERT 正在审核。")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
