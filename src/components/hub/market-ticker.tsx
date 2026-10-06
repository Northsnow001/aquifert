import Link from "next/link";
import type { TelexProduct, Tone } from "@/lib/aq-modules/types";

export type TickerItem =
  | { kind: "gauge"; key: string; name: string; tone: Tone; blurb: string }
  | { kind: "telex"; key: string; product: TelexProduct; headline: string; href: string };

/** Direction only, never a price: the desk's score says which way the market leans. */
export const stanceOf = (value: number): Tone => (value > 66 ? "up" : value < 34 ? "down" : "flat");

const STANCE: Record<Tone, { word: string; arrow: string; dot: string; text: string }> = {
  up: { word: "Firming", arrow: "▲", dot: "bg-emerald-300", text: "text-emerald-200" },
  down: { word: "Softening", arrow: "▼", dot: "bg-red-300", text: "text-red-200" },
  flat: { word: "Steady", arrow: "◆", dot: "bg-amber-300", text: "text-amber-200" },
};

const TELEX_DOT: Record<TelexProduct, string> = {
  Nitrogen: "bg-[#8fb8de]",
  Phosphate: "bg-[#e3b56b]",
  Potash: "bg-[#b3a5d9]",
  Freight: "bg-[#86d1b2]",
  General: "bg-slate-300",
};

function Entry({ item, copy }: { item: TickerItem; copy: boolean }) {
  if (item.kind === "telex") {
    return (
      <Link
        href={item.href}
        tabIndex={copy ? -1 : undefined}
        className="flex items-center gap-2 whitespace-nowrap text-[13.5px] text-white no-underline hover:underline hover:decoration-white/50 hover:underline-offset-4"
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${TELEX_DOT[item.product]}`} />
        <span className="font-bold uppercase tracking-wide text-teal-200">TELEX · {item.product}</span>
        <span className="max-w-[480px] truncate text-white/90">{item.headline}</span>
      </Link>
    );
  }
  const stance = STANCE[item.tone];
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-[13.5px]">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${stance.dot}`} />
      <span className="font-bold uppercase tracking-wide">{item.name}</span>
      <span className={`font-bold ${stance.text}`}>
        {stance.arrow} {stance.word}
      </span>
      {item.blurb ? <span className="max-w-[420px] truncate text-white/80">{item.blurb}</span> : null}
    </span>
  );
}

/** The moving strip under the tabs: market direction from the admin's indicator readings, then the latest TELEX headlines. */
export function MarketTicker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;
  return (
    <div className="aq-ticker relative flex items-stretch overflow-hidden border-b border-black/30 text-white" style={{ background: "var(--aq-ai-gradient)" }}>
      <div className="relative z-[1] flex shrink-0 items-center gap-1.5 bg-[#0C1C2E] px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300 sm:px-3.5 sm:text-[12px]">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
        </span>
        <span className="hidden sm:inline">Markets Indicators</span>
        <span className="sm:hidden">Markets</span>
      </div>
      <div className="aq-ticker-window relative min-w-0 flex-1 overflow-hidden [text-shadow:0_1px_1px_rgb(0_0_0/0.18)]" aria-label="Market direction and latest TELEX" role="region">
        <div className="aq-ticker-track flex w-max items-center py-2" style={{ "--aq-ticker-time": `${Math.max(30, items.length * 7)}s` } as React.CSSProperties}>
          {[false, true].map((copy) => (
            <div key={String(copy)} className="flex shrink-0 items-center gap-8 pl-6 pr-2" aria-hidden={copy || undefined}>
              {items.map((item) => (
                <Entry key={item.key} item={item} copy={copy} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
