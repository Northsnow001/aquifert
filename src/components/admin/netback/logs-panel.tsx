"use client";

import { Fragment, useState, useTransition } from "react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeNetbackLogs } from "@/app/admin/netback/actions";
import { FlagMark } from "@/components/calculators/flag-mark";
import { Card, EmptyState, Pill, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { MODE_LABEL, type NetbackLogFilters } from "@/lib/netback-desk/logs";
import type { NetbackLog } from "@/lib/netback-desk/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const money = (value: number) => `$${value.toFixed(2)}`;
const BASIS: Record<string, string> = { cfr: "CFR port", exw: "EXW port", local: "Local <50 km", regional: "Regional 50–150 km", remote: "Remote >150 km" };

function query(filters: NetbackLogFilters, page?: number) {
  const params = new URLSearchParams({ tab: "logs" });
  for (const key of ["q", "plan", "month", "mode"] as const) if (filters[key]) params.set(key, filters[key]);
  if (page && page > 1) params.set("page", String(page));
  return params.toString();
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-ink">{value}</dd>
    </div>
  );
}

function Status({ log }: { log: NetbackLog }) {
  const status = log.output.best.status;
  if (log.mode === "forward" || !status) return <Pill>Landed cost</Pill>;
  return <Pill tone={status === "Viable" ? "teal" : status === "Unviable" ? "neutral" : "amber"}>{status}</Pill>;
}

