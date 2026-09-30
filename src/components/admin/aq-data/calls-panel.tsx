"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, ChevronDown, Download, Mail, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { deleteCall, saveCall, type CallInput } from "@/app/admin/aq-data/actions";
import { CALL_ZONES, DEFAULT_ZONE, utcLabel, utcToWall, wallToUtc } from "@/components/admin/aq-data/zones";
import { EmptyState, Pill, btnGhost, btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import type { CallRegistration } from "@/lib/aq-modules/member-types";
import type { CommunityCall } from "@/lib/aq-modules/types";
import { formatStamp } from "@/lib/content-types";

function CallForm({ call, onDone }: { call: CommunityCall | null; onDone: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<CallInput>(() => {
    const wall = call ? utcToWall(call.startsAt, DEFAULT_ZONE) : { date: "", time: "14:00" };
    return {
      id: call?.id ?? null,
      topic: call?.topic ?? "",
      host: call?.host ?? "Aquifert Desk",
      description: call?.description ?? "",
      date: wall.date,
      time: wall.time,
      zone: DEFAULT_ZONE,
      durationMinutes: call?.durationMinutes ?? 45,
      joinUrl: call?.joinUrl ?? "",
      recordingUrl: call?.recordingUrl ?? "",
      status: call?.status ?? "scheduled",
    };
  });
  const [saving, startSave] = useTransition();
  const set = <K extends keyof CallInput>(key: K, value: CallInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const startsAt = wallToUtc(form.date, form.time, form.zone);
  const zoneLabel = CALL_ZONES.find((zone) => zone.value === form.zone)?.label ?? form.zone;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startSave(async () => {
      const result = await saveCall(form);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(call ? "Call updated." : "Call scheduled. It shows on the hub now.");
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 border-b border-border bg-s2/20 px-5 py-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="call-topic" className={label}>
            Topic
          </label>
          <input id="call-topic" className={`${input} mt-1.5`} value={form.topic} onChange={(event) => set("topic", event.target.value)} placeholder="Q4 nitrogen and freight outlook" required />
        </div>
        <div>
          <label htmlFor="call-host" className={label}>
            Host
          </label>
          <input id="call-host" className={`${input} mt-1.5`} value={form.host} onChange={(event) => set("host", event.target.value)} placeholder="Aquifert Desk" />
        </div>
      </div>
      <div>
        <label htmlFor="call-description" className={label}>
          Description
        </label>
        <textarea id="call-description" rows={3} className={`${textarea} mt-1.5`} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="What the desk will cover and who it is for." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="call-date" className={label}>
            Date
          </label>
          <input id="call-date" type="date" className={`${input} mt-1.5`} value={form.date} onChange={(event) => set("date", event.target.value)} required />
        </div>
        <div>
          <label htmlFor="call-time" className={label}>
            Start time
          </label>
          <input id="call-time" type="time" className={`${input} mt-1.5`} value={form.time} onChange={(event) => set("time", event.target.value)} required />
        </div>
        <div>
          <label htmlFor="call-zone" className={label}>
            Time zone of that time
          </label>
          <select id="call-zone" className={`${input} mt-1.5`} value={form.zone} onChange={(event) => set("zone", event.target.value)}>
            {CALL_ZONES.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="call-duration" className={label}>
            Duration (minutes)
          </label>
          <input id="call-duration" type="number" min={5} max={480} step={5} className={`${input} mt-1.5`} value={form.durationMinutes} onChange={(event) => set("durationMinutes", Number(event.target.value))} required />
        </div>
      </div>
      <p className={`rounded-lg border px-3 py-2 text-[12.5px] ${startsAt ? "border-blue/20 bg-blue-light/50 text-ink" : "border-border bg-white text-dim"}`}>
        {startsAt ? (
          <>
            {form.date} {form.time} in {zoneLabel} is saved as <span className="font-semibold">{utcLabel(startsAt)}</span>.
          </>
        ) : (
          `Enter a date and start time. They are read as ${zoneLabel} time and saved in UTC.`
        )}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="call-join" className={label}>
            Join link
          </label>
          <input id="call-join" type="url" className={`${input} mt-1.5`} value={form.joinUrl} onChange={(event) => set("joinUrl", event.target.value)} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="call-recording" className={label}>
            Recording link <span className="font-normal text-dim">(after the call)</span>
          </label>
          <input id="call-recording" type="url" className={`${input} mt-1.5`} value={form.recordingUrl} onChange={(event) => set("recordingUrl", event.target.value)} placeholder="https://" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
          {(["scheduled", "cancelled"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={form.status === key}
              onClick={() => set("status", key)}
              className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold capitalize transition ${form.status === key ? "border-blue bg-blue text-white" : "border-border bg-white text-mid hover:text-ink"}`}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving || !startsAt || !form.topic.trim()}>
            {saving ? "Saving…" : call ? "Save call" : "Schedule call"}
          </button>
        </div>
      </div>
    </form>
  );
}

function RegistrationsTable({ rows }: { rows: CallRegistration[] }) {
  if (!rows.length) return <p className="px-5 py-6 text-center text-[13px] text-dim">No one has registered yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-[12.5px]">
        <thead className="bg-s2/50 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
          <tr>
            <th className="px-5 py-2 font-semibold">Name</th>
            <th className="px-3 py-2 font-semibold">Company</th>
            <th className="px-3 py-2 font-semibold">Country</th>
            <th className="px-3 py-2 font-semibold">Question</th>
            <th className="px-3 py-2 font-semibold">Reminders</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-5 py-2 font-semibold">Registered</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border align-top">
              <td className="px-5 py-2">
                <span className="block font-semibold text-ink">{row.name || "No name"}</span>
                <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 text-blue">
                  <Mail className="h-3 w-3" />
                  {row.email}
                </a>
              </td>
              <td className="px-3 py-2 text-ink">{row.company || <span className="text-dim">None</span>}</td>
              <td className="px-3 py-2 text-ink">{row.country || <span className="text-dim">None</span>}</td>
              <td className="max-w-[260px] whitespace-pre-wrap px-3 py-2 text-ink">{row.question || <span className="text-dim">None</span>}</td>
              <td className="px-3 py-2">{row.reminders ? <Pill tone="teal">Yes</Pill> : <span className="text-dim">No</span>}</td>
              <td className="px-3 py-2">{row.status === "registered" ? <Pill tone="blue">Registered</Pill> : <Pill>Cancelled</Pill>}</td>
              <td className="px-5 py-2 font-mono text-[11.5px] text-dim">{formatStamp(row.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CallRow({ call, registrations, past }: { call: CommunityCall; registrations: CallRegistration[]; past: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [removing, startRemove] = useTransition();
  const registered = registrations.filter((row) => row.status === "registered");
  const reminders = registered.filter((row) => row.reminders).length;
  const cancelled = registrations.length - registered.length;

  const remove = () => {
    const warning = registered.length ? ` ${registered.length} registered ${registered.length === 1 ? "member" : "members"} will no longer see it.` : "";
    if (!window.confirm(`Delete "${call.topic}"?${warning} Registrations stay in the CSV download. This cannot be undone.`)) return;
    startRemove(async () => {
      const result = await deleteCall(call.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Call deleted.");
      router.refresh();
    });
  };

  if (editing) return <CallForm call={call} onDone={() => setEditing(false)} />;

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-ink">{call.topic}</p>
            {call.status === "cancelled" ? <Pill tone="amber">Cancelled</Pill> : past ? <Pill>Held</Pill> : <Pill tone="blue">Scheduled</Pill>}
            {past && call.status === "scheduled" && !call.recordingUrl ? <Pill tone="amber">No recording link</Pill> : null}
            {!past && call.status === "scheduled" && !call.joinUrl ? <Pill tone="amber">No join link</Pill> : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-mid">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {utcLabel(call.startsAt)} · {call.durationMinutes} min
            </span>
            <span>{call.host}</span>
            {call.joinUrl ? (
              <a href={call.joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue">
                <Video className="h-3.5 w-3.5" />
                Join link
              </a>
            ) : null}
            {call.recordingUrl ? (
              <a href={call.recordingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue">
                <Video className="h-3.5 w-3.5" />
                Recording
              </a>
            ) : null}
          </p>
          {call.description ? <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-mid">{call.description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <button type="button" className={btnGhost} onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button type="button" className={`${btnGhost} text-danger hover:text-danger`} onClick={remove} disabled={removing}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-border bg-s2/30 pr-5 text-[12.5px]">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2 pl-5 text-left transition hover:text-ink"
        >
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-mid">
            <span className="font-semibold text-ink">{registered.length} registered</span>
            <span className="inline-flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {reminders} want reminders
            </span>
            {cancelled ? <span>{cancelled} cancelled</span> : null}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-dim transition ${open ? "rotate-180" : ""}`} />
        </button>
        {registrations.length ? (
          <a href={`/admin/community-calls/export?call=${encodeURIComponent(call.id)}`} className="inline-flex shrink-0 items-center gap-1 font-semibold text-blue no-underline">
            <Download className="h-3.5 w-3.5" />
            CSV
          </a>
        ) : null}
      </div>
      {open ? <RegistrationsTable rows={registrations} /> : null}
    </li>
  );
}

export function CallsPanel({
  upcoming,
  past,
  registrations,
}: {
  upcoming: CommunityCall[];
  past: CommunityCall[];
  registrations: Record<string, CallRegistration[]>;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden aq-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-[14.5px] font-semibold text-ink">Upcoming</h2>
            <p className="mt-0.5 text-[12px] text-dim">The next scheduled call is the one the hub promotes.</p>
          </div>
          {!adding ? (
            <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
              Schedule a call
            </button>
          ) : null}
        </div>
        {adding ? <CallForm call={null} onDone={() => setAdding(false)} /> : null}
        {upcoming.length ? (
          <ul>
            {upcoming.map((call) => (
              <CallRow key={`${call.id}-${call.startsAt}-${call.status}`} call={call} registrations={registrations[call.id] ?? []} past={false} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing scheduled" body="No calls coming up. Schedule one so members can register." />
        )}
      </section>

      <section className="overflow-hidden aq-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-[14.5px] font-semibold text-ink">Past</h2>
          <p className="mt-0.5 text-[12px] text-dim">Add the recording link once it is ready; members find it on the hub.</p>
        </div>
        {past.length ? (
          <ul>
            {past.map((call) => (
              <CallRow key={`${call.id}-${call.startsAt}-${call.status}`} call={call} registrations={registrations[call.id] ?? []} past />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-dim">No past calls yet.</p>
        )}
      </section>
    </div>
  );
}
