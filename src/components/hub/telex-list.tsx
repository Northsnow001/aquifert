import Link from "next/link";
import { ArrowRight, CheckCheck, Lock } from "lucide-react";
import { FeedThumb, Tag, ToneBadge } from "@/components/hub/kit";
import { groupByDay, type TelexView } from "@/lib/aq-modules/telex";
import { FILE_ACCESS_LABEL, formatTelexDay, plainText } from "@/lib/content-types";

/**
 * Telex rows grouped by day: category thumbnail, time, product and direction chips, headline and body.
 * `preview` shows the opening lines and a Read more link; the full story opens on its own page, where reading is tracked.
 */
export function TelexList({
  items,
  mode = "excerpt",
  thumb = 56,
  readIds,
  empty = "No Telex flashes match yet. The desk publishes through the trading day.",
}: {
  items: TelexView[];
  mode?: "excerpt" | "preview";
  thumb?: number;
  /** Flashes this member has already read, marked with a Read chip. */
  readIds?: Set<string>;
  empty?: string;
}) {
  if (!items.length) return <p className="px-5 py-12 text-center text-[15px] text-mid">{empty}</p>;
  return (
    <div>
      {groupByDay(items).map(([day, rows]) => (
        <div key={day}>
          <p className="sticky top-0 z-10 border-b border-border bg-white/95 px-5 py-1.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.14em] text-dim backdrop-blur">
            {formatTelexDay(day)}
          </p>
          <ul className="divide-y divide-border">
            {rows.map((item) => {
              const href = `/hub/telex/${item.id}`;
              const read = readIds?.has(item.id);
              return (
                <li key={item.id} className="px-5 py-4 transition-colors hover:bg-s2/60">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 sm:items-start sm:gap-x-3.5">
                    <FeedThumb product={item.product} src={item.thumb} pick={item.pick} size={thumb} className="max-sm:size-11! max-sm:rounded-lg sm:row-span-2" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[12px] tabular-nums text-dim">{item.publishedAt.slice(11, 16) || "--:--"}</span>
                      <Tag tone="teal">{item.product}</Tag>
                      <ToneBadge tone={item.tone} />
                      {item.access !== "public" ? <Tag tone="blue">{FILE_ACCESS_LABEL[item.access]}</Tag> : null}
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[11.5px] font-medium text-mid">
                          {tag}
                        </span>
                      ))}
                      {read ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-s2 px-2 py-0.5 text-[11px] font-semibold text-dim" title="You have read this flash">
                          <CheckCheck className="h-3 w-3" aria-hidden /> Read
                        </span>
                      ) : null}
                    </div>
                    <div className="col-span-2 min-w-0 max-sm:mt-1 sm:col-span-1 sm:col-start-2">
                      <h3 className={`mt-1.5 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] ${read ? "text-mid" : "text-ink"}`}>
                        <Link href={href} className="text-inherit no-underline hover:text-blue hover:underline">
                          {item.headline}
                        </Link>
                      </h3>
                      {!item.readable ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[14.5px] text-mid">
                          <Lock className="h-3.5 w-3.5 text-blue" />
                          {FILE_ACCESS_LABEL[item.access]} flash.{" "}
                          <Link href="/hub/account/membership" className="font-semibold text-blue no-underline hover:underline">
                            Upgrade to read it
                          </Link>
                        </p>
                      ) : mode === "preview" ? (
                        <>
                          <p className="mt-1.5 line-clamp-4 text-[15px] leading-relaxed text-ink sm:line-clamp-5">{plainText(item.paragraphs.join("\n\n"))}</p>
                          <Link
                            href={href}
                            aria-label={`Read more: ${item.headline}`}
                            className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-blue no-underline hover:underline"
                          >
                            Read more <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </>
                      ) : (
                        <p className="mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-mid">{item.excerpt}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
