"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Mail, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeMembershipRequest, saveMembershipRequest } from "@/app/admin/aq-data/actions";
import { EmptyState, btnDanger, btnPrimary, label, textarea } from "@/components/admin/ui";
import { REQUEST_STATUSES, type MembershipRequest, type RequestStatus } from "@/lib/aq-modules/member-types";
import { MODULES, PLAN_LABEL } from "@/lib/aq-modules/types";
import { formatStamp } from "@/lib/content-types";

const STATUS_LABEL: Record<RequestStatus, string> = { new: "New", contacted: "Contacted", done: "Done" };

const TONE: Record<RequestStatus, string> = {
  new: "bg-[#e8f1fa] text-[#1463a5]",
  contacted: "bg-[#fff4de] text-[#9a5b00]",
  done: "bg-[#e7f6ec] text-[#1f7a45]",
};

const sourceLabel = (source: string) => (source ? (MODULES.find((item) => item.key === source)?.label ?? source) : "Membership page");
const planLabel = (plan: string) => PLAN_LABEL[plan as keyof typeof PLAN_LABEL] ?? plan;

function Row({ row, open, onToggle }: { row: MembershipRequest; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(row.status);
  const [note, setNote] = useState(row.adminNote);
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();
  const dirty = status !== row.status || note.trim() !== row.adminNote;

  const save = () =>
    startSave(async () => {
      const result = await saveMembershipRequest(row.id, { status, adminNote: note });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${row.name || row.email} marked ${STATUS_LABEL[status].toLowerCase()}.`);
      router.refresh();
    });

  const remove = () => {
    if (!window.confirm(`Delete the request from ${row.name || row.email}? This cannot be undone.`)) return;
    startRemove(async () => {
      const result = await removeMembershipRequest(row.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Request deleted.");
      router.refresh();
    });
  };

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_20px] items-center gap-3 px-5 py-3 text-left transition hover:bg-s2/50 ${open ? "bg-s2/40" : ""}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{row.name || row.email}</span>
          <span className="block truncate text-[12px] text-mid">
            {row.company || "No company"} · {row.email}
          </span>
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] text-ink">
            {planLabel(row.currentPlan)}
            <ArrowRight className="h-3 w-3 text-dim" />
            <span className="font-semibold">{planLabel(row.requestedPlan)}</span>
          </span>
          <span className="block truncate text-[11.5px] text-mid">From {sourceLabel(row.source)}</span>
        </span>
        <span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
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
                <a href={`mailto:${row.email}?subject=${encodeURIComponent(`Your Aquifert ${planLabel(row.requestedPlan)} request`)}`} className="inline-flex items-center gap-1 text-blue">
                  <Mail className="h-3 w-3" />
                  {row.email}
                </a>
              </dd>
              <dt className="text-dim">Company</dt>
              <dd className="text-ink">{row.company || "None given"}</dd>
              <dt className="text-dim">Plan</dt>
              <dd className="text-ink">
                {planLabel(row.currentPlan)} to {planLabel(row.requestedPlan)}
              </dd>
              <dt className="text-dim">Came from</dt>
              <dd className="text-ink">{sourceLabel(row.source)}</dd>
              <dt className="text-dim">Account id</dt>
              <dd className="break-all font-mono text-[11.5px] text-ink">{row.userId}</dd>
              <dt className="text-dim">Requested</dt>
              <dd className="text-ink">{formatStamp(row.at)} UTC</dd>
              {row.updatedAt ? (
                <>
                  <dt className="text-dim">Last updated</dt>
                  <dd className="text-ink">{formatStamp(row.updatedAt)} UTC</dd>
                </>
              ) : null}
            </dl>
            <div>
              <p className={label}>Their message</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-white px-3 py-2 text-ink">{row.message || <span className="text-dim">No message.</span>}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className={label}>Status</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
                {REQUEST_STATUSES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={status === key}
                    onClick={() => setStatus(key)}
                    className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition ${status === key ? "border-blue bg-blue text-white" : "border-border bg-white text-mid hover:text-ink"}`}
                  >
                    {STATUS_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor={`note-${row.id}`} className={label}>
                Desk note
              </label>
              <textarea id={`note-${row.id}`} rows={3} className={`${textarea} mt-1.5`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Invoice sent, plan changed on…" />
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

export function RequestsPanel({ rows }: { rows: MembershipRequest[] }) {
  const [filter, setFilter] = useState<"all" | RequestStatus>(() => (rows.some((row) => row.status === "new") ? "new" : "all"));
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const counts = Object.fromEntries(REQUEST_STATUSES.map((key) => [key, rows.filter((row) => row.status === key).length])) as Record<RequestStatus, number>;
  const shown = rows.filter(
    (row) => (filter === "all" || row.status === filter) && (!needle || [row.name, row.email, row.company, row.message, row.adminNote, row.source].some((value) => (value ?? "").toLowerCase().includes(needle))),
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <EmptyState title="No requests yet" body="When members ask for a higher plan from a locked module or the Membership page, the request lands here." />
      </div>
    );
  }

  return (
    <section className="overflow-hidden aq-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
          {(["all", ...REQUEST_STATUSES] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition ${filter === key ? "bg-blue-light text-blue" : "text-mid hover:text-ink"}`}
            >
              {key === "all" ? "All" : STATUS_LABEL[key]} <span className="font-mono text-[11px] opacity-70">{key === "all" ? rows.length : counts[key]}</span>
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, message" aria-label="Search requests" className="h-9 w-64 rounded-lg border border-border bg-white pl-8 pr-3 text-[13px] text-ink" />
        </label>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_20px] gap-3 border-b border-border bg-s2/50 px-5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-dim md:grid">
        <span>Member</span>
        <span>Plan</span>
        <span>Status</span>
        <span>Requested</span>
        <span />
      </div>
      {shown.length ? (
        <ul>
          {shown.map((row) => (
            <Row key={`${row.id}-${row.updatedAt ?? ""}`} row={row} open={openId === row.id} onToggle={() => setOpenId((current) => (current === row.id ? null : row.id))} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-10 text-center text-[13px] text-dim">No requests match.</p>
      )}
    </section>
  );
}
