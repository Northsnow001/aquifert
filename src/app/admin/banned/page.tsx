import { Download } from "lucide-react";
import { BansPanel, type KnownMember } from "@/components/admin/banned/bans-panel";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import { isAdminUser } from "@/lib/admin-access";
import { listCalcLogs } from "@/lib/freight-desk/store";
import { listInbox } from "@/lib/inbox";
import { listAccessHistory, listBans } from "@/lib/member-access";
import { listNetbackLogs } from "@/lib/netback-desk/store";
import { listZeroRegistrations } from "@/lib/zero-interest";

export const dynamic = "force-dynamic";

/** Everyone who has left a trace on the hub, newest activity first, so a ban can be picked instead of typed. */
async function knownMembers(): Promise<KnownMember[]> {
  const seen = new Map<string, KnownMember & { counts: Map<string, number> }>();
  const note = (email: string | undefined, name: string | undefined, userId: string | null, at: string, activity: string) => {
    const key = email?.trim().toLowerCase();
    if (!key || isAdminUser({ email: key })) return;
    const entry = seen.get(key) ?? { email: key, name: "", userId: null, lastSeen: at, activity: "", counts: new Map() };
    if (name && !entry.name) entry.name = name;
    if (userId && !entry.userId) entry.userId = userId;
    if (at > entry.lastSeen) entry.lastSeen = at;
    entry.counts.set(activity, (entry.counts.get(activity) ?? 0) + 1);
    seen.set(key, entry);
  };
  const [freight, netback, zero, inbox] = await Promise.all([listCalcLogs(), listNetbackLogs(), listZeroRegistrations(), listInbox()]);
  for (const log of freight) note(log.user.email, log.user.name, log.user.id, log.at, "freight");
  for (const log of netback) note(log.user.email, log.user.name, log.user.id, log.at, "netback");
  for (const row of zero) note(row.email, row.name, row.userId, row.at, "zero");
  for (const item of inbox) note(item.payload.account || item.payload.email, item.payload.name, null, item.at, item.table === "order_enquiries" ? "enquiry" : "message");
  const words: Record<string, [string, string]> = {
    freight: ["freight calculation", "freight calculations"],
    netback: ["netback run", "netback runs"],
    zero: ["Zero registration", "Zero registrations"],
    enquiry: ["enquiry", "enquiries"],
    message: ["message", "messages"],
  };
  return [...seen.values()]
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .map(({ counts, ...member }) => ({
      ...member,
      activity: [...counts.entries()].map(([kind, count]) => `${count} ${words[kind][count === 1 ? 0 : 1]}`).join(", "),
    }));
}

export default async function BannedPage() {
  const [bans, history, members] = await Promise.all([listBans(), listAccessHistory(), knownMembers()]);
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = history.filter((event) => event.action === "banned" && event.at.startsWith(month)).length;
  const reinstated = history.filter((event) => event.action === "reinstated").length;

  const stats = [
    { label: "Banned now", value: bans.length.toLocaleString(), meta: bans.length ? `Latest: ${bans[0].email}` : "Everyone can sign in", tone: bans.length ? "text-[#b42318]" : "text-ink" },
    { label: "Bans this month", value: thisMonth.toLocaleString(), meta: "Including any later reinstated", tone: "text-ink" },
    { label: "Reinstated", value: reinstated.toLocaleString(), meta: "All time", tone: "text-ink" },
    { label: "Members seen", value: members.length.toLocaleString(), meta: "From calculators, enquiries and Zero", tone: "text-ink" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Banned users"
        description="Remove a member's access to Aquifert ONE and stop the address signing up again. Admin accounts are protected."
        actions={
          bans.length ? (
            <a href="/admin/banned/export" className={btnSecondary}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </a>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 truncate text-[12px] text-mid" title={stat.meta}>
              {stat.meta}
            </p>
          </div>
        ))}
      </div>

      <BansPanel bans={bans} history={history} members={members} />
    </div>
  );
}
