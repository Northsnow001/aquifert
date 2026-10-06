import Link from "next/link";
import { ProductChip, StoryImage } from "@/components/hub/kit";
import type { TelexView } from "@/lib/aq-modules/telex";

const clock = (stamp: string) => stamp.slice(11, 16) || "--:--";
const href = (item: TelexView) => `/hub/telex/${item.id}`;

const BOX = "aq-rise group flex flex-col overflow-hidden rounded-lg border border-border bg-white no-underline shadow-sm transition-shadow hover:shadow-md";

/** Top desk stories: the newest flash in the large box, the next four in a 2×2 grid. Pictures are 16:9, the shape desk thumbnails are made in. */
export function TelexLead({ items }: { items: TelexView[] }) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  const cards = rest.slice(0, 4);
  const place = lead.tags.find((tag) => tag.toLowerCase() !== lead.product.toLowerCase());
  return (
    <section aria-label="Top desk stories" className="grid gap-4 lg:grid-cols-2">
      <Link href={href(lead)} aria-label={`Read: ${lead.headline}`} className={BOX}>
        <div className="relative aspect-video overflow-hidden bg-s2">
          <StoryImage product={lead.product} src={lead.thumb} pick={lead.pick} sizes="(min-width: 1024px) 50vw, 100vw" priority className="transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProductChip product={lead.product} small />
            {place ? <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700">{place}</span> : null}
            <span className="font-mono text-[11px] tabular-nums text-dim">{clock(lead.publishedAt)}</span>
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-[15.5px] font-bold leading-snug text-ink group-hover:text-navy-700">{lead.headline}</h2>
          {lead.excerpt ? <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-mid">{lead.excerpt}</p> : null}
        </div>
      </Link>

      {cards.length ? (
        <div className="grid grid-cols-2 content-start gap-4">
          {cards.map((item) => (
            <Link key={item.id} href={href(item)} aria-label={`Read: ${item.headline}`} className={BOX}>
              <div className="relative aspect-video overflow-hidden bg-s2">
                <StoryImage product={item.product} src={item.thumb} pick={item.pick} sizes="(min-width: 1024px) 25vw, 50vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ProductChip product={item.product} small />
                  <span className="font-mono text-[10px] tabular-nums text-dim">{clock(item.publishedAt)}</span>
                </div>
                <h3 className="mt-1 line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink group-hover:text-navy-700">{item.headline}</h3>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
