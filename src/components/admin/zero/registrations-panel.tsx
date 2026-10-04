"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Mail, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeZeroRegistration, saveZeroRegistration } from "@/app/admin/zero/actions";
import { EmptyState, btnDanger, btnPrimary, label, textarea } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { intentOf, programmeName, ZERO_INTENT_SHORT, ZERO_INTENTS, ZERO_STATUSES, ZERO_STATUS_LABEL, type ZeroIntent, type ZeroRegistration, type ZeroStatus } from "@/lib/zero-types";

const TONE: Record<ZeroStatus, string> = {
  new: "bg-[#e8f1fa] text-[#1463a5]",
  contacted: "bg-[#fff4de] text-[#9a5b00]",
  scheduled: "bg-[#efe9fb] text-[#5b3cc4]",
  offered: "bg-[#e7f6ec] text-[#1f7a45]",
  declined: "bg-s2 text-dim",
};

const INTENT_TONE: Record<ZeroIntent, string> = { waitlist: "bg-s2 text-mid", call: "bg-[#fff4de] text-[#9a5b00]" };

const tonnes = (value: string) => (Number(value) > 0 ? `${Number(value).toLocaleString("en-GB")} MT` : value || "—");

const callDay = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Row({ row, open, onToggle }: { row: ZeroRegistration; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<ZeroStatus>(row.status);
  const [note, setNote] = useState(row.adminNote);
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();
  const dirty = status !== row.status || note.trim() !== row.adminNote;

  const save = () =>
    startSave(async () => {
      const result = await saveZeroRegistration(row.id, { status, adminNote: note });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${row.company || row.name} marked ${ZERO_STATUS_LABEL[status].toLowerCase()}.`);
      router.refresh();
    });

  const remove = () => {
    if (!window.confirm(`Delete the registration from ${row.name} (${row.company})? This cannot be undone.`)) return;
    startRemove(async () => {
      await removeZeroRegistration(row.id);
      toast.success("Registration deleted.");
      router.refresh();
    });
  };

  return (
    <li className="border-b border-border last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className={`grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_20px] items-center gap-3 px-5 py-3 text-left transition hover:bg-s2/50 ${open ? "bg-s2/40" : ""}`}>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold text-ink">{row.company || "No company"}</span>
            <span className={`shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold ${INTENT_TONE[intentOf(row)]}`}>{ZERO_INTENT_SHORT[intentOf(row)]}</span>
          </span>
          <span className="block truncate text-[12px] text-mid">
            {row.name} · {row.email}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-ink">{[programmeName(row.programme), row.product].filter(Boolean).join(" · ")}</span>
          <span className="block font-mono text-[11.5px] text-mid">{tonnes(row.annualVolume)} / yr</span>
        </span>
        <span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[row.status]}`}>{ZERO_STATUS_LABEL[row.status]}</span>
        </span>
        <span className="font-mono text-[11.5px] text-dim">{formatStamp(row.at)}</span>
        <ChevronDown className={`h-4 w-4 text-dim transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="grid gap-5 border-t border-border bg-s2/20 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-[13px]">
            <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-y-1.5">
              <dt className="text-dim">Contact</dt>
              <dd className="text-ink">
                {row.name}{" "}
                <a href={`mailto:${row.email}?subject=${encodeURIComponent("Aquifert Zero")}`} className="inline-flex items-center gap-1 text-blue">
                  <Mail className="h-3 w-3" />
                  {row.email}
                </a>
              </dd>
              <dt className="text-dim">Request</dt>
              <dd className="text-ink">{intentOf(row) === "call" ? "Book a call for early discounted access" : "Join the waitlist"}</dd>
              {intentOf(row) === "call" ? (
                <>
                  <dt className="text-dim">Calendly</dt>
                  <dd className="text-ink">
                    {row.callBookedAt ? (
                      <>
                        Booked {formatStamp(row.callBookedAt)}
                        <span className="text-dim"> · time and invite are in Calendly</span>
                      </>
                    ) : (
                      <span className="text-dim">Not booked yet. The member has the Calendly link in their confirmation email.</span>
                    )}
                  </dd>
                  {row.callDate ? (
                    <>
                      <dt className="text-dim">Preferred call</dt>
                      <dd className="text-ink">
                        {callDay(row.callDate)}
                        {row.callWindow ? `, ${row.callWindow}` : ""}
                        {row.timezone ? <span className="text-dim"> ({row.timezone})</span> : null}
                      </dd>
                    </>
                  ) : null}
                  {row.phone ? (
                    <>
                      <dt className="text-dim">Phone</dt>
                      <dd className="text-ink">
                        <a href={`tel:${row.phone.replace(/[^\d+]/g, "")}`} className="text-blue">
                          {row.phone}
                        </a>
                      </dd>
                    </>
                  ) : null}
                </>
              ) : null}
              <dt className="text-dim">Programme</dt>
              <dd className="text-ink">{programmeName(row.programme) || <span className="text-dim">Not chosen</span>}</dd>
              <dt className="text-dim">Annual volume</dt>
              <dd className="text-ink">{tonnes(row.annualVolume)}</dd>
              <dt className="text-dim">Product</dt>
              <dd className="text-ink">{row.product}</dd>
              <dt className="text-dim">Registered</dt>
              <dd className="text-ink">{formatStamp(row.at)}</dd>
              {row.updatedAt ? (
                <>
                  <dt className="text-dim">Last updated</dt>
                  <dd className="text-ink">{formatStamp(row.updatedAt)}</dd>
                </>
              ) : null}
            </dl>
            <div>
              <p className={label}>Their notes</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-white px-3 py-2 text-ink">{row.notes || <span className="text-dim">No notes.</span>}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className={label}>Stage</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage">
                {ZERO_STATUSES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={status === key}
                    onClick={() => setStatus(key)}
                    className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition ${status === key ? "border-blue bg-blue text-white" : "border-border bg-white text-mid hover:text-ink"}`}
                  >
                    {ZERO_STATUS_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor={`note-${row.id}`} className={label}>
                Desk note
              </label>
              <textarea id={`note-${row.id}`} rows={3} className={`${textarea} mt-1.5`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Call booked for Tuesday, wants Q1 slot…" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" className={btnDanger} onClick={remove} disabled={removing}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button type="button" className={btnPrimary} onClick={save} disabled={!dirty || saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ZeroRegistrationsPanel({ rows }: { rows: ZeroRegistration[] }) {
  const [filter, setFilter] = useState<"all" | ZeroStatus>("all");
  const [intent, setIntent] = useState<"all" | ZeroIntent>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const byIntent = rows.filter((row) => intent === "all" || intentOf(row) === intent);
  const counts = Object.fromEntries(ZERO_STATUSES.map((key) => [key, byIntent.filter((row) => row.status === key).length])) as Record<ZeroStatus, number>;
  const shown = byIntent.filter(
    (row) =>
      (filter === "all" || row.status === filter) &&
      (!needle || [row.name, row.email, row.company, programmeName(row.programme), row.product, row.notes, row.adminNote, row.phone ?? ""].some((value) => value.toLowerCase().includes(needle))),
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <EmptyState title="No registrations yet" body="When members register on the Aquifert Zero tab of the Order Desk, they appear here with their volume and product." />
      </div>
    );
  }

  return (
    <section className="overflow-hidden aq-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by stage">
          {(["all", ...ZERO_STATUSES] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition ${filter === key ? "bg-blue-light text-blue" : "text-mid hover:text-ink"}`}
            >
              {key === "all" ? "All" : ZERO_STATUS_LABEL[key]} <span className="font-mono text-[11px] opacity-70">{key === "all" ? byIntent.length : counts[key]}</span>
            </button>
          ))}
        </div>
        <select value={intent} onChange={(event) => setIntent(event.target.value as "all" | ZeroIntent)} aria-label="Filter by request" className="h-9 rounded-lg border border-border bg-white px-2.5 text-[13px] text-ink">
          <option value="all">Waitlist and calls</option>
          {ZERO_INTENTS.map((key) => (
            <option key={key} value={key}>
              {key === "call" ? "Call requests" : "Waitlist"} ({rows.filter((row) => intentOf(row) === key).length})
            </option>
          ))}
        </select>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, notes" aria-label="Search registrations" className="h-9 w-56 rounded-lg border border-border bg-white pl-8 pr-3 text-[13px] text-ink" />
        </label>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_20px] gap-3 border-b border-border bg-s2/50 px-5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-dim md:grid">
        <span>Company</span>
        <span>Interest</span>
        <span>Stage</span>
        <span>Registered</span>
        <span />
      </div>
      {shown.length ? (
        <ul>
          {shown.map((row) => (
            <Row key={`${row.id}-${row.updatedAt ?? ""}`} row={row} open={openId === row.id} onToggle={() => setOpenId((current) => (current === row.id ? null : row.id))} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-10 text-center text-[13px] text-dim">No registrations match.</p>
      )}
    </section>
  );
}
