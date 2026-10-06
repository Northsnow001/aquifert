import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeedViewToggle } from "@/components/hub/feed-view";

/** Header shared by the AQ View and TELEX cards on the hub; must sit inside a `FeedViewFrame`. */
export function FeedCardHeader({ id, title, subtitle, href, extra }: { id: string; title: string; subtitle: string; href: string; extra?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-[19px] font-extrabold uppercase leading-none tracking-[0.12em] text-navy-800">
          {title}
        </h2>
        <p className="mt-1.5 text-[12.5px] font-medium leading-tight text-mid">{subtitle}</p>
      </div>
      {extra ? <div className="order-last basis-full sm:order-none sm:basis-auto">{extra}</div> : null}
      <div className="flex shrink-0 items-center gap-2">
        <FeedViewToggle />
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-navy-700 no-underline transition hover:border-navy-400 hover:bg-s2"
        >
          Open feed <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </header>
  );
}

export function FeedGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid flex-1 grid-cols-1 content-start gap-2.5 p-3.5 group-data-[view=grid]/feed:gap-3 sm:group-data-[view=grid]/feed:grid-cols-2">{children}</div>;
}

/**
 * One story, laid out as a row in list view or an image tile in tile view.
 * `lead` widens the first tile across both columns so an odd count leaves no gap.
 */
export function FeedItem({ href, lead = false, thumb, image, chips, title, meta }: { href: string; lead?: boolean; thumb: React.ReactNode; image: React.ReactNode; chips?: React.ReactNode; title: string; meta: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`group/item flex min-w-0 items-start gap-3 rounded-xl border border-border bg-s2/40 p-2.5 no-underline transition hover:border-navy-400/50 hover:bg-s2 group-data-[view=grid]/feed:flex-col group-data-[view=grid]/feed:gap-0 group-data-[view=grid]/feed:overflow-hidden group-data-[view=grid]/feed:bg-white group-data-[view=grid]/feed:p-0 group-data-[view=grid]/feed:hover:shadow-md ${lead ? "sm:group-data-[view=grid]/feed:col-span-2" : ""}`}
    >
      <span className="shrink-0 group-data-[view=grid]/feed:hidden">{thumb}</span>
      <span className={`relative hidden aspect-[16/9] w-full overflow-hidden bg-s2 group-data-[view=grid]/feed:block ${lead ? "sm:aspect-[16/7]" : ""}`}>{image}</span>
      <span className="block min-w-0 flex-1 group-data-[view=grid]/feed:w-full group-data-[view=grid]/feed:p-3">
        {chips ? <span className="flex flex-wrap items-center gap-1">{chips}</span> : null}
        <span className="mt-1 line-clamp-2 block text-[13.5px] font-semibold leading-snug text-ink group-hover/item:underline">{title}</span>
        <span className="mt-0.5 block text-[11.5px] text-dim">{meta}</span>
      </span>
    </Link>
  );
}

/** Image sizes for a tile: half a hub card on desktop, full width on a phone. */
export const tileSizes = (lead: boolean) => (lead ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw");
