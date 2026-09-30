"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveDuties } from "@/app/admin/netback/actions";
import { SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { FlagMark } from "@/components/calculators/flag-mark";
import { Card, CardHeader, EmptyState, btnGhost, btnSecondary, field, label, textarea } from "@/components/admin/ui";
import { DUTY_TONES, NO_DUTY_NOTE, type DutyRecord, type DutyTone } from "@/lib/netback-desk/types";

type Row = DutyRecord & { id: number };

const BANNER: Record<DutyTone, string> = {
  active: "border-[#f5c2c2] bg-[#fdf1f1] text-[#b42318]",
  warn: "border-[#f5dfb3] bg-[#fff8ea] text-[#9a5b00]",
  ok: "border-[#cdebd8] bg-[#f1faf4] text-[#1f7a45]",
  dim: "border-border bg-s2 text-dim",
};

let nextId = 1;
const withIds = (records: DutyRecord[]): Row[] => records.map((record) => ({ ...record, id: nextId++ }));
const strip = (rows: Row[]): DutyRecord[] => rows.map(({ country, rate, active, afrmm, note, tone }) => ({ country, rate, active, afrmm, note, tone }));

function Toggle({ checked, onChange, text }: { checked: boolean; onChange: (value: boolean) => void; text: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={text}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#1f7a45]" : "bg-[#cfd9e2]"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {text}
    </label>
  );
}

export function NetbackDutiesPanel({ initial, gaps, countries, savedAt: initialSavedAt }: { initial: DutyRecord[]; gaps: { country: string; count: number }[]; countries: string[]; savedAt: string | null }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => withIds(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [query, setQuery] = useState("");
  const [saving, start] = useTransition();
  const current = strip(rows);
  const dirty = JSON.stringify(current) !== baseline;
  const names = rows.map((row) => row.country.trim().toLowerCase()).filter(Boolean);
  const duplicates = new Set(names.filter((name, index) => names.indexOf(name) !== index));
  const listed = new Set(names);
  const openGaps = gaps.filter((gap) => !listed.has(gap.country.toLowerCase()));
  const needle = query.trim().toLowerCase();
  const shown = needle ? rows.filter((row) => !row.country || row.country.toLowerCase().includes(needle) || row.note.toLowerCase().includes(needle)) : rows;

  const update = (id: number, patch: Partial<DutyRecord>) => setRows((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const add = (country = "") => {
    setRows((list) => [{ id: nextId++, country, rate: 0, active: false, afrmm: false, note: "", tone: "dim" }, ...list]);
    setQuery("");
  };

  const save = () => {
    if (duplicates.size) {
      toast.error("A country is listed twice. Keep one row per country.");
      return;
    }
    start(async () => {
      const result = await saveDuties(current);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setRows(withIds(result.duties));
      setBaseline(JSON.stringify(result.duties));
      setSavedAt(result.savedAt);
      toast.success("Import duties saved. Members see them on their next destination.");
      router.refresh();
    });
  };

  useEditorGuards(dirty, save);

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save} saveLabel="Save duties">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a country" aria-label="Find a country" className={`${field} h-9 w-56 pl-9`} />
        </div>
        <button type="button" className={btnSecondary} onClick={() => add()}>
          <Plus className="h-4 w-4" />
          Add country
        </button>
      </SaveBar>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader title="Duty by destination country" meta="The rate and switch are filled in when a member picks a port in that country. Members can still change both." />
          <datalist id="duty-countries">
            {countries.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
          {shown.length ? (
            <ul className="divide-y divide-border">
              {shown.map((row) => {
                const duplicate = duplicates.has(row.country.trim().toLowerCase());
                return (
                  <li key={row.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[200px] flex-1">
                        <span className={label}>Country</span>
                        <div className="relative mt-1.5">
                          {row.country ? <FlagMark country={row.country} className="pointer-events-none absolute left-3 top-1/2 h-3 w-[18px] -translate-y-1/2" /> : null}
                          <input
                            list="duty-countries"
                            value={row.country}
                            onChange={(event) => update(row.id, { country: event.target.value })}
                            placeholder="Country"
                            aria-label="Country"
                            className={`${field} h-9 w-full ${row.country ? "pl-9" : ""} ${duplicate || !row.country.trim() ? "border-[#e8b44c]" : ""}`}
                          />
                        </div>
                      </div>
                      <div>
                        <span className={label}>Duty</span>
                        <div className="mt-1.5 flex items-center overflow-hidden rounded-lg border border-border bg-white">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={0.25}
                            value={row.rate}
                            onChange={(event) => update(row.id, { rate: Number(event.target.value) })}
                            aria-label={`${row.country || "Country"} duty rate`}
                            className={`${field} h-9 w-20 border-0 text-right font-mono focus:ring-0`}
                          />
                          <span className="border-l border-border bg-s2/60 px-2 py-2 text-[11.5px] text-mid">%</span>
                        </div>
                      </div>
                      <div>
                        <span className={label}>Banner</span>
                        <select value={row.tone} onChange={(event) => update(row.id, { tone: event.target.value as DutyTone })} aria-label="Banner tone" className={`${field} mt-1.5 h-9`}>
                          {DUTY_TONES.map((tone) => (
                            <option key={tone.value} value={tone.value}>
                              {tone.label} · {tone.hint}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex h-9 flex-wrap items-center gap-4">
                        <Toggle checked={row.active} onChange={(value) => update(row.id, { active: value })} text="On by default" />
                        <Toggle checked={row.afrmm} onChange={(value) => update(row.id, { afrmm: value })} text="AFRMM levy" />
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${row.country || "row"}`}
                        onClick={() => setRows((list) => list.filter((item) => item.id !== row.id))}
                        className="ml-auto rounded-md p-2 text-dim transition hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <textarea
                        value={row.note}
                        onChange={(event) => update(row.id, { note: event.target.value })}
                        rows={2}
                        maxLength={600}
                        placeholder="What members read under Import duty, e.g. the reference rate and what to confirm."
                        aria-label={`${row.country || "Country"} note`}
                        className={`${textarea} text-[12.5px]`}
                      />
                      <div>
                        <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
                          Members see{row.active && row.rate > 0 ? ` · duty on at ${row.rate}%` : row.rate > 0 ? ` · ${row.rate}% suggested, off` : ""}
                        </p>
                        <p className={`whitespace-pre-line rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed ${BANNER[row.tone]}`}>
                          {row.note.trim() || NO_DUTY_NOTE}
                          {row.afrmm ? "\nAFRMM levy applies to the ocean freight." : ""}
                        </p>
                      </div>
                    </div>
                    {duplicate ? <p className="mt-2 text-[12px] text-[#9a5b00]">This country is listed twice.</p> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title={needle ? "No countries match" : "No duty records yet"}
              body={needle ? "Clear the search or add the country." : "Destinations without a record show the standard note and no duty."}
              action={
                <button type="button" className={btnSecondary} onClick={() => add(needle ? query.trim() : "")}>
                  <Plus className="h-4 w-4" />
                  Add {needle ? query.trim() : "a country"}
                </button>
              }
            />
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Looked up, no record" meta="Destination countries members calculated for" />
            {openGaps.length ? (
              <ul className="divide-y divide-border">
                {openGaps.slice(0, 12).map((gap) => (
                  <li key={gap.country} className="flex items-center gap-2.5 px-5 py-2">
                    <FlagMark country={gap.country} className="h-3 w-[18px]" />
                    <span className="flex-1 text-[13px] text-ink">{gap.country}</span>
                    <span className="font-mono text-[11.5px] text-dim">{gap.count}×</span>
                    <button type="button" className={btnGhost} onClick={() => add(gap.country)}>
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-[12.5px] text-mid">Every destination members have used has a duty record.</p>
            )}
          </Card>
          <Card className="px-5 py-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">Any other country</p>
            <p className={`mt-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed ${BANNER.dim}`}>{NO_DUTY_NOTE}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-mid">Duty is charged on CIF going forward (CFR plus insurance) and solved on the implied CFR going back. The rate is capped at 50%.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
