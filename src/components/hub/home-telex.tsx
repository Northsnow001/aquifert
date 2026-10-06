import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { FeedThumb, FreshnessBadge, ProductChip } from "@/components/hub/kit";
import type { TelexView } from "@/lib/aq-modules/telex";
import type { TelexProduct } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";

const clock = (stamp: string) => stamp.slice(11, 16) || "--:--";

/** The hub's TELEX column: the newest few flashes, sized to sit beside the AQ View card. The full wire lives on the TELEX page. */
export function HomeTelex({ items, latest, now, filter }: { items: TelexView[]; latest?: string; now: string; filter: TelexProduct[] }) {
  return (
    <section aria-labelledby="home-telex-title" className="aq-card flex min-w-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow">
            <Zap className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-dim">Telex Feed</p>
            <h2 id="home-telex-title" className="text-[15.5px] font-bold leading-tight text-ink">
              Latest flashes
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessBadge stamp={latest} now={now} />
          <Link
            href="/hub/telex"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-navy-700 no-underline transition hover:border-navy-400 hover:bg-s2"
          >
            Open feed <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>
      <div className="flex-1 space-y-2.5 p-3.5">
        {items.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-mid">
            {filter.length ? "No recent flashes for your saved products." : "No flashes yet. The desk publishes through the trading day."}
          </p>
        ) : null}
        {items.map((item) => {
          const place = item.tags.find((tag) => tag.toLowerCase() !== item.product.toLowerCase());
          return (
            <Link
              key={item.id}
              href={`/hub/telex/${item.id}`}
              className="group flex items-start gap-3 rounded-xl border border-border bg-s2/40 p-2.5 no-underline transition hover:border-navy-400/50 hover:bg-s2"
            >
              <FeedThumb product={item.product} src={item.thumb} pick={item.pick} size={56} className="rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <ProductChip product={item.product} small />
                  {place ? <span className="rounded-md bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700">{place}</span> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink group-hover:underline">{item.headline}</p>
                <p className="mt-0.5 text-[11.5px] text-dim">
                  {formatDay(item.publishedAt)} · <span className="font-mono tabular-nums">{clock(item.publishedAt)}</span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {filter.length ? (
        <p className="border-t border-border px-4 py-2.5 text-[11.5px] text-dim">
          Showing your saved products: {filter.join(", ")}.{" "}
          <Link href="/hub/telex" className="font-semibold text-navy-600 no-underline hover:underline">
            Change in Telex Feed
          </Link>
        </p>
      ) : null}
    </section>
  );
}
