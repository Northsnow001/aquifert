import { useMemo, useState } from "react";
import { AlertTriangle, Check, Minus, Play, RefreshCw } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";

const fmtDay = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const daysLeft = (d: string | Date | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 864e5) : null);

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${on ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-muted text-muted-foreground"}`}>
      {on ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{label}
    </span>
  );
}

/** Admin licence console: providers, seats, dataset flags, audit log. */
export default function AdminLicences() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.licenceAdmin.overview.useQuery();
  const health = trpc.licenceAdmin.adapterHealth.useQuery();
  const [logFilter, setLogFilter] = useState<{ userId?: number; providerId?: string; from?: string; to?: string }>({});
  const log = trpc.licenceAdmin.accessLog.useQuery({
    userId: logFilter.userId, providerId: logFilter.providerId,
    from: logFilter.from ? new Date(logFilter.from) : undefined,
    to: logFilter.to ? new Date(logFilter.to) : undefined,
    limit: 200,
  });

  const assignSeat = trpc.licenceAdmin.assignSeat.useMutation({
    onSuccess: () => { toast.success("Seat assigned"); utils.licenceAdmin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const revokeSeat = trpc.licenceAdmin.revokeSeat.useMutation({
    onSuccess: () => { toast.success("Seat revoked"); utils.licenceAdmin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateLicence = trpc.licenceAdmin.updateLicence.useMutation({
    onSuccess: () => { toast.success("Licence updated"); utils.licenceAdmin.overview.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const runIngest = trpc.licenceAdmin.runIngest.useMutation({
    onSuccess: (r) => toast.success(`Ingestion pass complete (${r.lines.length} lines — see log)`),
    onError: (e) => toast.error(e.message),
  });

  const [seatPick, setSeatPick] = useState<Record<string, string>>({});
  const userById = useMemo(() => new Map((data?.users ?? []).map((u) => [u.id, u])), [data]);
  const provById = useMemo(() => new Map((data?.providers ?? []).map((p) => [p.providerId, p])), [data]);
  const logUsers = useMemo(() => new Map((log.data?.users ?? []).map((u) => [u.id, u])), [log.data]);
  const logProvs = useMemo(() => new Map((log.data?.providers ?? []).map((p) => [p.providerId, p.name])), [log.data]);

  const activeSeats = (providerId: string) => (data?.seats ?? []).filter((x) => x.providerId === providerId && !x.revokedAt);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Data Licences"
        description="Provider contracts, named-user seats, dataset permission flags and the access log — the audit trail for licensed data."
      />

      {/* Providers */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Providers & contracts</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.providers ?? []).map((p) => {
            const left = daysLeft(p.contractEnd);
            const warn = left != null && left <= 30 && left >= 0;
            const seats = activeSeats(p.providerId);
            return (
              <Card key={p.providerId} className={warn ? "border-amber-400" : undefined}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-navy-900 dark:text-white">{p.name}</h3>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.type.replace("_", " ")}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === "active" ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{p.status}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                    <dt className="text-muted-foreground">Contract</dt><dd className="font-medium">{p.contractReference ?? "—"}</dd>
                    <dt className="text-muted-foreground">Ends</dt>
                    <dd className={`font-medium ${warn ? "text-amber-700 dark:text-amber-300" : ""}`}>
                      {fmtDay(p.contractEnd)}{warn && <span className="ml-1 inline-flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />{left}d left</span>}
                    </dd>
                    <dt className="text-muted-foreground">Seats</dt>
                    <dd className="font-medium">{p.seatsLicensed != null ? `${seats.length} of ${p.seatsLicensed} assigned` : "Unlimited / n/a"}</dd>
                  </dl>

                  {p.seatsLicensed != null && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Named users</p>
                      <ul className="mt-1 space-y-1">
                        {seats.map((x) => (
                          <li key={x.seatId} className="flex items-center justify-between text-[12px]">
                            <span>{userById.get(x.userId)?.name ?? x.userId} <span className="text-muted-foreground">({userById.get(x.userId)?.email})</span></span>
                            <button type="button" className="text-[11px] font-semibold text-red-600 hover:underline" onClick={() => revokeSeat.mutate({ seatId: x.seatId })}>Revoke</button>
                          </li>
                        ))}
                        {!seats.length && <li className="text-[12px] text-muted-foreground">No seats assigned.</li>}
                      </ul>
                      <div className="mt-2 flex gap-2">
                        <select
                          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-[12px]"
                          value={seatPick[p.providerId] ?? ""}
                          onChange={(e) => setSeatPick((m) => ({ ...m, [p.providerId]: e.target.value }))}
                        >
                          <option value="">Assign seat to…</option>
                          {(data?.users ?? []).filter((u) => !seats.some((x) => x.userId === u.id)).map((u) => (
                            <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                          ))}
                        </select>
                        <Button
                          size="sm" variant="outline"
                          disabled={!seatPick[p.providerId] || assignSeat.isPending}
                          onClick={() => assignSeat.mutate({ providerId: p.providerId, userId: Number(seatPick[p.providerId]) })}
                        >Assign</Button>
                      </div>
                    </div>
                  )}
                  {p.notes && <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{p.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Dataset licences */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Dataset licences</h2>
        <Card className="mt-3"><CardContent className="overflow-x-auto p-5">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-semibold">Dataset</th>
                <th className="py-2 pr-3 font-semibold">Provider</th>
                <th className="py-2 pr-3 font-semibold">Permissions</th>
                <th className="py-2 pr-3 font-semibold">Delay</th>
                <th className="py-2 font-semibold">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {(data?.licences ?? []).map((l) => (
                <tr key={l.licenceId} className="border-b border-border/50 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{l.datasetLabel}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{l.datasetKey}</p>
                  </td>
                  <td className="py-2 pr-3">{provById.get(l.providerId)?.name ?? l.providerId}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      <Flag on={l.displayAllowed} label="display" />
                      <Flag on={l.exportAllowed} label={l.maxRowsPerExport != null ? `export ≤${l.maxRowsPerExport}` : "export"} />
                      <Flag on={l.apiAllowed} label="api" />
                      <Flag on={l.aiQuotationAllowed} label="ai quote" />
                      {l.namedUsersOnly && <span className="rounded-full bg-navy-700/10 px-2 py-0.5 text-[10px] font-semibold text-navy-700 dark:text-navy-200">named users</span>}
                      {l.attributionRequired && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">attribution</span>}
                    </div>
                  </td>
                  <td className="py-2 pr-3">{l.displayDelayMinutes > 0 ? `${l.displayDelayMinutes} min` : "—"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {(["exportAllowed", "apiAllowed", "aiQuotationAllowed", "namedUsersOnly"] as const).map((f) => (
                        <button
                          key={f} type="button"
                          className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold hover:bg-muted"
                          onClick={() => updateLicence.mutate({ licenceId: l.licenceId, [f]: !l[f] })}
                        >{l[f] ? "−" : "+"} {f.replace(/([A-Z])/g, " $1").replace("Allowed", "").trim()}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </section>

      {/* Adapters */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Provider adapters</h2>
        <Card className="mt-3"><CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            {(health.data ?? []).map((h) => (
              <span key={h.provider} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${h.enabled ? (h.ok ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "bg-red-500/15 text-red-700 dark:text-red-300") : "bg-muted text-muted-foreground"}`}>
                {h.provider}: {h.enabled ? (h.ok ? "healthy" : `error — ${h.detail}`) : `off (${h.flag})`}
              </span>
            ))}
            <Button size="sm" variant="outline" disabled={runIngest.isPending} onClick={() => runIngest.mutate()}>
              {runIngest.isPending ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
              Run ingestion pass
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Adapters ship disabled by default and call official APIs only — a provider that cannot be reached fails and flags its data stale; nothing is ever scraped.
          </p>
          {runIngest.data && (
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px]">{runIngest.data.lines.join("\n")}</pre>
          )}
        </CardContent></Card>
      </section>

      {/* Audit log */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Access log (audit trail)</h2>
        <Card className="mt-3"><CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3 text-[12px]">
            <label>User
              <select className="ml-1 h-8 rounded-md border border-border bg-background px-2" value={logFilter.userId ?? ""} onChange={(e) => setLogFilter((f) => ({ ...f, userId: e.target.value ? Number(e.target.value) : undefined }))}>
                <option value="">All</option>
                {(log.data?.users ?? []).map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
              </select>
            </label>
            <label>Provider
              <select className="ml-1 h-8 rounded-md border border-border bg-background px-2" value={logFilter.providerId ?? ""} onChange={(e) => setLogFilter((f) => ({ ...f, providerId: e.target.value || undefined }))}>
                <option value="">All</option>
                {(log.data?.providers ?? []).map((p) => <option key={p.providerId} value={p.providerId}>{p.name}</option>)}
              </select>
            </label>
            <label>From <input type="date" className="ml-1 h-8 rounded-md border border-border bg-background px-2" value={logFilter.from ?? ""} onChange={(e) => setLogFilter((f) => ({ ...f, from: e.target.value || undefined }))} /></label>
            <label>To <input type="date" className="ml-1 h-8 rounded-md border border-border bg-background px-2" value={logFilter.to ?? ""} onChange={(e) => setLogFilter((f) => ({ ...f, to: e.target.value || undefined }))} /></label>
            <Button size="sm" variant="ghost" onClick={() => setLogFilter({})}>Clear</Button>
          </div>
          <table className="mt-4 w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-1.5 pr-3 font-semibold">When</th>
                <th className="py-1.5 pr-3 font-semibold">User</th>
                <th className="py-1.5 pr-3 font-semibold">Provider</th>
                <th className="py-1.5 pr-3 font-semibold">Dataset</th>
                <th className="py-1.5 pr-3 font-semibold">Action</th>
                <th className="py-1.5 font-semibold text-right">Rows</th>
              </tr>
            </thead>
            <tbody>
              {(log.data?.rows ?? []).map((r) => (
                <tr key={r.logId} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                  <td className="py-1.5 pr-3">{logUsers.get(r.userId)?.name ?? r.userId}</td>
                  <td className="py-1.5 pr-3">{logProvs.get(r.providerId) ?? r.providerId}</td>
                  <td className="py-1.5 pr-3 font-mono text-[11px]">{r.datasetKey}</td>
                  <td className="py-1.5 pr-3 capitalize">{r.action.replace("_", " ")}</td>
                  <td className="py-1.5 text-right">{r.rowCount}</td>
                </tr>
              ))}
              {!log.isLoading && !(log.data?.rows.length) && (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No access events match the filters.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
      </section>
    </div>
  );
}
