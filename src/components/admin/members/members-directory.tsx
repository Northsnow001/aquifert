"use client";

import { useMemo, useState } from "react";
import { Briefcase, Building2, Download, GraduationCap, Landmark, Mail, Search, ShieldBan, Trash2, Wifi } from "lucide-react";
import { btnSecondary, input } from "@/components/admin/ui";
import { planName } from "@/lib/aq-modules/types";
import { EMAIL_GROUP_LABEL, EMAIL_TYPE_LABEL, type EmailGroup, type EmailType } from "@/lib/desk-settings/email-rules";
import type { MemberRow } from "@/lib/members";

type Filter = "all" | EmailType;

const GROUPS: Record<EmailType, EmailGroup[]> = { work: ["company", "education", "government"], personal: ["webmail", "isp", "disposable"] };
const GROUP_ICON: Record<EmailGroup, typeof Mail> = { company: Building2, education: GraduationCap, government: Landmark, webmail: Mail, isp: Wifi, disposable: Trash2 };
const TYPE_TONE: Record<EmailType, { chip: string; bar: string; ring: string; icon: typeof Mail }> = {
  work: { chip: "border-[#c9dcf2] bg-[#eef5fd] text-[#1d4f8a]", bar: "bg-[#2f6fb3]", ring: "ring-[#2f6fb3]", icon: Briefcase },
  personal: { chip: "border-[#f2dcae] bg-[#fff8eb] text-[#8a5a00]", bar: "bg-[#d99a2b]", ring: "ring-[#d99a2b]", icon: Mail },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null) => {
  if (!iso) return "Never";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};
const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const PAGE = 100;

