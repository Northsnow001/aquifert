import Link from "next/link";
import { ExternalLink, PenLine } from "lucide-react";
import { ReadFilters, ReaderTable, StatTiles, parsePeriod, readRate, sinceFor, stampUtc } from "@/components/admin/telex-reads";
import { Card, CardHeader, EmptyState, PageHeader, StatusBadge, btnSecondary } from "@/components/admin/ui";
import { formatStamp, telexHeadline } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { READ_SECONDS, formatDuration, readersOf, statsFor } from "@/lib/telex-reads/stats";
import { listVisits } from "@/lib/telex-reads/store";

export const dynamic = "force-dynamic";

export default async function TelexReadsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; team?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const period = parsePeriod(query.p, "all");
  const team = query.team === "1";
  const [content, all] = await Promise.all([getHubContent(), listVisits({ since: sinceFor(period) })]);
  const item = content.telex.find((entry) => entry.id === id);
  const visits = all.filter((visit) => visit.telexId === id && (team || !visit.admin));
  const headline = item ? telexHeadline(item) : (visits[0]?.headline ?? "Deleted flash");
  const stats = statsFor(visits);
  const readers = readersOf(visits);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Who read this flash"
        description={headline}
        crumbs={[
          { href: "/admin/telex", label: "Telex" },
          { href: "/admin/telex/reads", label: "Read report" },
        ]}
        actions={
          item ? (
            <>
              <Link href={`/admin/telex/${id}`} className={btnSecondary}>
                <PenLine className="h-4 w-4" /> Edit
              </Link>
              <Link href={`/hub/telex/${id}`} className={btnSecondary} target="_blank">
                <ExternalLink className="h-4 w-4" /> View on hub
              </Link>
            </>
          ) : null
        }
      />

      {item ? (
        <p className="-mt-3 mb-5 flex flex-wrap items-center gap-2 text-[12.5px] text-mid">
          <StatusBadge status={item.status} /> Published {formatStamp(item.publishedAt)}
        </p>
      ) : null}

      <div className="mb-4">
        <ReadFilters base={`/admin/telex/${id}/reads`} period={period} team={team} fallback="all" />
      </div>

      <StatTiles
        items={[
          { label: "Read", value: String(stats.read), hint: `Stayed ${READ_SECONDS}s or more` },
          { label: "Opened", value: String(stats.opened), hint: `${readRate(stats)}% went on to read it` },
          { label: "Avg time reading", value: formatDuration(stats.avgSeconds), hint: stats.read ? `Median ${formatDuration(stats.medianSeconds)}` : "No reads yet" },
          { label: "Avg scrolled", value: `${stats.avgDepth}%`, hint: `${stats.visits} ${stats.visits === 1 ? "visit" : "visits"} in total` },
        ]}
      />

      <Card className="mt-5 overflow-hidden">
        <CardHeader
          title="Members"
          meta={stats.lastAt ? `Most recent first. Last visit ${stampUtc(stats.lastAt)}.` : "Most recent first."}
        />
        {readers.length ? (
          <ReaderTable readers={readers} />
        ) : (
          <EmptyState
            title="Nobody has opened this flash yet"
            body={`Members who press Read more and stay ${READ_SECONDS} seconds show here as Read; shorter visits show as Opened.`}
          />
        )}
      </Card>
      <p className="mt-3 text-[12px] leading-relaxed text-dim">
        Time on page counts only while the tab is in view and the member is active; it pauses after a minute without scrolling, typing or moving the pointer. Scrolled is how far down the story they got.
      </p>
    </div>
  );
}
