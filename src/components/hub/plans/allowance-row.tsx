import Link from "next/link";
import { ArrowRight, Infinity as InfinityIcon, type LucideIcon } from "lucide-react";
import { Tag } from "@/components/hub/kit";

export function AllowanceRow({
  label,
  icon: Icon,
  used,
  limit,
  resets,
  href,
  kept = false,
  tone = "",
}: {
  label: string;
  icon: LucideIcon;
  used: number;
  /** 0 means unlimited. */
  limit: number;
  resets: string;
  href: string;
  /** A retention cap rather than a monthly allowance. */
  kept?: boolean;
  tone?: "" | "blue" | "amber" | "rose";
}) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const left = Math.max(0, limit - used);
  const full = limit > 0 && used >= limit;
  const low = limit > 0 && !full && pct >= 80;

  let note: React.ReactNode;
  if (limit === 0) note = kept ? "Every report is kept on your plan." : `${used.toLocaleString("en-GB")} used this month. No cap on your plan.`;
  else if (full && kept) note = <span className="text-[#9a5b00]">Full. Each new report replaces your oldest one.</span>;
  else if (full)
    note = (
      <span className="text-danger">
        All used. Resets {resets}.{" "}
        <Link href="/hub/account/membership" className="font-semibold text-blue no-underline hover:underline">
          Upgrade for more
        </Link>
      </span>
    );
  else if (low) note = <span className="font-medium text-[#9a5b00]">Running low: {left} left{kept ? " before the oldest makes way" : `, resets ${resets}`}.</span>;
  else note = kept ? `${left} more before the oldest makes way.` : `${left} left · resets ${resets}`;

  return (
    <li className="px-5 py-4">
      <div className="flex items-center gap-3">
        <span className={`aq-chip ${tone ? `aq-chip-${tone}` : ""} flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white`}>
          <Icon className="h-4 w-4" />
        </span>
        <Link href={href} className="min-w-0 flex-1 text-[15.5px] font-semibold text-ink no-underline hover:text-blue">
          {label}
        </Link>
        {limit === 0 ? (
          <Tag tone="teal">
            <InfinityIcon className="h-3 w-3" strokeWidth={2.6} aria-hidden /> Unlimited
          </Tag>
        ) : (
          <span className="shrink-0 text-[15.5px] font-semibold tabular-nums text-ink">
            {used.toLocaleString("en-GB")}
            <span className="font-normal text-dim"> / {limit.toLocaleString("en-GB")}</span>
          </span>
        )}
      </div>
      <div className="mt-2.5 pl-11">
        {limit === 0 ? (
          <div className="h-1.5 rounded-full bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200" aria-hidden />
        ) : (
          <div className="h-1.5 overflow-hidden rounded-full bg-s3" role="progressbar" aria-label={`${label}: ${used} of ${limit} used`} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
            <div className={`h-full rounded-full transition-[width] duration-700 ${full ? "bg-danger" : low ? "bg-[#d9951f]" : "bg-teal-500"}`} style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} />
          </div>
        )}
        <p className="mt-1.5 text-[13.5px] leading-snug text-mid" role={full || low ? "status" : undefined}>
          {note}
        </p>
      </div>
    </li>
  );
}

export function IncludedRow({ label, detail, href, icon: Icon }: { label: string; detail: string; href: string; icon: LucideIcon }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3.5 no-underline transition hover:bg-s2/70">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-teal-50 text-teal-700 ring-1 ring-teal-100">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-semibold text-ink group-hover:text-blue">{label}</span>
          <span className="block text-[13.5px] text-mid">{detail}</span>
        </span>
        <Tag tone="teal">Unlimited</Tag>
        <ArrowRight className="h-4 w-4 shrink-0 text-dim transition group-hover:translate-x-0.5 group-hover:text-blue" aria-hidden />
      </Link>
    </li>
  );
}
