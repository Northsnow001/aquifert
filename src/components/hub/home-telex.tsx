import Link from "next/link";
import { FeedCardHeader, FeedGrid, FeedItem, tileSizes } from "@/components/hub/feed-card";
import { FeedViewFrame } from "@/components/hub/feed-view";
import { FeedThumb, FreshnessBadge, ProductChip, StoryImage } from "@/components/hub/kit";
import type { TelexView } from "@/lib/aq-modules/telex";
import type { TelexProduct } from "@/lib/aq-modules/types";
import { formatDay } from "@/lib/content-types";
import type { FeedView } from "@/lib/feed-view";

const clock = (stamp: string) => stamp.slice(11, 16) || "--:--";

/** The hub's TELEX column: the newest few flashes, sized to sit beside the AQ View card. The full wire lives on the TELEX page. */
export function HomeTelex({ items, latest, now, filter, view }: { items: TelexView[]; latest?: string; now: string; filter: TelexProduct[]; view: FeedView }) {
  const odd = items.length % 2 === 1;
  return (
    <FeedViewFrame feed="telex" initial={view} labelledBy="home-telex-title" className="aq-card flex min-w-0 flex-col overflow-hidden">
      <FeedCardHeader id="home-telex-title" title="Telex" subtitle="Latest flashes" href="/hub/telex" extra={<FreshnessBadge stamp={latest} now={now} />} />
      <FeedGrid>
        {items.length === 0 ? (
          <p className="col-span-full py-4 text-center text-[13px] text-mid">
            {filter.length ? "No recent flashes for your saved products." : "No flashes yet. The desk publishes through the trading day."}
          </p>
        ) : null}
        {items.map((item, index) => {
          const place = item.tags.find((tag) => tag.toLowerCase() !== item.product.toLowerCase());
          const lead = odd && index === 0;
          return (
            <FeedItem
              key={item.id}
              href={`/hub/telex/${item.id}`}
              lead={lead}
              thumb={<FeedThumb product={item.product} src={item.thumb} pick={item.pick} size={56} className="rounded-lg" />}
              image={<StoryImage product={item.product} src={item.thumb} pick={item.pick} sizes={tileSizes(lead)} />}
              chips={
                <>
                  <ProductChip product={item.product} small />
                  {place ? <span className="rounded-md bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700">{place}</span> : null}
                </>
              }
              title={item.headline}
              meta={
                <>
                  {formatDay(item.publishedAt)} · <span className="font-mono tabular-nums">{clock(item.publishedAt)}</span>
                </>
              }
            />
          );
        })}
      </FeedGrid>
      {filter.length ? (
        <p className="border-t border-border px-4 py-2.5 text-[11.5px] text-dim">
          Showing your saved products: {filter.join(", ")}.{" "}
          <Link href="/hub/telex" className="font-semibold text-navy-600 no-underline hover:underline">
            Change in Telex Feed
          </Link>
        </p>
      ) : null}
    </FeedViewFrame>
  );
}
