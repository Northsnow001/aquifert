import Link from "next/link";
import { ReadFilters, ReadRateBar, StatTiles, parsePeriod, readRate, sinceFor, stampUtc } from "@/components/admin/telex-reads";
import { Card, CardHeader, EmptyState, PageHeader, Pill } from "@/components/admin/ui";
import { PLAN_LABEL } from "@/lib/aq-modules/types";
import { formatStamp, telexHeadline } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { READ_SECONDS, formatDuration, membersOf, statsByTelex } from "@/lib/telex-reads/stats";
import { listVisits } from "@/lib/telex-reads/store";

export const dynamic = "force-dynamic";

const TOP_MEMBERS = 25;

export default async function TelexReadReportPage({ searchParams }: { searchParams: Promise<{ p?: string; team?: string }> }) {
  const query = await searchParams;
  const period = parsePeriod(query.p);
  const team = query.team === "1";
  const [content, all] = await Promise.all([getHubContent(), listVisits({ since: sinceFor(period) })]);
  const visits = team ? all : all.filter((visit) => !visit.admin);

  const byTelex = statsByTelex(visits);
  const flashes = [...byTelex]
    .map(([id, stats]) => {
      const item = content.telex.find((entry) => entry.id === id);
      return { id, stats, item, headline: item ? telexHeadline(item) : (visits.find((visit) => visit.telexId === id)?.headline ?? "Deleted flash") };
    })
    .sort((a, b) => b.stats.read - a.stats.read || b.stats.opened - a.stats.opened);
  const members = membersOf(visits);

  const reads = flashes.reduce((sum, row) => sum + row.stats.read, 0);
  const opens = flashes.reduce((sum, row) => sum + row.stats.opened, 0);
  const readSeconds = flashes.reduce((sum, row) => sum + row.stats.avgSeconds * row.stats.read, 0);
  const readers = members.filter((member) => member.read > 0).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Telex read report"
        description={`Which flashes members read and how long they stay. A visit counts as read after ${READ_SECONDS} seconds on the full story.`}
        crumbs={[{ href: "/admin/telex", label: "Telex" }]}
      />

      <div className="mb-4">
        <ReadFilters base="/admin/telex/reads" period={period} team={team} />
      </div>

      <StatTiles
        items={[
          { label: "Reads", value: String(reads), hint: "One per member per flash" },
          { label: "Members reading", value: String(readers), hint: `${members.length} opened at least one flash` },
          { label: "Read rate", value: `${readRate({ opened: opens, read: reads })}%`, hint: "Of flashes opened, share read" },
          { label: "Avg time per read", value: formatDuration(reads ? readSeconds / reads : 0), hint: "Active time on the full story" },
        ]}
      />

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="Flashes" meta="Most read first. Open a flash to see each member." />
        {flashes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                  <th className="px-5 py-2.5 font-medium">Flash</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Read</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Opened</th>
                  <th className="py-2.5 pr-4 font-medium">Read rate</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Avg time</th>
                  <th className="py-2.5 pr-5 text-right font-medium">Avg scrolled</th>
                </tr>
              </thead>
              <tbody>
                {flashes.map(({ id, stats, item, headline }) => (
                  <tr key={id} className="border-b border-border last:border-b-0 hover:bg-s2/40">
                    <td className="max-w-[420px] px-5 py-3">
                      <Link href={`/admin/telex/${id}/reads${team ? "?team=1" : ""}`} className="line-clamp-2 text-[13px] font-semibold leading-snug text-blue no-underline hover:underline">
                        {headline}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-dim">{item ? formatStamp(item.publishedAt) : "No longer in the feed"}</p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">{stats.read}</td>
                    <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-mid">{stats.opened}</td>
                    <td className="py-3 pr-4">
                      <ReadRateBar stats={stats} />
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-ink">{stats.read ? formatDuration(stats.avgSeconds) : "–"}</td>
                    <td className="py-3 pr-5 text-right font-mono text-[12.5px] tabular-nums text-ink">{stats.avgDepth}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No reads in this period" body="Reads appear here as members open flashes from the Telex Feed and stay on the full story." />
        )}
      </Card>

      {members.length ? (
        <Card className="mt-5 overflow-hidden">
          <CardHeader title="Most engaged members" meta={members.length > TOP_MEMBERS ? `Top ${TOP_MEMBERS} of ${members.length}` : `${members.length} ${members.length === 1 ? "member" : "members"}`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                  <th className="px-5 py-2.5 font-medium">Member</th>
                  <th className="py-2.5 pr-4 font-medium">Plan</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Flashes read</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Opened</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Total time</th>
                  <th className="py-2.5 pr-5 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(0, TOP_MEMBERS).map((member) => (
                  <tr key={member.userId} className="border-b border-border last:border-b-0 hover:bg-s2/40">
                    <td className="px-5 py-3">
                      <p className="text-[13.5px] font-semibold text-ink">
                        {member.name || member.email} {member.admin ? <Pill tone="amber">Desk</Pill> : null}
                      </p>
                      <p className="text-[12px] text-mid">{member.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-[12.5px] text-mid">{PLAN_LABEL[member.plan] ?? member.plan}</td>
                    <td className="py-3 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">{member.read}</td>
                    <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-mid">{member.opened}</td>
                    <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-ink">{formatDuration(member.seconds)}</td>
                    <td className="py-3 pr-5 font-mono text-[11.5px] text-dim">{stampUtc(member.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
