"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, History, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { banMemberAction, reinstateMemberAction } from "@/app/admin/banned/actions";
import { EmptyState, btnDanger, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import type { AccessEvent, BanRecord } from "@/lib/member-access";

export type KnownMember = { email: string; name: string; userId: string | null; lastSeen: string; activity: string };

const EFFECTS = [
  "Signed out of the hub on their next page load, with a suspended notice and a sign-out button.",
  "Every tool, calculator, download and form refuses the account.",
  "The address cannot register again. They see the generic throwaway-address message, so the ban is not revealed.",
  "Reinstating restores access straight away. Their history and settings are kept.",
];

function BanForm({ members }: { members: KnownMember[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const match = members.find((member) => member.email === email.trim().toLowerCase()) ?? null;

  const submit = () => {
    const target = email.trim().toLowerCase();
    if (!window.confirm(`Ban ${target}? They lose access to Aquifert ONE immediately.`)) return;
    start(async () => {
      const result = await banMemberAction({ email: target, name: name || match?.name || "", userId: match?.userId ?? null, reason });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${target} is banned.`);
      setEmail("");
      setName("");
      setReason("");
      router.refresh();
    });
  };

  return (
    <section className="aq-card">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdecec] text-[#b42318]">
          <Ban className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-[14px] font-bold text-ink">Ban a member</h2>
          <p className="text-[12px] text-dim">Start typing to pick from members who have used the hub.</p>
        </div>
      </div>
      <form
        className="space-y-3.5 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div>
          <label htmlFor="ban-email" className={label}>
            Email
          </label>
          <input id="ban-email" type="email" list="known-members" required className={`${input} mt-1.5`} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="off" />
          <datalist id="known-members">
            {members.map((member) => (
              <option key={member.email} value={member.email}>
                {member.name}
              </option>
            ))}
          </datalist>
          {match ? (
            <p className="mt-1.5 text-[12px] text-mid">
              {match.name || "Member"} · last seen {formatStamp(match.lastSeen)} · {match.activity}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="ban-name" className={label}>
            Name <span className="font-normal normal-case tracking-normal text-dim">(optional)</span>
          </label>
          <input id="ban-name" className={`${input} mt-1.5`} value={name} onChange={(event) => setName(event.target.value)} placeholder={match?.name || "For your records"} />
        </div>
        <div>
          <label htmlFor="ban-reason" className={label}>
            Reason
          </label>
          <textarea id="ban-reason" rows={3} required className={`${textarea} mt-1.5`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Shared login with a non-member, scraped the library…" />
          <p className="mt-1 text-[11.5px] text-dim">Only admins see this.</p>
        </div>
        <button type="submit" className={`${btnDanger} w-full justify-center`} disabled={pending || !email.trim() || reason.trim().length < 3}>
          <Ban className="h-4 w-4" />
          {pending ? "Banning…" : "Ban member"}
        </button>
      </form>
      <div className="border-t border-border px-5 py-4">
        <p className={label}>What a ban does</p>
        <ul className="mt-2 space-y-1.5 text-[12.5px] text-mid">
          {EFFECTS.map((effect) => (
            <li key={effect} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-dim" />
              {effect}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BanRow({ ban }: { ban: BanRecord }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const reinstate = () => {
    const note = window.prompt(`Reinstate ${ban.email}? Add an optional note for the history.`, "");
    if (note === null) return;
    start(async () => {
      const result = await reinstateMemberAction(ban.email, note);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${ban.email} can sign in again.`);
      router.refresh();
    });
  };

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{ban.email}</p>
        <p className="text-[12px] text-mid">
          {ban.name ? `${ban.name} · ` : ""}banned {formatStamp(ban.bannedAt)} by {ban.bannedBy}
        </p>
        <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-s2 px-3 py-2 text-[12.5px] text-ink">{ban.reason}</p>
      </div>
      <button type="button" className={btnSecondary} onClick={reinstate} disabled={pending}>
        <RotateCcw className="h-3.5 w-3.5" />
        {pending ? "Reinstating…" : "Reinstate"}
      </button>
    </li>
  );
}

export function BansPanel({ bans, history, members }: { bans: BanRecord[]; history: AccessEvent[]; members: KnownMember[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? bans.filter((ban) => [ban.email, ban.name, ban.reason, ban.bannedBy].some((value) => value.toLowerCase().includes(needle))) : bans;
  const banned = new Set(bans.map((ban) => ban.email));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <BanForm members={members.filter((member) => !banned.has(member.email))} />

      <div className="space-y-5">
        <section className="overflow-hidden aq-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 className="text-[14px] font-bold text-ink">
              Banned now <span className="ml-1 font-mono text-[12px] font-normal text-dim">{bans.length}</span>
            </h2>
            {bans.length > 3 ? (
              <label className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email, name, reason" aria-label="Search bans" className="h-9 w-60 rounded-lg border border-border bg-white pl-8 pr-3 text-[13px] text-ink" />
              </label>
            ) : null}
          </div>
          {bans.length ? (
            shown.length ? (
              <ul>
                {shown.map((ban) => (
                  <BanRow key={ban.email} ban={ban} />
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-[13px] text-dim">No bans match.</p>
            )
          ) : (
            <div className="flex items-center gap-3 px-5 py-8">
              <ShieldCheck className="h-5 w-5 text-[#1f7a45]" />
              <p className="text-[13px] text-mid">Nobody is banned. Every member with an account can sign in.</p>
            </div>
          )}
        </section>

        <section className="overflow-hidden aq-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <History className="h-4 w-4 text-blue" />
              History
            </h2>
            {history.length ? (
              <a href="/admin/banned/export?kind=history" className="text-[12.5px] font-semibold text-blue no-underline">
                Download CSV
              </a>
            ) : null}
          </div>
          {history.length ? (
            <ol className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {history.map((event) => (
                <li key={`${event.at}-${event.email}-${event.action}`} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-5 py-3 text-[12.5px]">
                  <span className="font-mono text-[11.5px] text-dim">{formatStamp(event.at)}</span>
                  <span className="min-w-0">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${event.action === "banned" ? "bg-[#fdecec] text-[#b42318]" : "bg-[#e7f6ec] text-[#1f7a45]"}`}>
                      {event.action === "banned" ? "Banned" : "Reinstated"}
                    </span>
                    <span className="font-semibold text-ink">{event.email}</span>
                    <span className="text-mid"> by {event.by}</span>
                    {event.reason ? <span className="mt-0.5 block text-mid">{event.reason}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-5">
              <EmptyState title="No changes yet" body="Every ban and reinstatement is recorded here with who made it." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
