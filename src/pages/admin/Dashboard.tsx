import { Link } from "react-router";
import {
  Activity, ClipboardList, KanbanSquare, PackageCheck, Ship, ArrowRight, Files, Inbox,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill, ConfidenceBadge } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { gbp, timeAgo, tons } from "@/lib/format";
import { useProfile } from "@/hooks/useProfile";

export default function AdminDashboard() {
  const { user } = useProfile();
  const stats = trpc.admin.stats.useQuery(undefined, { refetchInterval: 30_000 });
  const activity = trpc.admin.activity.useQuery();
  const drafts = trpc.quotes.list.useQuery();

  const pending = (drafts.data ?? []).filter((q) => q.status === "PENDING_APPROVAL").slice(0, 5);
  const s = stats.data;

  return (
    <div>
      <PageHeader
        title={<>Command Center</>}
        description={`Welcome back, ${user?.name?.split(" ")[0] ?? "team"}, here's the live trading picture.`}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              title="Active Requests"
              value={s?.activeRequests ?? 0}
              icon={<ClipboardList className="h-5 w-5" />}
              trend={`+${s?.newRequestsThisWeek ?? 0} this week`}
              trendUp
              accent="navy"
            />
            <StatCard
              title="Pending Quotes"
              value={s?.pendingQuotes ?? 0}
              icon={<KanbanSquare className="h-5 w-5" />}
              hint="awaiting approval"
              accent="amber"
            />
            <StatCard
              title="Orders This Month"
              value={s?.revenueThisMonth ?? 0}
              format={(n) => gbp(n)}
              icon={<PackageCheck className="h-5 w-5" />}
              trend="+12% MoM"
              trendUp
              accent="teal"
            />
            <StatCard
              title="Active Shipments"
              value={s?.activeShipments ?? 0}
              icon={<Ship className="h-5 w-5" />}
              hint="containers on the water"
              accent="green"
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        {/* AI Draft Queue */}
        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Files className="h-4 w-4 text-teal-500" /> AI Draft Queue
            </CardTitle>
            <Link to="/admin/drafts" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">
              Open board <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {drafts.isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : pending.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-7 w-7" />}
                title="Queue is clear"
                description="AI-drafted quotes awaiting approval will appear here."
              />
            ) : (
              <div className="space-y-2.5">
                {pending.map((q) => (
                  <Link
                    key={q.id}
                    to="/admin/drafts"
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-teal-500/50 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {q.request?.buyer?.organization?.name ?? q.request?.buyer?.name} · {tons(q.request?.quantity)} {q.request?.product}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.request?.requestNumber} → {q.request?.destination} · {timeAgo(q.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-data text-sm font-bold">{gbp(q.total)}</span>
                      <StatusPill status={q.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-navy-500" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
                {(activity.data ?? []).slice(0, 9).map((a) => (
                  <div key={a.id} className="relative pl-6">
                    <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-card ${a.actor === "AQUIFERT AI" ? "bg-teal-500" : a.actor === "System" ? "bg-amber-500" : "bg-navy-500"}`} />
                    <p className="text-sm leading-snug">{a.action}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {a.actor} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick confidence overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "AI extraction accuracy (7d)", value: "91.4%", tone: "text-emerald-600", conf: 91 },
          { label: "Avg. quote turnaround", value: "3h 12m", tone: "text-navy-600 dark:text-navy-200", conf: null },
          { label: "On-time delivery rate", value: "96.2%", tone: "text-emerald-600", conf: null },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`mt-1 font-data text-lg font-bold ${k.tone}`}>{k.value}</p>
              </div>
              {k.conf != null && <ConfidenceBadge score={k.conf} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
