"use client";

import { Fragment, useState, useTransition } from "react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCalculationLogs } from "@/app/admin/freight-calculator/actions";
import { FlagMark } from "@/components/calculators/flag-mark";
import { Card, EmptyState, Pill, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { LogFilters } from "@/lib/freight-desk/logs";
import type { CalcLog } from "@/lib/freight-desk/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const money = (value: number) => `$${value.toFixed(2)}`;

function query(filters: LogFilters, page?: number) {
  const params = new URLSearchParams({ tab: "logs" });
  if (filters.q) params.set("q", filters.q);
  if (filters.plan) params.set("plan", filters.plan);
  if (filters.month) params.set("month", filters.month);
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

function Verification({ log }: { log: CalcLog }) {
  if (!log.output.band) return <Pill>Algorithm only</Pill>;
  return log.output.inRange ? <Pill tone="teal">In fixture band</Pill> : <Pill tone="amber">Outside band</Pill>;
}

export function LogsPanel({ rows, total, page, pages, filters, months }: { rows: CalcLog[]; total: number; page: number; pages: number; filters: LogFilters; months: string[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const filtered = Boolean(filters.q || filters.plan || filters.month);
  const selectedIds = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const remove = (ids: string[]) =>
    start(async () => {
      const result = await deleteCalculationLogs(ids);
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
      <Form action="/admin/freight-calculator" scroll={false} className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <input type="hidden" name="tab" value="logs" />
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input name="q" aria-label="Search logs" defaultValue={filters.q} placeholder="Member, email, port or LOCODE" className={`${field} h-9 w-full pl-9`} />
        </div>
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
        <a href={`/admin/freight-calculator/logs/export?${query(filters)}`} className={`${btnSecondary} ml-auto`}>
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
                <th className="px-3 py-2.5 font-semibold">Route</th>
                <th className="px-3 py-2.5 text-right font-semibold">Cargo</th>
                <th className="px-3 py-2.5 text-right font-semibold">Rate $/MT</th>
                <th className="px-3 py-2.5 font-semibold">Check</th>
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
                        <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                          <FlagMark country={log.load.country} className="h-3 w-[18px]" />
                          {log.load.name}
                          <span className="text-dim">→</span>
                          <FlagMark country={log.discharge.country} className="h-3 w-[18px]" />
                          {log.discharge.name}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-dim">
                          {output.nauticalMiles.toLocaleString("en-US")} nm · {output.vessel}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px]">{(input.cargoMt / 1000).toLocaleString("en-US")} kT</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] font-semibold text-ink">{money(output.quotedRate)}</td>
                      <td className="px-3 py-2.5">
                        <Verification log={log} />
                      </td>
                      <td className="px-3 py-2.5 text-dim">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-s2/30">
                        <td />
                        <td colSpan={7} className="px-3 pb-4 pt-1">
                          <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
                            <Detail label="Ports" value={`${log.load.code} → ${log.discharge.code}`} />
                            <Detail label="Route" value={`${output.routeType}${output.canal && output.canal !== "none" ? ` · ${output.canal}` : ""}`} />
                            <Detail label="Voyage" value={`${output.totalDays.toFixed(1)} days`} />
                            <Detail label="Market" value={<span className="capitalize">{input.market}</span>} />
                            <Detail label="Cargo type" value={input.cargoType || "—"} />
                            <Detail label="BDI" value={output.bdi.toLocaleString("en-US")} />
                            <Detail label="VLSFO" value={`$${input.bunkerPrice.toLocaleString("en-US")}/MT`} />
                            <Detail label="Port costs" value={`$${(input.loadPortCost + input.dischargePortCost + input.agencyCost).toLocaleString("en-US")}`} />
                            <Detail label="Extra port days" value={input.extraPortDays} />
                            <Detail label="Base rate" value={money(output.baseRate)} />
                            <Detail label="Premiums" value={`${money(output.totalPremium)}${output.iranPremium ? ` incl. ${money(output.iranPremium)} war risk` : ""}`} />
                            <Detail label="Algorithm rate" value={money(output.algorithmRate)} />
                            <Detail
                              label="Fixture band"
                              value={output.band ? `${money(output.band.rateMin)}–${money(output.band.rateMax)} · median ${money(output.band.rateMedian)}` : "No fixtures matched"}
                            />
                            <Detail label="Band basis" value={output.band ? `${output.band.label ?? output.band.matchType} · ${output.band.sampleSize} fixtures` : "—"} />
                            <Detail label="Fixture weight" value={`${Math.round(output.fixtureWeight * 100)}%`} />
                            <Detail label="Gross revenue" value={`$${Math.round(output.grossRevenue).toLocaleString("en-US")}`} />
                            <Detail label="TCE" value={`$${Math.round(output.tcePerDay).toLocaleString("en-US")}/day`} />
                            <Detail label="Final rate" value={<span className="font-semibold">{money(output.quotedRate)}</span>} />
                          </dl>
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
          body={filtered ? "Try another month or plan, or clear the search." : "Every quote a member runs on the hub freight calculator is logged here with its full breakdown."}
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
