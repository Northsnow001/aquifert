import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { MissingTableNotice } from "@/components/admin/aq-data/table-notice";
import { Card, EmptyState, PageHeader, btnSecondary } from "@/components/admin/ui";
import { listAllNitrogenReports } from "@/lib/aq-modules/members";
import { formatStamp } from "@/lib/content-types";

export const dynamic = "force-dynamic";

const LIMIT = 500;

export default async function NitrogenReportsAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await listAllNitrogenReports(LIMIT);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? rows.filter((row) => [row.refNo, row.email, row.answers?.cropType, row.answers?.destinationCountry].some((value) => (value ?? "").toLowerCase().includes(needle)))
    : rows;
  const members = new Set(rows.map((row) => row.email)).size;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Nitrogen reports"
        description={`Every nitrogen report members have generated, newest first. ${rows.length.toLocaleString()} ${rows.length === 1 ? "report" : "reports"} from ${members.toLocaleString()} ${members === 1 ? "member" : "members"}${rows.length >= LIMIT ? ` (latest ${LIMIT} shown)` : ""}.`}
      />

      <MissingTableNotice table="nitrogen_reports" what="reports" />

      <Card className="overflow-hidden">
        <form className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3" action="/admin/nitrogen-reports">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search ref, email, crop, country"
              aria-label="Search reports"
              className="h-9 w-72 rounded-lg border border-border bg-white pl-8 pr-3 text-[13px] text-ink"
            />
          </label>
          <div className="flex items-center gap-2">
            {needle ? (
              <Link href="/admin/nitrogen-reports" className="text-[12.5px] font-semibold text-blue no-underline">
                Clear
              </Link>
            ) : null}
            <button type="submit" className={btnSecondary}>
              Search
            </button>
          </div>
        </form>
        {!rows.length ? (
          <EmptyState title="No reports yet" body="When members generate a report in the Nitrogen Report tool, it appears here." />
        ) : shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-s2/50 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                <tr>
                  <th className="px-5 py-2 font-semibold">Ref</th>
                  <th className="px-3 py-2 font-semibold">Member</th>
                  <th className="px-3 py-2 font-semibold">Crop</th>
                  <th className="px-3 py-2 font-semibold">Country</th>
                  <th className="px-3 py-2 font-semibold">Generated (UTC)</th>
                  <th className="w-10 px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className="border-t border-border transition hover:bg-s2/40">
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/nitrogen-reports/${encodeURIComponent(row.id)}`} className="font-mono text-[12.5px] font-semibold text-blue no-underline">
                        {row.refNo}
                      </Link>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2.5 text-ink">{row.email}</td>
                    <td className="px-3 py-2.5 text-ink">{row.answers?.cropType || <span className="text-dim">Not given</span>}</td>
                    <td className="px-3 py-2.5 text-ink">{row.answers?.destinationCountry || <span className="text-dim">Not given</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-dim">{formatStamp(row.at)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/admin/nitrogen-reports/${encodeURIComponent(row.id)}`} aria-label={`Open ${row.refNo}`} className="text-dim hover:text-blue">
                        <ChevronRight className="inline h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-[13px] text-dim">No reports match “{q}”.</p>
        )}
      </Card>
    </div>
  );
}
