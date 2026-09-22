import { Link } from "react-router";
import { ArrowRight, ClipboardList, Inbox, Package, Percent, Wallet } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useProfile } from "@/hooks/useProfile";
import { useSupplierText } from "./lang";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_META } from "@contracts/constants";
import { fmtDate, gbp, timeAgo, tons } from "@/lib/format";

export default function SupplierDashboard() {
  const t = useSupplierText();
  const { user } = useProfile();
  const stats = trpc.supplier.dashboard.useQuery();
  const inbox = trpc.supplier.inbox.useQuery();

  const hour = new Date().getHours();
  const greetEn = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetZh = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  const recent = (inbox.data ?? []).slice(0, 5);

  return (
    <div>
      <div className="aqf-page mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy dark:text-white">
          {t(`${greetEn}, ${user?.name?.split(" ")[0] ?? ""}`, `${greetZh}，${user?.name ?? ""}`)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Here's what's happening with your fertilizer supply business.", "以下是您化肥供应业务的最新动态。")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("Incoming Requests", "新询价请求")} value={stats.data?.incomingRequests ?? 0} icon={<Inbox className="h-5 w-5" />} accent="teal" />
        <StatCard title={t("Active Orders", "进行中订单")} value={stats.data?.activeOrders ?? 0} icon={<Package className="h-5 w-5" />} accent="navy" />
        <StatCard title={t("Earnings This Month", "本月收益")} value={stats.data?.earningsThisMonth ?? 0} format={(n) => gbp(n)} icon={<Wallet className="h-5 w-5" />} accent="green" />
        <StatCard title={t("Response Rate", "回复率")} value={stats.data?.responseRate ?? 0} format={(n) => `${n}%`} icon={<Percent className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("Latest quote requests", "最新询价请求")}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-teal-600">
              <Link to="/supplier/requests">{t("View all", "查看全部")} <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("No requests yet, AQUIFERT will notify you on WhatsApp & WeChat.", "暂无请求, AQUIFERT 将通过 WhatsApp 和微信通知您。")}
              </p>
            )}
            {recent.map((a) => (
              <Link
                key={a.id}
                to="/supplier/requests"
                className="flex items-center gap-4 rounded-xl border border-border p-3.5 transition-colors hover:border-teal-400/60 hover:bg-teal-50/40 dark:hover:bg-teal-500/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy dark:bg-navy-900/60 dark:text-navy-100">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {a.request ? PRODUCT_META[a.request.product].label : "N/A"} · {a.request ? tons(Number(a.request.quantity)) : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.request?.requestNumber} · {t("Deliver to", "目的地")} {a.request?.destination} · {a.request?.deliveryDate ? fmtDate(a.request.deliveryDate) : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill status={a.status} />
                  <span className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-navy to-navy-800 text-white">
          <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">{t("Quick action", "快捷操作")}</p>
              <h3 className="mt-2 text-lg font-bold leading-snug">
                {t("Reply fast, buyers accept the first competitive quote 68% of the time.", "快速回复, 68% 的情况下买家会接受第一个有竞争力的报价。")}
              </h3>
              <p className="mt-2 text-sm text-white/70">
                {t("AQUIFERT AI turns your reply into a polished, buyer-ready quote automatically.", "AQUIFERT AI 会自动将您的回复整理成专业的买家报价单。")}
              </p>
            </div>
            <Button asChild className="bg-teal-500 text-white hover:bg-teal-400">
              <Link to="/supplier/requests">{t("Open request inbox", "打开询价收件箱")} <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
