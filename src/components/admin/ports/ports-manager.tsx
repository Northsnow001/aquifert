"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePorts, resetPortsFromSeed, setPortsActive, setPortsRegion } from "@/app/admin/ports/actions";
import { PortEditor } from "@/components/admin/ports/port-editor";
import { FlagMark } from "@/components/calculators/flag-mark";
import { Card, EmptyState, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import { ISSUE_LABEL, type PortIssue } from "@/lib/freight-desk/port-quality";
import { REGIONS, type PortEntry } from "@/lib/freight-desk/types";

const PAGE_SIZE = 50;
type Status = "all" | "live" | "inactive" | "review";
type Sort = "name" | "country" | "region" | "code" | "usage";
type Usage = Record<string, { quotes: number; fixtures: number }>;

export function PortsManager({
  ports,
  issues,
  usage,
  customized,
  seedCount,
  countries,
}: {
  ports: PortEntry[];
  issues: Record<string, PortIssue[]>;
  usage: Usage;
  customized: boolean;
  seedCount: number;
  countries: string[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTo, setMoveTo] = useState("");
  const [editing, setEditing] = useState<PortEntry | "new" | null>(null);

  const counts = useMemo(
    () => ({
      all: ports.length,
      live: ports.filter((port) => port.active).length,
      inactive: ports.filter((port) => !port.active).length,
      review: ports.filter((port) => issues[port.code]?.length).length,
    }),
    [ports, issues],
  );
  const regionCounts = useMemo(() => {
    const out = new Map<string, number>();
    for (const port of ports) out.set(port.region, (out.get(port.region) ?? 0) + 1);
    return out;
  }, [ports]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const used = (port: PortEntry) => (usage[port.code]?.quotes ?? 0) + (usage[port.code]?.fixtures ?? 0);
    const rows = ports.filter((port) => {
      if (status === "live" && !port.active) return false;
      if (status === "inactive" && port.active) return false;
      if (status === "review" && !issues[port.code]?.length) return false;
      if (region && port.region !== region) return false;
      if (!needle) return true;
      return [port.name, port.code, port.country, ...port.aliases].some((value) => value.toLowerCase().includes(needle));
    });
    const compare: Record<Sort, (a: PortEntry, b: PortEntry) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      country: (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
      region: (a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name),
      code: (a, b) => a.code.localeCompare(b.code),
      usage: (a, b) => used(b) - used(a) || a.name.localeCompare(b.name),
    };
    return [...rows].sort(compare[sort]);
  }, [ports, query, status, region, sort, issues, usage]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectedCodes = ports.filter((port) => selected.has(port.code)).map((port) => port.code);
  const allVisibleSelected = visible.length > 0 && visible.every((port) => selected.has(port.code));

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

  const filter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const closeEditor = useCallback(
    (saved: boolean) => {
      setEditing(null);
      if (saved) router.refresh();
    },
    [router],
  );

  const confirmDelete = (codes: string[]) => {
    const refs = codes.reduce((sum, code) => sum + (usage[code]?.fixtures ?? 0), 0);
    const names = codes.length === 1 ? ports.find((port) => port.code === codes[0])?.name ?? codes[0] : `${codes.length} ports`;
    const note = refs ? ` ${refs} fixture ${refs === 1 ? "leg uses" : "legs use"} ${codes.length === 1 ? "this code" : "these codes"} and will match by name or region instead.` : "";
    if (!window.confirm(`Delete ${names} from the registry?${note} Deactivating keeps the port for later.`)) return;
    run(() => deletePorts(codes), (count) => `Deleted ${count} ${count === 1 ? "port" : "ports"}.`);
  };

  const tiles: { key: Status; label: string; hint: string }[] = [
    { key: "all", label: "In registry", hint: customized ? "Edited registry" : "Built-in list" },
    { key: "live", label: "Live on the hub", hint: "Members can pick these" },
    { key: "inactive", label: "Inactive", hint: "Hidden from members" },
    { key: "review", label: "Needs review", hint: "Code, region or position" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => {
          const active = status === tile.key;
          const warn = tile.key === "review" && counts.review > 0;
          return (
            <button
              key={tile.key}
              type="button"
              aria-pressed={active}
              onClick={() => filter(setStatus)(active && tile.key !== "all" ? "all" : tile.key)}
              className={`rounded-2xl border bg-surface px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition ${active ? "border-blue ring-2 ring-blue/15" : "border-border hover:border-blue/40"}`}
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{tile.label}</p>
              <p className={`mt-1 text-[22px] font-bold tracking-tight ${warn ? "text-[#9a5b00]" : "text-ink"}`}>{counts[tile.key].toLocaleString("en-US")}</p>
              <p className="mt-0.5 text-[12px] text-mid">{tile.hint}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
            <input aria-label="Search ports" value={query} onChange={(event) => filter(setQuery)(event.target.value)} placeholder="Search name, other names, LOCODE or country" className={`${field} h-9 w-full pl-9`} />
          </div>
          <select aria-label="Region" value={region} onChange={(event) => filter(setRegion)(event.target.value)} className={`${field} h-9`}>
            <option value="">All regions</option>
            {REGIONS.map((item) => (
              <option key={item} value={item}>
                {item} ({regionCounts.get(item) ?? 0})
              </option>
            ))}
          </select>
          <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className={`${field} h-9`}>
            <option value="name">Name A–Z</option>
            <option value="country">Country</option>
            <option value="region">Region</option>
            <option value="code">Code</option>
            <option value="usage">Most used</option>
          </select>
          <button type="button" className={btnPrimary} onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Add port
          </button>
        </div>

        {selectedCodes.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-blue-light/50 px-4 py-2">
            <span className="mr-2 text-[12.5px] font-semibold text-ink">{selectedCodes.length} selected</span>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => setPortsActive(selectedCodes, true), (count) => `${count} ports are live.`)}>
              Make live
            </button>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => setPortsActive(selectedCodes, false), (count) => `${count} ports deactivated.`)}>
              Deactivate
            </button>
            <span className="flex items-center gap-1">
              <select aria-label="Move to region" value={moveTo} onChange={(event) => setMoveTo(event.target.value)} className={`${field} h-8 text-[12.5px]`}>
                <option value="">Move to region…</option>
                {REGIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <button
                type="button"
                className={btnGhost}
                disabled={busy || !moveTo}
                onClick={() => run(() => setPortsRegion(selectedCodes, moveTo), (count) => `Moved ${count} ports to ${moveTo}.`)}
              >
                Apply
              </button>
            </span>
            <button type="button" className={`${btnGhost} text-danger hover:text-danger`} disabled={busy} onClick={() => confirmDelete(selectedCodes)}>
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
                          for (const port of visible) {
                            if (allVisibleSelected) next.delete(port.code);
                            else next.add(port.code);
                          }
                          return next;
                        })
                      }
                      className="h-4 w-4 accent-[var(--color-blue)]"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Port</th>
                  <th className="px-3 py-2.5 font-semibold">Country</th>
                  <th className="px-3 py-2.5 font-semibold">Region</th>
                  <th className="px-3 py-2.5 font-semibold">Code</th>
                  <th className="px-3 py-2.5 font-semibold">Position</th>
                  <th className="px-3 py-2.5 font-semibold">Used</th>
                  <th className="px-3 py-2.5 font-semibold">Live</th>
                  <th className="w-20 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((port) => {
                  const problems = issues[port.code] ?? [];
                  const use = usage[port.code];
                  return (
                    <tr key={port.code} className={`${selected.has(port.code) ? "bg-s2/50" : "hover:bg-s2/30"} ${port.active ? "" : "text-mid"}`}>
                      <td className="px-4 py-2.5 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Select ${port.name}`}
                          checked={selected.has(port.code)}
                          onChange={() =>
                            setSelected((currentSet) => {
                              const next = new Set(currentSet);
                              if (next.has(port.code)) next.delete(port.code);
                              else next.add(port.code);
                              return next;
                            })
                          }
                          className="mt-0.5 h-4 w-4 accent-[var(--color-blue)]"
                        />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <button type="button" onClick={() => setEditing(port)} className={`text-left font-semibold hover:text-blue ${port.active ? "text-ink" : "text-mid"}`}>
                          {port.name}
                        </button>
                        {port.aliases.length ? <p className="mt-0.5 max-w-[280px] truncate text-[11.5px] text-dim" title={port.aliases.join(", ")}>Also {port.aliases.join(", ")}</p> : null}
                        {problems.length ? (
                          <ul className="mt-1 space-y-0.5">
                            {problems.map((problem) => (
                              <li key={problem.kind} className="flex items-start gap-1.5 text-[11.5px] text-[#9a5b00]">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>
                                  <span className="font-semibold">{ISSUE_LABEL[problem.kind]}:</span> {problem.message}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top">
                        <span className="flex items-center gap-2">
                          <FlagMark country={port.country} className="h-3.5 w-5 shrink-0" />
                          {port.country}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top">{port.region}</td>
                      <td className="px-3 py-2.5 align-top font-mono text-[12.5px] font-semibold">{port.code}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${port.lat}&mlon=${port.lon}#map=10/${port.lat}/${port.lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[12px] text-mid no-underline hover:text-blue"
                          title="Open in OpenStreetMap"
                        >
                          {port.lat.toFixed(2)}, {port.lon.toFixed(2)}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top text-[12px] text-mid">
                        {use ? (
                          <>
                            {use.quotes ? <span>{use.quotes} quotes</span> : null}
                            {use.quotes && use.fixtures ? " · " : null}
                            {use.fixtures ? <span>{use.fixtures} fixtures</span> : null}
                          </>
                        ) : (
                          <span className="text-dim">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={port.active}
                          aria-label={port.active ? `Deactivate ${port.name}` : `Make ${port.name} live`}
                          disabled={busy}
                          onClick={() => run(() => setPortsActive([port.code], !port.active), () => (port.active ? `${port.name} is hidden from members.` : `${port.name} is live.`))}
                          className={`relative mt-0.5 h-5 w-9 rounded-full transition ${port.active ? "bg-blue" : "bg-border"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${port.active ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex justify-end gap-0.5">
                          <button type="button" aria-label={`Edit ${port.name}`} className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-blue" onClick={() => setEditing(port)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label={`Delete ${port.name}`} className="rounded-md p-1.5 text-dim hover:bg-red-50 hover:text-danger" disabled={busy} onClick={() => confirmDelete([port.code])}>
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
        ) : (
          <EmptyState title="No ports match" body="Clear the search, or pick a different region or status." />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[12.5px] text-mid">
          <span>{filtered.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "0 ports"}</span>
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <button type="button" className={btnGhost} disabled={current <= 1} onClick={() => setPage(current - 1)}>
                Previous
              </button>
              <span>
                Page {current} of {pages}
              </span>
              <button type="button" className={btnGhost} disabled={current >= pages} onClick={() => setPage(current + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3">
        <p className="text-[12.5px] text-mid">
          {customized
            ? `This registry has been edited. The built-in list has ${seedCount} ports.`
            : `You are on the built-in list of ${seedCount} ports. Your first edit saves a copy you control.`}
        </p>
        {customized ? (
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() =>
              window.confirm(`Replace the registry with the built-in ${seedCount} ports? Added ports, edits and inactive flags are lost.`) &&
              run(() => resetPortsFromSeed(), (count) => `Registry reset to ${count} built-in ports.`)
            }
          >
            <RotateCcw className="h-4 w-4" />
            Reset to built-in list
          </button>
        ) : null}
      </div>

      {editing ? (
        <PortEditor
          key={editing === "new" ? "new" : editing.code}
          port={editing === "new" ? null : editing}
          countries={countries}
          fixtureRefs={editing === "new" ? 0 : (usage[editing.code]?.fixtures ?? 0)}
          onClose={closeEditor}
        />
      ) : null}
    </div>
  );
}
