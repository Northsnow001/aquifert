import Link from "next/link";

export type TradeSection = "trades" | "documents";

const ITEMS: { id: TradeSection; href: string; label: string }[] = [
  { id: "trades", href: "/hub/trade", label: "Your Trades" },
  { id: "documents", href: "/hub/trade/documents", label: "Documents" },
];

export function TradeSectionNav({ current }: { current: TradeSection }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-full bg-black/[.05] p-1" aria-label="Trades">
      {ITEMS.map((item) => {
        const on = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[14.5px] font-semibold no-underline transition ${
              on ? "bg-white text-ink shadow-[0_1px_3px_rgb(16_38_59/0.12)]" : "text-mid hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
