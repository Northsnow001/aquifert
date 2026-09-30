import Link from "next/link";
import { CalendarClock, Download } from "lucide-react";
import { btnSecondary } from "@/components/app/form";

export const segWrap = "inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-border bg-white p-1 shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)]";
export const segItem = "inline-flex h-8 items-center justify-center rounded-full px-3 text-[12.5px] font-semibold no-underline transition";
export const segOn = "bg-blue text-white shadow-[0_4px_12px_-6px_rgb(47_111_179/0.8)]";
export const segOff = "text-mid hover:bg-s2 hover:text-ink";

/** Segmented control made of links, so the choice lives in the URL and works without JavaScript. */
export function SegLinks({ label, items }: { label: string; items: { href: string; label: string; active: boolean; title?: string }[] }) {
  return (
    <nav aria-label={label} className={segWrap}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} scroll={false} title={item.title} aria-current={item.active ? "true" : undefined} className={`${segItem} ${item.active ? segOn : segOff}`}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function DownloadLink({ href, label = "Download CSV" }: { href: string; label?: string }) {
  return (
    <a href={href} download className={`${btnSecondary} h-10 px-4 text-[13px]`}>
      <Download className="h-4 w-4" aria-hidden /> {label}
    </a>
  );
}

export function AsOf({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-dim">
      <CalendarClock className="h-3.5 w-3.5" aria-hidden /> {children}
    </p>
  );
}

export function Metric({ label, value, sub, className = "" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-s2/60 px-3.5 py-3">
      <p className="text-[11.5px] font-medium text-mid">{label}</p>
      <p className={`mt-0.5 text-[18px] font-semibold tabular-nums tracking-[-0.01em] text-ink ${className}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-dim">{sub}</p> : null}
    </div>
  );
}

/** Where the latest price sits between the low (left) and high (right). */
export function RangeBar({ value, className = "" }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`relative h-1.5 rounded-full bg-gradient-to-r from-[#fdecea] via-s3 to-[#e7f6ee] ${className}`} role="img" aria-label={`Range position ${clamped} out of 100`}>
      <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy-700 shadow" style={{ left: `${clamped}%` }} />
    </div>
  );
}
