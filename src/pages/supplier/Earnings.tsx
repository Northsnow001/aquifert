import { Download, Hourglass, PiggyBank, Wallet } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useSupplierText } from "./lang";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate, gbp } from "@/lib/format";
import { toast } from "sonner";

type Txn = NonNullable<ReturnType<typeof useEarnings>["data"]>["transactions"][number];
function useEarnings() {
  return trpc.supplier.earnings.useQuery();
}

export default function SupplierEarnings() {
  const t = useSupplierText();
  const earnings = useEarnings();

  const columns: Column<Txn>[] = [
    { key: "date", header: t("Date", "日期"), sortValue: (x) => x.date, render: (x) => <span className="text-xs text-muted-foreground">{fmtDate(x.date)}</span> },
    { key: "order", header: t("Order", "订单号"), render: (x) => <span className="font-data text-xs font-semibold">{x.orderNumber}</span> },
    { key: "amount", header: t("Amount", "金额"), sortValue: (x) => x.amount, render: (x) => <span className="font-data font-semibold">{gbp(x.amount)}</span> },
    {
      key: "status", header: t("Status", "状态"), render: (x) => (
        <div className="flex items-center gap-2">
          <StatusPill status={x.status} />
          {x.status === "HELD" && <span className="text-[11px] text-muted-foreground">{t("released on delivery", "交付后释放")}</span>}
        </div>
      ),
    },
  ];

  const downloadCsv = () => {
    const rows = earnings.data?.transactions ?? [];
    if (rows.length === 0) {
      toast.info(t("No transactions to export", "暂无交易可导出"));
      return;
    }
    const csv = ["Date,Order,Amount GBP,Status", ...rows.map((x) => `${fmtDate(x.date)},${x.orderNumber},${x.amount},${x.status}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquifert-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("CSV downloaded", "CSV 已下载"));
  };

  return (
    <div>
      <PageHeader
        title={t("Earnings & Transactions", "收益与交易")}
        description={t("Payments are released to your bank account when the buyer confirms delivery.", "买家确认收货后，款项将支付到您的银行账户。")}
        actions={<Button variant="outline" onClick={downloadCsv}><Download className="mr-1.5 h-4 w-4" /> {t("Download CSV", "下载 CSV")}</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title={t("This Month", "本月收益")} value={earnings.data?.thisMonth ?? 0} format={(n) => gbp(n)} icon={<Wallet className="h-5 w-5" />} accent="green" />
        <StatCard title={t("Pending Release", "待释放款项")} value={earnings.data?.pending ?? 0} format={(n) => gbp(n)} icon={<Hourglass className="h-5 w-5" />} accent="amber" hint={t("awaiting delivery confirmation", "等待收货确认")} />
        <StatCard title={t("Lifetime Earnings", "累计收益")} value={earnings.data?.lifetime ?? 0} format={(n) => gbp(n)} icon={<PiggyBank className="h-5 w-5" />} accent="navy" />
      </div>

      <Card className="mt-6 border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-500/5">
        <CardContent className="p-4 text-sm text-teal-900 dark:text-teal-100">
          <span className="font-semibold">{t("How payouts work:", "付款规则：")}</span>{" "}
          {t(
            "AQUIFERT collects payment from the buyer, holds it in escrow while cargo is in transit, and releases it within 24h of confirmed delivery, minus a 2% platform fee.",
            "AQUIFERT 向买家收取货款，在货物运输期间托管于平台，并在确认收货后 24 小时内释放, 扣除 2% 平台服务费。"
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={(earnings.data?.transactions ?? []).map((x, i) => ({ ...x, id: i }))}
          emptyTitle={t("No transactions yet", "暂无交易记录")}
          emptyDescription={t("Completed orders will appear here.", "完成的订单将显示在这里。")}
        />
      </div>
    </div>
  );
}
