"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers, Pencil, Plus, ScanText, Search, TableProperties, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clearFixtureBatch, deleteFixtures, setFixtureStatus } from "@/app/admin/freight-calculator/actions";
import { BenchmarkTester, type BenchmarkResult } from "@/components/admin/freight/benchmark-tester";
import { FixtureForm, MATCH_STYLE, matchText } from "@/components/admin/freight/fixture-form";
import { FixtureImport } from "@/components/admin/freight/fixture-import";
import { Card, EmptyState, Pill, btnDanger, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import { fixtureResolver, indexPorts } from "@/lib/freight-desk/benchmark";
import { ageInDays, type Fixture, type FixtureBatch, type FixtureOrigin } from "@/lib/freight-desk/types";
import type { PortRecord } from "@/lib/ports";

const PAGE_SIZE = 50;
const ORIGIN_LABEL: Record<FixtureOrigin, string> = { manual: "Manual", csv: "Sheet", ai: "AI" };
const MAX_AGE_DAYS = 730;

type Panel = { kind: "form"; editing: Fixture | null } | { kind: "sheet" } | { kind: "ai" } | null;
type Sort = "newest" | "oldest" | "rate-high" | "rate-low" | "route";

function exclusion(fixture: Fixture, now: number) {
  if (fixture.status !== "active") return "Inactive";
  if (!(fixture.rateLow > 0 && fixture.rateHigh > 0 && fixture.rateHigh >= fixture.rateLow)) return "Rate missing";
  const age = ageInDays(fixture.fixtureDate, now);
  if (age === null) return "Bad date";
  return null;
}

const ageText = (days: number | null) => (days === null ? "" : days < 1 ? "today" : days < 60 ? `${Math.round(days)}d ago` : days < 730 ? `${Math.round(days / 30)}mo ago` : `${(days / 365).toFixed(1)}y ago`);

export function FixturesPanel({
  fixtures,
  batches,
  ports,
  cargoTypes,
  lastExtraction,
  today,
}: {
  fixtures: Fixture[];
  batches: FixtureBatch[];
  ports: PortRecord[];
  cargoTypes: string[];
  lastExtraction: { fileName: string; at: string; count: number } | null;
  today: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "excluded">("all");
  const [origin, setOrigin] = useState<"all" | FixtureOrigin>("all");
  const [batch, setBatch] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [onlyMatched, setOnlyMatched] = useState(false);

  const now = useMemo(() => Date.parse(`${today}T12:00:00Z`), [today]);
  const index = useMemo(() => indexPorts(ports), [ports]);
  const resolve = useMemo(() => fixtureResolver(index), [index]);
  const matched = useMemo(() => new Set(benchmark?.band?.fixtureIds ?? []), [benchmark]);

  const counts = useMemo(() => {
    const usable = fixtures.filter((fixture) => !exclusion(fixture, now)).length;
    const recent = fixtures.filter((fixture) => (ageInDays(fixture.fixtureDate, now) ?? Infinity) <= 90).length;
    return { total: fixtures.length, usable, recent, ai: fixtures.filter((fixture) => fixture.origin === "ai").length };
  }, [fixtures, now]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = fixtures.filter((fixture) => {
      if (onlyMatched && benchmark && !matched.has(fixture.id)) return false;
      if (batch && fixture.batchId !== batch) return false;
      if (origin !== "all" && fixture.origin !== origin) return false;
      if (status === "active" && fixture.status !== "active") return false;
      if (status === "inactive" && fixture.status !== "inactive") return false;
      if (status === "excluded" && !exclusion(fixture, now)) return false;
      if (!needle) return true;
      return [fixture.loadName, fixture.loadCode, fixture.loadRegion, fixture.dischargeName, fixture.dischargeCode, fixture.dischargeRegion, fixture.source, fixture.cargoType]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    const mid = (fixture: Fixture) => (fixture.rateLow + fixture.rateHigh) / 2;
    const compare: Record<Sort, (a: Fixture, b: Fixture) => number> = {
      newest: (a, b) => b.fixtureDate.localeCompare(a.fixtureDate) || b.createdAt.localeCompare(a.createdAt),
      oldest: (a, b) => a.fixtureDate.localeCompare(b.fixtureDate),
      "rate-high": (a, b) => mid(b) - mid(a),
      "rate-low": (a, b) => mid(a) - mid(b),
      route: (a, b) => `${a.loadName} ${a.dischargeName}`.localeCompare(`${b.loadName} ${b.dischargeName}`),
    };
    return rows.sort(compare[sort]);
  }, [fixtures, query, status, origin, batch, sort, now, onlyMatched, benchmark, matched]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectedIds = fixtures.filter((fixture) => selected.has(fixture.id)).map((fixture) => fixture.id);
  const allVisibleSelected = visible.length > 0 && visible.every((fixture) => selected.has(fixture.id));

  const run = (task: () => Promise<{ ok: boolean; message?: string; count?: number }>, success: (count: number) => string) =>
    start(async () => {
      const result = await task();
      if (!result.ok) {
        toast.error(result.message ?? "That did not work.");
        return;
      }
      toast.success(success(result.count ?? 0));
      setSelected(new Set());
      router.refresh();
    });

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const closePanel = (changed: boolean) => {
    setPanel(null);
    if (changed) router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-mid">
          <span className="font-semibold text-ink">{counts.usable}</span> of {counts.total} fixtures feed hub benchmarks · {counts.recent} from the last 90 days · {counts.ai} read by AI
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => setPanel({ kind: "ai" })}>
            <ScanText className="h-4 w-4" />
            Read rate sheet with AI
          </button>
          <button type="button" className={btnSecondary} onClick={() => setPanel({ kind: "sheet" })}>
            <TableProperties className="h-4 w-4" />
            Import sheet
          </button>
          <button type="button" className={btnPrimary} onClick={() => setPanel({ kind: "form", editing: null })}>
            <Plus className="h-4 w-4" />
            Add fixture
          </button>
        </div>
      </div>

      {panel?.kind === "form" ? <FixtureForm key={panel.editing?.id ?? "new"} editing={panel.editing} ports={ports} index={index} cargoTypes={cargoTypes} today={today} onDone={closePanel} /> : null}
      {panel?.kind === "sheet" || panel?.kind === "ai" ? (
        <FixtureImport key={panel.kind} mode={panel.kind} index={index} lastExtraction={lastExtraction} onClose={() => setPanel(null)} onImported={() => closePanel(true)} />
      ) : null}

      <BenchmarkTester ports={ports} fixtures={fixtures} resolve={resolve} now={now} result={benchmark} onResult={(result) => {
        setBenchmark(result);
        if (!result) setOnlyMatched(false);
      }} />

      {batches.length ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 px-5 py-3">
            <span className="mr-1 flex items-center gap-1.5 text-[12px] font-semibold text-mid">
              <Layers className="h-3.5 w-3.5" />
              Import batches
            </span>
            {batches.map((item) => (
              <span key={item.id} className={`inline-flex items-center overflow-hidden rounded-lg border text-[12px] ${batch === item.id ? "border-blue/50 bg-blue-light" : "border-border bg-white"}`}>
                <button type="button" onClick={() => resetPage(setBatch)(batch === item.id ? null : item.id)} className="px-2.5 py-1 text-left" title={`Imported ${item.createdAt.slice(0, 10)}`}>
                  <span className="font-semibold text-ink">{item.label}</span>
                  <span className="ml-1.5 text-dim">
                    {ORIGIN_LABEL[item.origin]} · {item.count}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Clear batch ${item.label}`}
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Delete the ${item.count} fixtures imported in "${item.label}"?`)) return;
                    if (batch === item.id) setBatch(null);
                    run(() => clearFixtureBatch(item.id), (count) => `Removed ${count} fixtures.`);
                  }}
                  className="border-l border-border px-2 py-1 text-dim hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
            <input aria-label="Search fixtures" value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="Search route, LOCODE, region or source" className={`${field} h-9 w-full pl-9`} />
          </div>
          <select aria-label="Status" value={status} onChange={(event) => resetPage(setStatus)(event.target.value as typeof status)} className={`${field} h-9`}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="excluded">Not feeding benchmarks</option>
          </select>
          <select aria-label="Origin" value={origin} onChange={(event) => resetPage(setOrigin)(event.target.value as typeof origin)} className={`${field} h-9`}>
            <option value="all">All origins</option>
            <option value="manual">Manual</option>
            <option value="csv">Sheet import</option>
            <option value="ai">AI import</option>
          </select>
          <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={`${field} h-9`}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rate-high">Highest rate</option>
            <option value="rate-low">Lowest rate</option>
            <option value="route">Route A–Z</option>
          </select>
          {benchmark?.band ? (
            <label className="flex items-center gap-2 px-1 text-[12.5px] font-medium text-ink">
              <input type="checkbox" checked={onlyMatched} onChange={(event) => resetPage(setOnlyMatched)(event.target.checked)} className="h-4 w-4 accent-[var(--color-blue)]" />
              Only tester matches
            </label>
          ) : null}
        </div>

        {selectedIds.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-blue-light/50 px-4 py-2">
            <span className="mr-2 text-[12.5px] font-semibold text-ink">{selectedIds.length} selected</span>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => setFixtureStatus(selectedIds, "active"), (count) => `Activated ${count} fixtures.`)}>
              Activate
            </button>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => setFixtureStatus(selectedIds, "inactive"), (count) => `Deactivated ${count} fixtures.`)}>
              Deactivate
            </button>
            <button
              type="button"
              className={`${btnGhost} text-danger hover:text-danger`}
              disabled={busy}
              onClick={() => window.confirm(`Delete ${selectedIds.length} fixtures?`) && run(() => deleteFixtures(selectedIds), (count) => `Deleted ${count} fixtures.`)}
            >
              Delete
            </button>
            <button type="button" className={`${btnGhost} ml-auto`} onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
        ) : null}

        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-s2/60 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                <tr>
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select page"
                      checked={allVisibleSelected}
                      onChange={() =>
                        setSelected((currentSet) => {
                          const next = new Set(currentSet);
                          for (const fixture of visible) {
                            if (allVisibleSelected) next.delete(fixture.id);
                            else next.add(fixture.id);
                          }
                          return next;
                        })
                      }
                      className="h-4 w-4 accent-[var(--color-blue)]"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Route</th>
                  <th className="px-3 py-2.5 font-semibold">Cargo</th>
                  <th className="px-3 py-2.5 font-semibold">Rate $/MT</th>
                  <th className="px-3 py-2.5 font-semibold">Source</th>
                  <th className="px-3 py-2.5 font-semibold">Fixed</th>
                  <th className="px-3 py-2.5 font-semibold">Active</th>
                  <th className="w-20 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((fixture) => {
                  const geo = resolve(fixture);
                  const excluded = exclusion(fixture, now);
                  const used = matched.has(fixture.id);
                  const age = ageInDays(fixture.fixtureDate, now);
                  const active = fixture.status === "active";
                  return (
                    <tr key={fixture.id} className={used ? "bg-blue-light/45" : selected.has(fixture.id) ? "bg-s2/50" : "hover:bg-s2/30"}>
                      <td className="px-4 py-2.5 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Select ${fixture.loadName} to ${fixture.dischargeName}`}
                          checked={selected.has(fixture.id)}
                          onChange={() =>
                            setSelected((currentSet) => {
                              const next = new Set(currentSet);
                              if (next.has(fixture.id)) next.delete(fixture.id);
                              else next.add(fixture.id);
                              return next;
                            })
                          }
                          className="mt-0.5 h-4 w-4 accent-[var(--color-blue)]"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <p className="font-semibold text-ink">
                          {fixture.loadName} <span className="font-normal text-dim">→</span> {fixture.dischargeName}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-1">
                          <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${MATCH_STYLE[geo.load.match]}`}>{matchText(geo.load)}</span>
                          <span className={`rounded px-1.5 py-px text-[10.5px] font-semibold ${MATCH_STYLE[geo.discharge.match]}`}>{matchText(geo.discharge)}</span>
                          {used ? <span className="rounded bg-blue px-1.5 py-px text-[10.5px] font-semibold text-white">In tester band</span> : null}
                          {excluded && active ? <span className="rounded bg-[#fdecec] px-1.5 py-px text-[10.5px] font-semibold text-[#b42318]">{excluded}</span> : null}
                          {!excluded && age !== null && age > MAX_AGE_DAYS ? (
                            <span className="rounded bg-[#fff6e5] px-1.5 py-px text-[10.5px] font-semibold text-[#9a5b00]" title="Past the 2-year window, so it only counts in wide fallback matches at reduced weight.">
                              Wide matches only
                            </span>
                          ) : null}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[12.5px]">
                        {fixture.cargoMinKt === fixture.cargoMaxKt ? fixture.cargoMinKt : `${fixture.cargoMinKt}–${fixture.cargoMaxKt}`} kT
                        {fixture.cargoType ? <p className="mt-0.5 max-w-[150px] truncate font-sans text-[11.5px] text-dim">{fixture.cargoType}</p> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[12.5px]">
                        <span className="font-semibold text-ink">{fixture.rateLow === fixture.rateHigh ? fixture.rateLow.toFixed(2) : `${fixture.rateLow.toFixed(2)}–${fixture.rateHigh.toFixed(2)}`}</span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <p className="max-w-[200px] truncate text-ink" title={fixture.excerpt || fixture.source}>
                          {fixture.source}
                        </p>
                        <p className="mt-1 flex gap-1">
                          <Pill tone={fixture.origin === "ai" ? "blue" : fixture.origin === "csv" ? "teal" : "neutral"}>{ORIGIN_LABEL[fixture.origin]}</Pill>
                          {fixture.origin === "ai" ? <Pill tone={fixture.confidence < 0.7 ? "amber" : "neutral"}>{Math.round(fixture.confidence * 100)}%</Pill> : null}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top">
                        <p className="font-mono text-[12px] text-ink">{fixture.fixtureDate}</p>
                        <p className={`mt-0.5 text-[11.5px] ${age !== null && age > MAX_AGE_DAYS ? "text-danger" : "text-dim"}`}>{ageText(age)}</p>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={active}
                          aria-label={active ? "Deactivate fixture" : "Activate fixture"}
                          disabled={busy}
                          onClick={() => run(() => setFixtureStatus([fixture.id], active ? "inactive" : "active"), () => (active ? "Fixture deactivated." : "Fixture activated."))}
                          className={`relative mt-0.5 h-5 w-9 rounded-full transition ${active ? "bg-blue" : "bg-border"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${active ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex justify-end gap-0.5">
                          <button type="button" aria-label="Edit fixture" className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-blue" onClick={() => setPanel({ kind: "form", editing: fixture })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete fixture"
                            className="rounded-md p-1.5 text-dim hover:bg-red-50 hover:text-danger"
                            disabled={busy}
                            onClick={() => window.confirm(`Delete ${fixture.loadName} → ${fixture.dischargeName}?`) && run(() => deleteFixtures([fixture.id]), () => "Fixture deleted.")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : fixtures.length ? (
          <EmptyState title="No fixtures match these filters" body="Clear the search or pick a different status, origin or batch." />
        ) : (
          <EmptyState
            title="No fixtures yet"
            body="Verified fixtures anchor hub quotes to real market rates. Add one by hand, paste a broker sheet or let AI read a rate sheet."
            action={
              <button type="button" className={btnPrimary} onClick={() => setPanel({ kind: "form", editing: null })}>
                <Plus className="h-4 w-4" />
                Add the first fixture
              </button>
            }
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[12.5px] text-mid">
          <span>
            {filtered.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "0 fixtures"}
          </span>
          <div className="flex items-center gap-2">
            {pages > 1 ? (
              <>
                <button type="button" className={btnGhost} disabled={current <= 1} onClick={() => setPage(current - 1)}>
                  Previous
                </button>
                <span>
                  Page {current} of {pages}
                </span>
                <button type="button" className={btnGhost} disabled={current >= pages} onClick={() => setPage(current + 1)}>
                  Next
                </button>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      {fixtures.length ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {fixtures.some((fixture) => fixture.origin !== "manual") ? (
            <button
              type="button"
              className={btnSecondary}
              disabled={busy}
              onClick={() => window.confirm("Delete every imported fixture? Manual fixtures stay.") && run(() => deleteFixtures("imported"), (count) => `Deleted ${count} imported fixtures.`)}
            >
              Clear all imported
            </button>
          ) : null}
          <button
            type="button"
            className={btnDanger}
            disabled={busy}
            onClick={() => window.confirm(`Delete all ${fixtures.length} fixtures? Hub quotes fall back to the algorithm alone.`) && run(() => deleteFixtures("all"), (count) => `Deleted ${count} fixtures.`)}
          >
            <Trash2 className="h-4 w-4" />
            Delete all fixtures
          </button>
        </div>
      ) : null}
    </div>
  );
}
