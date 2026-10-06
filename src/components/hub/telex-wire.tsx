"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { LayoutGrid, List, Lock } from "lucide-react";
import { FeedThumb, FreshnessBadge, PRODUCT_STYLE, ProductChip, StoryImage, Tag } from "@/components/hub/kit";
import type { TelexView } from "@/lib/aq-modules/telex";
import { FILE_ACCESS_LABEL, formatDay, formatStamp, formatTelexDay } from "@/lib/content-types";

export type WireRow = Pick<TelexView, "id" | "headline" | "excerpt" | "tags" | "product" | "access" | "readable" | "publishedAt" | "updatedAt" | "thumb" | "pick">;

type View = "list" | "tile";

const PAGE = 10;
const VIEW_KEY = "aq-telex-view";
const clock = (stamp: string) => stamp.slice(11, 16) || "--:--";
const href = (item: WireRow) => `/hub/telex/${item.id}`;

const listeners = new Set<() => void>();
const readView = (): View => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "tile" ? "tile" : "list";
  } catch {
    return "list";
  }
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};
const writeView = (view: View) => {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* private mode keeps the default */
  }
  listeners.forEach((listener) => listener());
};

function groupByDay(items: WireRow[]) {
  const map = new Map<string, WireRow[]>();
  for (const item of items) {
    const day = item.publishedAt.slice(0, 10);
    map.set(day, [...(map.get(day) ?? []), item]);
  }
  return [...map.entries()];
}

function RowTags({ item }: { item: WireRow }) {
  return (
    <>
      {item.access !== "public" ? <Tag tone="blue">{FILE_ACCESS_LABEL[item.access]}</Tag> : null}
      {item.tags
        .filter((tag) => tag.toLowerCase() !== item.product.toLowerCase())
        .slice(0, 2)
        .map((tag) => (
        <span key={tag} className="rounded-full bg-navy-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-navy-700">
          {tag}
        </span>
      ))}
    </>
  );
}

function Summary({ item, clamp }: { item: WireRow; clamp: string }) {
  return item.readable ? (
    <p className={`mt-1 text-[13.5px] leading-relaxed text-mid ${clamp}`}>{item.excerpt}</p>
  ) : (
    <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-mid">
      <Lock className="h-3.5 w-3.5 text-blue" /> {FILE_ACCESS_LABEL[item.access]} flash
    </p>
  );
}

/** The TELEX card at the top of the hub: every flash after the five in the boxes, newest first, as a list or tiles. */
export function TelexWire({ items, total, latest, now, filters }: { items: WireRow[]; total: number; latest?: string; now: string; filters?: React.ReactNode }) {
  const view = useSyncExternalStore(subscribe, readView, () => "list" as View);
  const [limit, setLimit] = useState(PAGE);
  const shown = items.slice(0, limit);
  const more = items.length > shown.length;

  const toggle = (value: View, label: string, Icon: typeof List) => (
    <button
      type="button"
      onClick={() => writeView(value)}
      aria-pressed={view === value}
      title={label}
      aria-label={label}
      className={`px-2.5 py-1.5 transition-colors ${view === value ? "bg-navy-700 text-white" : "bg-white text-dim hover:text-ink"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <section aria-labelledby="telex-wire-title" className="aq-card aq-rise min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-2 sm:flex-1">
          <div>
            <h2 id="telex-wire-title" className="text-[22px] font-bold uppercase leading-tight tracking-[0.14em] text-teal-700">
              Telex
            </h2>
            <p className="mt-0.5 text-[13px] text-mid">Desk-issued market flashes, chronological</p>
          </div>
          <FreshnessBadge stamp={latest} now={now} />
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border" role="group" aria-label="Feed view">
          {toggle("list", "List view", List)}
          {toggle("tile", "Tile view", LayoutGrid)}
        </div>
      </div>

      {filters ? <div className="mt-3">{filters}</div> : null}

      {shown.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border p-5 text-center text-[14px] text-mid">
          {total ? "The newest flashes are in the boxes below. Older ones show here as the desk files more." : "No TELEX flashes match your filters. The desk publishes through the trading day."}
        </p>
      ) : view === "tile" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => (
            <Link
              key={item.id}
              href={href(item)}
              className={`group flex flex-col overflow-hidden rounded-lg border border-border/60 border-t-4 ${PRODUCT_STYLE[item.product].top} bg-white no-underline shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-s2">
                <StoryImage product={item.product} src={item.thumb} pick={item.pick} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ProductChip product={item.product} small />
                  <RowTags item={item} />
                  <span className="font-mono text-[10.5px] tabular-nums text-dim">{clock(item.publishedAt)}</span>
                </div>
                <h3 className="mt-1.5 line-clamp-2 text-[14.5px] font-bold leading-snug text-ink group-hover:text-blue">{item.headline}</h3>
                <Summary item={item} clamp="line-clamp-3" />
                <p className="mt-auto pt-2 text-[10.5px] uppercase tracking-wide text-dim">{formatDay(item.publishedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {groupByDay(shown).map(([day, rows]) => (
            <div key={day}>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-dim">{formatTelexDay(day)}</p>
              <ul className="mt-1.5 space-y-2.5">
                {rows.map((item) => {
                  const style = PRODUCT_STYLE[item.product];
                  return (
                    <li key={item.id} className={`rounded-lg border border-border/60 border-l-4 ${style.border} ${style.wash} px-3 py-3`}>
                      <div className="flex items-start gap-3">
                        <Link href={href(item)} tabIndex={-1} aria-hidden className="shrink-0">
                          <FeedThumb product={item.product} src={item.thumb} pick={item.pick} size={64} className="max-sm:size-12!" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11.5px] tabular-nums text-dim">{clock(item.publishedAt)}</span>
                            <ProductChip product={item.product} small />
                            <RowTags item={item} />
                          </div>
                          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">
                            <Link href={href(item)} className="text-inherit no-underline hover:text-blue hover:underline">
                              {item.headline}
                            </Link>
                          </h3>
                          <Summary item={item} clamp="line-clamp-3" />
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            <p className="text-[10.5px] uppercase tracking-wide text-dim">Updated {formatStamp(item.updatedAt)}</p>
                            <Link href={href(item)} className="text-[10.5px] font-semibold uppercase tracking-wide text-navy-600 no-underline hover:underline">
                              Read more →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {more ? (
        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={() => setLimit((value) => value + PAGE)}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-[13px] font-semibold text-ink transition hover:border-blue/40"
          >
            Load older flashes
          </button>
        </div>
      ) : null}

      <p className="mt-3 border-t border-border pt-3 text-[11.5px] leading-relaxed text-dim">
        TELEX flashes are desk assessments provided for information only. They do not constitute an offer, a price assessment, or advice. Verify independently before trading.
      </p>
    </section>
  );
}