export function NetbackLogsPanel({ rows, total, page, pages, filters, months }: { rows: NetbackLog[]; total: number; page: number; pages: number; filters: NetbackLogFilters; months: string[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const filtered = Boolean(filters.q || filters.plan || filters.month || filters.mode);
  const selectedIds = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const remove = (ids: string[]) =>
    start(async () => {
      const result = await removeNetbackLogs(ids);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Deleted ${result.count} ${result.count === 1 ? "log" : "logs"}.`);
      setSelected(new Set());
      router.refresh();
    });

  return (
    <Card>
      <Form action="/admin/netback" scroll={false} className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <input type="hidden" name="tab" value="logs" />
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input name="q" aria-label="Search logs" defaultValue={filters.q} placeholder="Member, email, port, country or origin" className={`${field} h-9 w-full pl-9`} />
        </div>
        <select name="mode" aria-label="Mode" defaultValue={filters.mode} className={`${field} h-9`}>
          <option value="">Both modes</option>
          <option value="netback">{MODE_LABEL.netback}</option>
          <option value="forward">{MODE_LABEL.forward}</option>
        </select>
        <select name="plan" aria-label="Plan" defaultValue={filters.plan} className={`${field} h-9`}>
          <option value="">All plans</option>
          <option value="core">Core</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
          <option value="admin">Admins</option>
        </select>
        <select name="month" aria-label="Month" defaultValue={filters.month} className={`${field} h-9`}>
          <option value="">All months</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {monthLabel(month)}
            </option>
          ))}
        </select>
        <button type="submit" className={btnPrimary}>
          Filter
        </button>
        {filtered ? (
          <Link href="?tab=logs" className={btnGhost}>
            Reset
          </Link>
        ) : null}
        <a href={`/admin/netback/logs/export?${query(filters)}`} className={`${btnSecondary} ml-auto`}>
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </Form>

      {selectedIds.length ? (
        <div className="flex items-center gap-2 border-b border-border bg-blue-light/50 px-4 py-2">
          <span className="mr-2 text-[12.5px] font-semibold text-ink">{selectedIds.length} selected</span>
          <button type="button" className={`${btnGhost} text-danger hover:text-danger`} disabled={busy} onClick={() => window.confirm(`Delete ${selectedIds.length} calculation logs?`) && remove(selectedIds)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button type="button" className={`${btnGhost} ml-auto`} onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      ) : null}

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-s2/60 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select page"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                    className="h-4 w-4 accent-[var(--color-blue)]"
                  />
                </th>
                <th className="px-3 py-2.5 font-semibold">When (UTC)</th>
                <th className="px-3 py-2.5 font-semibold">Member</th>
                <th className="px-3 py-2.5 font-semibold">Destination</th>
                <th className="px-3 py-2.5 font-semibold">Asked</th>
                <th className="px-3 py-2.5 font-semibold">Best origin</th>
                <th className="px-3 py-2.5 font-semibold">Result</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((log) => {
                const expanded = open === log.id;
                const { input, output } = log;
                return (
                  <Fragment key={log.id}>
                    <tr className={`cursor-pointer ${expanded ? "bg-s2/50" : "hover:bg-s2/30"}`} onClick={() => setOpen(expanded ? null : log.id)}>
                      <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select calculation by ${log.user.name}`}
                          checked={selected.has(log.id)}
                          onChange={() =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (next.has(log.id)) next.delete(log.id);
                              else next.add(log.id);
                              return next;
                            })
                          }
                          className="h-4 w-4 accent-[var(--color-blue)]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-mid">{formatStamp(log.at)}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-ink">{log.user.name || "Member"}</p>
                        <p className="flex items-center gap-1.5 text-[11.5px] text-dim">
                          <span className="max-w-[180px] truncate">{log.user.email}</span>
                          <span className="capitalize">· {log.user.admin ? "admin" : log.user.plan}</span>
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          <FlagMark country={log.destination.country} className="h-3 w-[18px]" />
                          {log.destination.name}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-dim">
                          {log.destination.country} · {log.destination.region}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-ink">{MODE_LABEL[log.mode]}</p>
                        <p className="mt-0.5 text-[11.5px] text-dim">
                          {log.mode === "netback" ? `${input.currency === "USD" ? money(input.farmLocal) : `${input.farmLocal.toLocaleString("en-US")} ${input.currency}`} farm · ` : ""}
                          {(input.cargoMt / 1000).toLocaleString("en-US")} kT · {input.packaging}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-ink">{output.best.label}</p>
                        <p className="mt-0.5 font-mono text-[11.5px] text-dim">
                          {log.mode === "netback" ? "Implied FOB" : "Landed"} {money(output.best.value)}
                          {output.best.margin !== null ? ` · ${output.best.margin >= 0 ? "+" : "−"}${Math.abs(output.best.margin).toFixed(2)}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Status log={log} />
                      </td>
                      <td className="px-3 py-2.5 text-dim">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-s2/30">
                        <td />
                        <td colSpan={7} className="px-3 pb-4 pt-1">
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                            <dl className="grid content-start gap-x-6 gap-y-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-3">
                              <Detail label="Port" value={`${log.destination.name} (${log.destination.code})`} />
                              <Detail label="Basis" value={BASIS[input.basis] ?? input.basis} />
                              <Detail label="Packaging" value={<span className="capitalize">{input.packaging}</span>} />
                              <Detail label="Cargo" value={`${input.cargoMt.toLocaleString("en-US")} MT`} />
                              <Detail label="Currency" value={input.currency === "USD" ? "USD" : `${input.currency} at ${input.fx}`} />
                              <Detail label="Farm price" value={log.mode === "netback" ? `${money(input.farmUsd)} USD` : "—"} />
                              <Detail label="Import duty" value={input.dutyEnabled && input.dutyPercent > 0 ? `${input.dutyPercent}%` : "Off"} />
                              <Detail label="AFRMM" value={input.afrmm ? "Charged" : "No"} />
                              <Detail label="Inland" value={input.inlandUsd ? money(input.inlandUsd) : "—"} />
                              <Detail label="Benchmarks" value={output.week || "—"} />
                              <Detail label="Best route" value={`${output.best.port} · ${output.best.nauticalMiles.toLocaleString("en-US")} nm${output.best.vessel ? ` · ${output.best.vessel}` : ""}`} />
                              <Detail label="Freight" value={`${money(output.best.freightMt)}/MT`} />
                            </dl>
                            <div className="overflow-hidden rounded-xl border border-border bg-white">
                              <table className="w-full text-[12.5px]">
                                <thead className="bg-s2/60 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
                                  <tr>
                                    <th className="px-3 py-1.5 font-semibold">#</th>
                                    <th className="px-3 py-1.5 font-semibold">Origin</th>
                                    <th className="px-3 py-1.5 text-right font-semibold">Freight</th>
                                    <th className="px-3 py-1.5 text-right font-semibold">{log.mode === "netback" ? "Implied FOB" : "Landed"}</th>
                                    {log.mode === "netback" ? <th className="px-3 py-1.5 text-right font-semibold">Margin</th> : null}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {output.ranking.map((row, index) => (
                                    <tr key={row.key}>
                                      <td className="px-3 py-1.5 font-mono text-dim">{index + 1}</td>
                                      <td className="px-3 py-1.5 text-ink">{row.label}</td>
                                      <td className="px-3 py-1.5 text-right font-mono text-mid">{money(row.freightMt)}</td>
                                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-ink">{money(row.value)}</td>
                                      {row.margin !== null ? (
                                        <td className={`px-3 py-1.5 text-right font-mono ${row.margin >= 0 ? "text-[#1f7a45]" : "text-[#b42318]"}`}>
                                          {row.margin >= 0 ? "+" : "−"}
                                          {Math.abs(row.margin).toFixed(2)}
                                        </td>
                                      ) : null}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button type="button" className={`${btnGhost} text-danger hover:text-danger`} disabled={busy} onClick={() => window.confirm("Delete this calculation log?") && remove([log.id])}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete log
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={filtered ? "No calculations match these filters" : "No calculations yet"}
          body={filtered ? "Try another month, mode or plan, or clear the search." : "Every netback or landed-cost calculation a member runs is logged here with the full origin ranking."}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[12.5px] text-mid">
        <span>{total ? `${(page - 1) * 50 + 1}–${Math.min(page * 50, total)} of ${total.toLocaleString("en-US")}` : "0 calculations"}</span>
        {pages > 1 ? (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={`?${query(filters, page - 1)}`} className={btnGhost}>
                Previous
              </Link>
            ) : null}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={`?${query(filters, page + 1)}`} className={btnGhost}>
                Next
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
