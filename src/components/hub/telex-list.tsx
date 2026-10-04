import Link from "next/link";
import { Lock } from "lucide-react";
import { FeedThumb, Tag, ToneBadge } from "@/components/hub/kit";
import { Markdown } from "@/components/hub/markdown";
import { groupByDay, type TelexView } from "@/lib/aq-modules/telex";
import { FILE_ACCESS_LABEL, formatTelexDay } from "@/lib/content-types";

/** Telex rows grouped by day: category thumbnail, time, product and direction chips, headline and body. */
export function TelexList({
  items,
  mode = "excerpt",
  thumb = 56,
  empty = "No Telex flashes match yet. The desk publishes through the trading day.",
}: {
  items: TelexView[];
  mode?: "excerpt" | "full";
  thumb?: number;
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
            {rows.map((item) => (
              <li key={item.id} className="px-5 py-4 transition-colors hover:bg-s2/60">
                <div className="flex items-start gap-3.5">
                  <FeedThumb product={item.product} size={thumb} />
                  <div className="min-w-0 flex-1">
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
                    </div>
                    <h3 className="mt-1.5 text-[16.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">{item.headline}</h3>
                    {!item.readable ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[14.5px] text-mid">
                        <Lock className="h-3.5 w-3.5 text-blue" />
                        {FILE_ACCESS_LABEL[item.access]} flash.{" "}
                        <Link href="/hub/account/membership" className="font-semibold text-blue no-underline hover:underline">
                          Upgrade to read it
                        </Link>
                      </p>
                    ) : mode === "full" ? (
                      <Markdown text={item.paragraphs.join("\n\n")} images className="mt-2 text-[15px] text-ink" />
                    ) : (
                      <p className="mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-mid">{item.excerpt}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
