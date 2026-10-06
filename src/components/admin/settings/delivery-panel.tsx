"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, PlugZap, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { emptyOutbox, saveDelivery } from "@/app/admin/settings/actions";
import { Panel, SaveBar, useEditorGuards } from "@/components/admin/aquibot/shared";
import { EmptyState, btnDanger, input, label } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { DeliverySettings } from "@/lib/desk-settings/types";

export type OutboxRow = { id: string; at: string; kind: string; to: string; subject: string; status: "sent" | "failed" | "held"; error?: string };

const KIND: Record<string, string> = {
  "order-applicant": "Order Desk · member",
  "order-admin": "Order Desk · desk",
  "zero-applicant": "Zero · member",
  "zero-admin": "Zero · desk",
  "analytics-applicant": "AQ Analytics waitlist · member",
  "contact-applicant": "Contact · member",
  test: "Test",
};

const STATUS: Record<OutboxRow["status"], { text: string; tone: string }> = {
  sent: { text: "Sent", tone: "bg-[#e7f6ec] text-[#1f7a45]" },
  failed: { text: "Failed", tone: "bg-[#fdecec] text-[#b42318]" },
  held: { text: "Held", tone: "bg-[#fff4de] text-[#9a5b00]" },
};

export function DeliveryPanel({
  initial,
  savedAt: initialSavedAt,
  status,
  outbox,
}: {
  initial: DeliverySettings;
  savedAt: string | null;
  status: { connected: boolean; provider: string | null; from: string | null };
  outbox: OutboxRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [selected, setSelected] = useState<string | null>(outbox[0]?.id ?? null);
  const [filter, setFilter] = useState<"all" | OutboxRow["status"]>("all");
  const [saving, start] = useTransition();
  const [clearing, startClear] = useTransition();
  const dirty = JSON.stringify(draft) !== baseline;
  const shown = filter === "all" ? outbox : outbox.filter((row) => row.status === filter);
  const active = outbox.find((row) => row.id === selected) ?? null;
  const counts = { sent: 0, failed: 0, held: 0 };
  for (const row of outbox) counts[row.status] += 1;

  const save = () =>
    start(async () => {
      const result = await saveDelivery(draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setBaseline(JSON.stringify(draft));
      setSavedAt(result.savedAt);
      toast.success("Sender details saved.");
      router.refresh();
    });
  useEditorGuards(dirty, save);

  const clear = () => {
    if (!window.confirm(`Remove all ${outbox.length} emails from the outbox log? Emails already sent are not affected.`)) return;
    startClear(async () => {
      await emptyOutbox();
      setSelected(null);
      toast.success("Outbox cleared.");
      router.refresh();
    });
  };

  const sender = draft.fromName.trim() ? `${draft.fromName.trim()} <${status.from ?? "address set on the server"}>` : (status.from ?? "address set on the server");

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className={`rounded-2xl border p-5 ${status.connected ? "border-[#cdebd8] bg-[#f1faf4]" : "border-[#f5dfb3] bg-[#fff8ea]"}`}>
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${status.connected ? "bg-[#1f7a45] text-white" : "bg-[#d97706] text-white"}`}>
              <PlugZap className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 text-[13px]">
              <h3 className="text-[15px] font-bold text-ink">{status.connected ? `Connected to ${status.provider}` : "Delivery not connected yet"}</h3>
              {status.connected ? (
                <p className="mt-1 text-mid">
                  Emails go out from <span className="font-mono text-ink">{status.from}</span>. Every one is also logged below.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-mid">Submissions are saved and every email is written to the outbox below, ready to read. Nothing leaves the server until a provider is connected.</p>
                  <p className="mt-2.5 text-mid">
                    To connect, set <code className="rounded bg-white px-1 font-mono text-[12px] text-ink">EMAIL_FROM</code> (for example no-reply@aquifert.com) and either{" "}
                    <code className="rounded bg-white px-1 font-mono text-[12px] text-ink">SMTP_HOST</code>,{" "}
                    <code className="rounded bg-white px-1 font-mono text-[12px] text-ink">SMTP_PORT</code>,{" "}
                    <code className="rounded bg-white px-1 font-mono text-[12px] text-ink">SMTP_USER</code> and{" "}
                    <code className="rounded bg-white px-1 font-mono text-[12px] text-ink">SMTP_PASS</code>, or{" "}
                    <code className="rounded bg-white px-1 font-mono text-[12px] text-ink">RESEND_API_KEY</code>, in the hosting environment, then redeploy.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <Panel icon={<Send className="h-4 w-4" />} title="Sender" description="How emails appear in the recipient's inbox.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="delivery-from" className={label}>
                From name
              </label>
              <input id="delivery-from" className={`${input} mt-1.5`} value={draft.fromName} onChange={(event) => setDraft((current) => ({ ...current, fromName: event.target.value }))} placeholder="Aquifert" />
            </div>
            <div>
              <label htmlFor="delivery-reply" className={label}>
                Replies go to
              </label>
              <input id="delivery-reply" type="email" className={`${input} mt-1.5`} value={draft.replyTo} onChange={(event) => setDraft((current) => ({ ...current, replyTo: event.target.value }))} placeholder="noreply@aquifert.com" />
            </div>
          </div>
          <p className="mt-3 truncate rounded-lg bg-s2 px-3 py-2 font-mono text-[12px] text-mid">From: {sender}</p>
        </Panel>
      </div>

      <section className="overflow-hidden aq-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-blue" />
            <h3 className="text-[14px] font-bold text-ink">Outbox</h3>
            <span className="font-mono text-[11px] text-dim">last {outbox.length} of up to 200</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-s2 p-0.5" role="tablist" aria-label="Filter by status">
              {(["all", "sent", "held", "failed"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition ${filter === key ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
                >
                  {key} {key === "all" ? outbox.length : counts[key]}
                </button>
              ))}
            </div>
            {outbox.length ? (
              <button type="button" className={btnDanger} onClick={clear} disabled={clearing}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>
        </div>
        {outbox.length ? (
          <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <ul className="max-h-[640px] divide-y divide-border overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
              {shown.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row.id)}
                    className={`block w-full px-4 py-3 text-left transition ${selected === row.id ? "bg-blue-light/60" : "hover:bg-s2/60"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-dim">{KIND[row.kind] ?? row.kind}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUS[row.status].tone}`}>{STATUS[row.status].text}</span>
                    </span>
                    <span className="mt-1 block truncate text-[13px] font-semibold text-ink">{row.subject}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-mid">
                      <span className="truncate">{row.to}</span>
                      <span className="shrink-0 font-mono">{formatStamp(row.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!shown.length ? <li className="px-4 py-8 text-center text-[12.5px] text-dim">No {filter} emails.</li> : null}
            </ul>
            <div className="min-w-0">
              {active ? (
                <>
                  <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border px-4 py-3 text-[12.5px]">
                    <dt className="text-dim">To</dt>
                    <dd className="truncate text-ink">{active.to}</dd>
                    <dt className="text-dim">Subject</dt>
                    <dd className="font-semibold text-ink">{active.subject}</dd>
                    {active.error ? (
                      <>
                        <dt className="text-dim">Error</dt>
                        <dd className="text-[#b42318]">{active.error}</dd>
                      </>
                    ) : null}
                  </dl>
                  <iframe key={active.id} title="Email preview" src={`/admin/settings/outbox/${encodeURIComponent(active.id)}`} sandbox="" className="h-[560px] w-full bg-[#f4f4f5]" />
                </>
              ) : (
                <p className="px-4 py-16 text-center text-[12.5px] text-dim">Pick an email to read it.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="No emails yet" body="Order Desk and Aquifert Zero emails, and any tests you send, appear here." />
          </div>
        )}
      </section>
    </div>
  );
}
