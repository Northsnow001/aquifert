import Link from "next/link";
import { PLAN_LABEL } from "@/lib/aq-modules/types";
import { formatStamp } from "@/lib/content-types";
import { formatDuration, READ_SECONDS, type TelexReader, type TelexReadStats } from "@/lib/telex-reads/stats";
import { Pill } from "@/components/admin/ui";

export const PERIODS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
] as const;

export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | undefined, fallback: Period["key"] = "30"): Period {
  return PERIODS.find((period) => period.key === raw) ?? PERIODS.find((period) => period.key === fallback)!;
}

export const sinceFor = (period: Period) => (period.days ? new Date(Date.now() - period.days * 86_400_000).toISOString() : undefined);

export const readRate = (stats: Pick<TelexReadStats, "opened" | "read">) => (stats.opened ? Math.round((stats.read / stats.opened) * 100) : 0);

export const stampUtc = (iso: string) => `${formatStamp(iso)} UTC`;

export function StatTiles({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="aq-card px-4 py-3.5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-dim">{item.label}</p>
          <p className="mt-1 text-[24px] font-semibold tabular-nums leading-tight text-ink">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-[12px] text-mid">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** Period chips and the desk-team switch; every other query value is kept. */
export function ReadFilters({ base, period, team, fallback = "30" }: { base: string; period: Period; team: boolean; fallback?: Period["key"] }) {
  const href = (patch: { p?: string; team?: boolean }) => {
    const params = new URLSearchParams();
    const p = patch.p ?? period.key;
    if (p !== fallback) params.set("p", p);
    if (patch.team ?? team) params.set("team", "1");
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Period">
        {PERIODS.map((item) => (
          <Link
            key={item.key}
            href={href({ p: item.key })}
            aria-current={item.key === period.key ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold no-underline transition ${
              item.key === period.key ? "border-navy-700 bg-navy-700 text-white" : "border-border bg-white text-mid hover:border-blue/40 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <Link href={href({ team: !team })} className="text-[12.5px] font-semibold text-blue no-underline hover:underline">
        {team ? "Hide desk team visits" : "Include desk team visits"}
      </Link>
    </div>
  );
}

export function ReadRateBar({ stats }: { stats: Pick<TelexReadStats, "opened" | "read"> }) {
  const rate = readRate(stats);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-s2" aria-hidden>
        <div className="h-full rounded-full bg-teal-700" style={{ width: `${rate}%` }} />
      </div>
      <span className="font-mono text-[12px] tabular-nums text-mid">{rate}%</span>
    </div>
  );
}

export function ReaderTable({ readers }: { readers: TelexReader[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
            <th className="px-5 py-2.5 font-medium">Member</th>
            <th className="py-2.5 pr-4 font-medium">Plan</th>
            <th className="py-2.5 pr-4 font-medium">Status</th>
            <th className="py-2.5 pr-4 text-right font-medium">Time on page</th>
            <th className="py-2.5 pr-4 text-right font-medium">Scrolled</th>
            <th className="py-2.5 pr-4 text-right font-medium">Visits</th>
            <th className="py-2.5 pr-5 font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {readers.map((reader) => (
            <tr key={reader.userId} className="border-b border-border last:border-b-0 hover:bg-s2/40">
              <td className="px-5 py-3">
                <p className="text-[13.5px] font-semibold text-ink">
                  {reader.name || reader.email} {reader.admin ? <Pill tone="amber">Desk</Pill> : null}
                </p>
                <p className="text-[12px] text-mid">{reader.email}</p>
              </td>
              <td className="py-3 pr-4 text-[12.5px] text-mid">{PLAN_LABEL[reader.plan] ?? reader.plan}</td>
              <td className="py-3 pr-4">
                {reader.readAt ? (
                  <Pill tone="teal">Read</Pill>
                ) : (
                  <span title={`Left before ${READ_SECONDS} seconds of reading`}>
                    <Pill>Opened</Pill>
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-ink">{formatDuration(reader.seconds)}</td>
              <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-ink">{reader.depth}%</td>
              <td className="py-3 pr-4 text-right font-mono text-[12.5px] tabular-nums text-mid">{reader.visits}</td>
              <td className="py-3 pr-5 font-mono text-[11.5px] text-dim">{stampUtc(reader.lastAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