/** Members grouped by email type, with the companies and providers behind each group. */
export function MembersDirectory({ members }: { members: MemberRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [group, setGroup] = useState<EmailGroup | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => {
    const byType: Record<EmailType, number> = { work: 0, personal: 0 };
    const byGroup = Object.fromEntries(Object.keys(EMAIL_GROUP_LABEL).map((key) => [key, 0])) as Record<EmailGroup, number>;
    const month = new Date().toISOString().slice(0, 7);
    const fresh: Record<EmailType, number> = { work: 0, personal: 0 };
    for (const member of members) {
      byType[member.kind.type] += 1;
      byGroup[member.kind.group] += 1;
      if (member.createdAt.startsWith(month)) fresh[member.kind.type] += 1;
    }
    return { byType, byGroup, fresh };
  }, [members]);

  /** Work domains with their member count, and a lookup to spot personal-address members whose company already has colleagues here. */
  const companies = useMemo(() => {
    const domains = new Map<string, number>();
    for (const member of members) if (member.kind.type === "work") domains.set(member.kind.domain, (domains.get(member.kind.domain) ?? 0) + 1);
    const byName = new Map<string, string>();
    for (const domain of domains.keys()) {
      const name = squash(domain.split(".")[0]);
      if (name.length >= 3) byName.set(name, domain);
    }
    return { top: [...domains.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), byName };
  }, [members]);

  const providers = useMemo(() => {
    const tally = new Map<string, number>();
    for (const member of members) if (member.kind.type === "personal") tally.set(member.kind.source, (tally.get(member.kind.source) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [members]);

  const colleagueDomain = (member: MemberRow) => {
    if (member.kind.type !== "personal" || !member.company) return null;
    return companies.byName.get(squash(member.company)) ?? null;
  };

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (filter !== "all" && member.kind.type !== filter) return false;
      if (group && member.kind.group !== group) return false;
      if (!needle) return true;
      return [member.email, member.name, member.company, member.country, member.kind.source].some((value) => value.toLowerCase().includes(needle));
    });
  }, [members, filter, group, query]);

  const pick = (next: Filter, nextGroup: EmailGroup | null = null) => {
    setFilter(next);
    setGroup(nextGroup);
    setShown(PAGE);
  };

  const total = members.length;
  const exportType = filter === "all" ? "all" : filter;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {(["work", "personal"] as const).map((type) => {
          const tone = TYPE_TONE[type];
          const Icon = tone.icon;
          const active = filter === type;
          return (
            <div
              key={type}
              className={`rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition ${active ? `ring-2 ${tone.ring}` : ""}`}
            >
              <button type="button" onClick={() => pick(active ? "all" : type)} className="flex w-full items-start gap-3 text-left" aria-pressed={active}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone.chip}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-mid">{EMAIL_TYPE_LABEL[type]}</span>
                  <span className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-[26px] font-bold tracking-tight text-ink">{counts.byType[type].toLocaleString()}</span>
                    <span className="text-[13px] font-semibold text-mid">{share(counts.byType[type], total)}% of members</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-dim">{counts.fresh[type] ? `${counts.fresh[type]} joined this month` : "None joined this month"}</span>
                </span>
              </button>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-s2">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${share(counts.byType[type], total)}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GROUPS[type].map((key) => {
                  const GroupIcon = GROUP_ICON[key];
                  const on = group === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => (on ? pick(type) : pick(type, key))}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${on ? tone.chip : "border-border bg-white text-mid hover:text-ink"}`}
                    >
                      <GroupIcon className="h-3.5 w-3.5" />
                      {EMAIL_GROUP_LABEL[key]}
                      <span className="font-mono text-[11px] opacity-70">{counts.byGroup[key]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="grid grid-cols-3 rounded-lg border border-border bg-s2/60 p-0.5" role="tablist" aria-label="Email type">
              {(["all", "work", "personal"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => pick(key)}
                  className={`rounded-md px-3 py-1 text-[12.5px] font-semibold transition ${filter === key ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
                >
                  {key === "all" ? `All · ${total}` : key === "work" ? `Work · ${counts.byType.work}` : `Personal · ${counts.byType.personal}`}
                </button>
              ))}
            </div>
            <label className="relative min-w-[220px] flex-1">
              <span className="sr-only">Search members</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
              <input
                className={`${input} h-9 pl-8`}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShown(PAGE);
                }}
                placeholder="Name, email, company, country or provider"
              />
            </label>
            <a href={`/admin/members/export?type=${exportType}`} className={btnSecondary}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </a>
          </div>
          {group ? (
            <div className="flex items-center gap-2 border-b border-border bg-s2/40 px-4 py-2 text-[12.5px] text-mid">
              Showing {EMAIL_GROUP_LABEL[group].toLowerCase()} only.
              <button type="button" onClick={() => pick(filter)} className="font-semibold text-blue hover:underline">
                Clear
              </button>
            </div>
          ) : null}

          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead className="bg-s2/60 text-[11px] font-semibold uppercase tracking-wide text-dim">
                  <tr>
                    <th className="px-4 py-2.5">Member</th>
                    <th className="px-3 py-2.5">Email type</th>
                    <th className="px-3 py-2.5">Company</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Joined</th>
                    <th className="px-3 py-2.5">Last sign-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(0, shown).map((member) => {
                    const tone = TYPE_TONE[member.kind.type];
                    const GroupIcon = GROUP_ICON[member.kind.group];
                    const colleague = colleagueDomain(member);
                    return (
                      <tr key={member.id} className="align-top hover:bg-s2/30">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-ink">{member.name || member.email.split("@")[0]}</p>
                          <p className="text-[12px] text-mid">{member.email}</p>
                          <p className="mt-0.5 flex flex-wrap gap-1">
                            {member.banned ? (
                              <span className="inline-flex items-center gap-1 rounded bg-[#fdf1f1] px-1.5 py-px text-[10.5px] font-semibold text-[#b42318]">
                                <ShieldBan className="h-3 w-3" /> Banned
                              </span>
                            ) : null}
                            {!member.verified ? <span className="rounded bg-s2 px-1.5 py-px text-[10.5px] font-semibold text-dim">Not verified</span> : null}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold ${tone.chip}`}>
                            <GroupIcon className="h-3.5 w-3.5" />
                            {member.kind.type === "work" ? "Work" : "Personal"}
                          </span>
                          <p className="mt-1 text-[11.5px] text-dim">
                            {EMAIL_GROUP_LABEL[member.kind.group]}
                            {member.kind.group === "webmail" ? ` · ${member.kind.source}` : member.kind.type === "work" ? ` · ${member.kind.domain}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-ink">{member.company || <span className="text-dim">Not given</span>}</p>
                          {member.country ? <p className="text-[12px] text-mid">{member.country}</p> : null}
                          {colleague ? <p className="mt-0.5 text-[11.5px] text-[#1d4f8a]">Colleagues sign in with @{colleague}</p> : null}
                        </td>
                        <td className="px-3 py-2.5 text-ink">{planName(member.plan)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-mid">{day(member.createdAt)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-mid">{day(member.lastSignIn)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-[13px] text-mid">{total ? "No members match." : "No members yet."}</p>
          )}
          {rows.length > shown ? (
            <div className="border-t border-border px-4 py-3 text-center">
              <button type="button" onClick={() => setShown((current) => current + PAGE)} className="text-[13px] font-semibold text-blue hover:underline">
                Show more ({(rows.length - shown).toLocaleString()} left)
              </button>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <Ranked
            title="Companies"
            note="Work domains with the most members."
            empty="No work addresses yet."
            entries={companies.top}
            onPick={(domain) => {
              pick("work");
              setQuery(domain);
            }}
          />
          <Ranked
            title="Personal providers"
            note="Where personal addresses come from."
            empty="No personal addresses yet."
            entries={providers}
            onPick={(source) => {
              pick("personal");
              setQuery(source);
            }}
          />
        </aside>
      </div>
    </div>
  );
}

function Ranked({ title, note, empty, entries, onPick }: { title: string; note: string; empty: string; entries: [string, number][]; onPick: (value: string) => void }) {
  const [all, setAll] = useState(false);
  const list = all ? entries : entries.slice(0, 8);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="text-[12px] text-dim">{note}</p>
      {list.length ? (
        <ul className="mt-2.5 space-y-1">
          {list.map(([name, count]) => (
            <li key={name}>
              <button type="button" onClick={() => onPick(name)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[12.5px] hover:bg-s2">
                <span className="truncate text-ink">{name}</span>
                <span className="font-mono text-[11.5px] text-mid">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] text-dim">{empty}</p>
      )}
      {entries.length > 8 ? (
        <button type="button" onClick={() => setAll((value) => !value)} className="mt-2 text-[12px] font-semibold text-blue hover:underline">
          {all ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      ) : null}
    </section>
  );
}
