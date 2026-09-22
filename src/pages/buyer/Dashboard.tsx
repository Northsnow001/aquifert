import { Link, useNavigate } from "react-router";
import {
  ArrowRight, Crown, FileText, FlaskConical, Package, PiggyBank, PlusCircle, Wallet,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useProfile } from "@/hooks/useProfile";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill, MembershipBadge } from "@/components/shared/StatusPill";
import { Sparkline } from "@/components/shared/PriceChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarketSnapshot } from "@/components/buyer/MarketSnapshot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, gbp, tons } from "@/lib/format";

export default function BuyerDashboard() {
  const { user, membership, isMember } = useProfile();
  const navigate = useNavigate();
  const orders = trpc.orders.mine.useQuery();
  const quotes = trpc.quotes.mine.useQuery();
  const teaser = trpc.market.teaser.useQuery(undefined, { enabled: isMember });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const myOrders = orders.data ?? [];
  const activeOrders = myOrders.filter((o) => o.shipmentStatus !== "DELIVERED" && o.quote?.request?.status !== "COMPLETED").length;
  const pendingQuotes = (quotes.data ?? []).filter((q) => q.status === "SENT").length;
  const totalSpent = myOrders.filter((o) => o.paymentStatus === "PAID").reduce((a, o) => a + o.total, 0);
  const saved = isMember
    ? myOrders.reduce((a, o) => a + (o.quote?.margin ?? 0), 0)
    : 0;
  const sparkData = (teaser.data ?? []).map((p) => p.pricePerTon).reverse();
  const latestPrice = sparkData[sparkData.length - 1];

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {greeting}, {user?.name?.split(" ")[0]}
            </h1>
            {membership && <MembershipBadge tier={membership.tier} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isMember
              ? "Cost-to-cost pricing is active on all your quotes."
              : "You're on standard pricing, membership removes the margin."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" variant="outline" className="shadow-sm" onClick={() => navigate("/nitrogen-report")}>
            <FlaskConical className="mr-1.5 h-5 w-5" /> Nitrogen Report Generator
          </Button>
          <Button size="lg" className="bg-teal-500 hover:bg-teal-600 aqf-btn-press shadow-md" onClick={() => navigate("/buyer/request")}>
            <PlusCircle className="mr-1.5 h-5 w-5" /> New Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orders.isLoading || quotes.isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
        ) : (
          <>
            <StatCard title="Active Orders" value={activeOrders} icon={<Package className="h-5 w-5" />} accent="navy" />
            <StatCard title="Pending Quotes" value={pendingQuotes} icon={<FileText className="h-5 w-5" />} accent="amber" hint={pendingQuotes ? "review & accept" : "no action needed"} />
            <StatCard title="Total Spent" value={totalSpent} format={(n) => gbp(n)} icon={<Wallet className="h-5 w-5" />} accent="teal" hint="lifetime" />
            <StatCard
              title={isMember ? "Saved vs Margin" : "Potential Savings"}
              value={saved}
              format={(n) => gbp(n)}
              icon={<PiggyBank className="h-5 w-5" />}
              accent="green"
              hint={isMember ? "by trading cost-to-cost" : "with a membership"}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <Link to="/buyer/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {orders.isLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : myOrders.length === 0 ? (
              <EmptyState
                icon={<Package className="h-7 w-7" />}
                title="No orders yet"
                description="Create your first sourcing request and your orders will appear here."
                action={<Button className="bg-teal-500 hover:bg-teal-600" onClick={() => navigate("/buyer/request")}>New Request</Button>}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {myOrders.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    to="/buyer/orders"
                    className="aqf-card-hover rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-data text-xs font-semibold">{o.orderNumber}</span>
                      <StatusPill status={o.shipment?.status ?? o.shipmentStatus} />
                    </div>
                    <p className="mt-2 text-sm font-medium">{tons(o.quote?.request?.quantity)} {o.quote?.request?.product}</p>
                    <p className="text-xs text-muted-foreground">{o.quote?.request?.destination}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-data font-bold">{gbp(o.total)}</span>
                      <span className="text-muted-foreground">{fmtDate(o.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right rail: insights teaser / upgrade CTA */}
        <div className="space-y-5">
          {isMember ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  Urea · UK · 30 days
                  {latestPrice && <span className="font-data text-sm text-teal-600">${latestPrice.toFixed(2)}/t</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sparkData.length > 1 ? (
                  <Sparkline data={sparkData} height={72} />
                ) : (
                  <Skeleton className="h-[72px]" />
                )}
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate("/buyer/insights")}>
                  Open insights dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-teal-500/60 bg-gradient-to-b from-teal-50/80 to-card dark:from-teal-500/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-teal-600" />
                  <p className="font-bold">Upgrade to Membership</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Remove the margin from every quote, unlock live market intelligence and invoice financing.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {["Cost-to-cost pricing", "Real-time market insights", "Financing up to £200k"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-4 w-full bg-teal-500 hover:bg-teal-600 aqf-btn-press" onClick={() => navigate("/buyer/membership")}>
                  Compare plans <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {membership && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tonnage this month</p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{ width: `${Math.min(100, (membership.currentMonthTonnage / membership.monthlyTonnageLimit) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-data font-bold">{membership.currentMonthTonnage}t</span>
                  <span className="text-muted-foreground"> of {membership.monthlyTonnageLimit}t used</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Market data + commentary for free-tier buyers */}
      {!isMember && <MarketSnapshot />}
    </div>
  );
}
