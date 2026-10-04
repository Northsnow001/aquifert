import Link from "next/link";
import { FlaskConical } from "lucide-react";

export function NitrogenUsage({ used, limit, resets }: { used: number; limit: number; resets: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const left = Math.max(0, limit - used);
  return (
    <section className="aq-card aq-rise flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5" aria-label="Nitrogen report allowance">
      <div className="flex items-center gap-3">
        <span className={`aq-chip ${limit > 0 && left === 0 ? "aq-chip-rose" : ""} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white`}>
          <FlaskConical className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-[15.5px] font-semibold text-ink">
            {limit > 0 ? `${used} of ${limit} reports this month` : `${used} report${used === 1 ? "" : "s"} this month`}
          </p>
          <p className="text-[13.5px] text-mid">
            {limit > 0 ? (left > 0 ? `${left} left · resets ${resets}` : `All used · resets ${resets}`) : "Unlimited on your plan"}
          </p>
        </div>
      </div>
      {limit > 0 ? (
        <div className="flex flex-1 items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-s3"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={Math.min(used, limit)}
            aria-label={`${used} of ${limit} nitrogen reports used`}
          >
            <div className={`h-full rounded-full transition-[width] duration-700 ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-[#d9951f]" : "bg-teal-500"}`} style={{ width: `${Math.max(3, pct)}%` }} />
          </div>
          <Link href="/hub/account/usage" className="shrink-0 text-[13.5px] font-semibold text-blue no-underline hover:underline">
            All allowances
          </Link>
        </div>
      ) : (
        <Link href="/hub/account/usage" className="text-[13.5px] font-semibold text-blue no-underline hover:underline sm:ml-auto">
          All allowances
        </Link>
      )}
    </section>
  );
}
