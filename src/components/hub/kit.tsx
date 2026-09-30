import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { InfoTip } from "@/components/app/info-tip";
import { THUMBS, type TelexProduct, type Tone } from "@/lib/aq-modules/types";

/** Page title row used across the hub: optional eyebrow, title with (i) tip, description and actions. */
export function HubPageHeader({
  title,
  description,
  eyebrow,
  tip,
  guide,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  tip?: string;
  /** Guide anchor for the tip's "Learn more". */
  guide?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="aq-rise mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">{eyebrow}</p> : null}
        <h1 className="flex items-center gap-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[30px]">
          <span className="min-w-0">{title}</span>
          {tip ? <InfoTip label={typeof title === "string" ? title : "About this page"} text={tip} href={guide ? `/hub/guide#${guide}` : "/hub/guide"} /> : null}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-mid">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function FeedThumb({ product, size = 56, className = "" }: { product: TelexProduct | "Market"; size?: number; className?: string }) {
  return (
    <Image
      src={THUMBS[product] ?? THUMBS.General}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 select-none rounded-xl object-cover ring-1 ring-black/[.06] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

const TAG_TONE = {
  green: "bg-[#e7f6ee] text-[#1b7a47]",
  red: "bg-[#fdecea] text-[#b53a2f]",
  blue: "bg-blue-light text-blue",
  amber: "bg-[#fff4df] text-[#9a5b00]",
  neutral: "bg-s3 text-mid",
  teal: "bg-teal-100 text-teal-800",
};

export type TagTone = keyof typeof TAG_TONE;

export function Tag({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: TagTone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] ${TAG_TONE[tone]} ${className}`}>{children}</span>;
}

export const toneTag = (tone: Tone): TagTone => (tone === "up" ? "green" : tone === "down" ? "red" : "neutral");
export const TONE_LABEL: Record<Tone, string> = { up: "Firmer", down: "Softer", flat: "Steady" };

export function ToneBadge({ tone }: { tone: Tone }) {
  const Icon = tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : ArrowRight;
  return (
    <Tag tone={toneTag(tone)}>
      <Icon className="h-3 w-3" strokeWidth={2.6} aria-hidden />
      {TONE_LABEL[tone]}
    </Tag>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "",
  href,
  meter,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "" | "blue" | "amber" | "rose";
  href?: string;
  /** 0 to 100, draws a usage bar. */
  meter?: number;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-mid">{label}</p>
        <span className={`aq-chip ${tone ? `aq-chip-${tone}` : ""} flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white`}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>
      <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</p>
      {meter !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-s3" aria-hidden>
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${meter >= 100 ? "bg-danger" : meter >= 80 ? "bg-[#d9951f]" : "bg-teal-500"}`}
            style={{ width: `${Math.min(100, Math.max(3, meter))}%` }}
          />
        </div>
      ) : null}
      {hint ? <p className="mt-2 text-[12px] leading-snug text-dim">{hint}</p> : null}
    </>
  );
  const cls = "aq-card aq-lift flex flex-col p-4 no-underline";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Sparkline({ points, tone, width = 120, height = 34, label }: { points: number[]; tone: Tone; width?: number; height?: number; label?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * width, height - ((p - min) / span) * (height - 6) - 3] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const color = tone === "up" ? "#1f9d60" : tone === "down" ? "#d14b3f" : "#7d8fa0";
  const id = `spark-${tone}-${points.length}-${Math.round(points[0])}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? `Trend from ${points[0]} to ${points[points.length - 1]}`} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r={2.8} fill={color} />
    </svg>
  );
}

export function Panel({
  title,
  sub,
  icon: Icon,
  tone = "",
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "" | "blue" | "amber" | "rose";
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`aq-card flex min-w-0 flex-col overflow-hidden ${className}`}>
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
        {Icon ? (
          <span className={`aq-chip ${tone ? `aq-chip-${tone}` : ""} flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white`}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {sub ? <p className="text-[12px] text-dim">{sub}</p> : null}
        </div>
        {actions}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function EmptyPanel({ title, body, action }: { title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white/60 px-6 py-12 text-center">
      <p className="text-[14.5px] font-semibold text-ink">{title}</p>
      {body ? <p className="max-w-md text-[13px] leading-relaxed text-mid">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-[11.5px] leading-relaxed text-dim">
      {children ?? "Desk assessments for information only. Not an offer, a price assessment or advice. Verify independently before trading."}
    </p>
  );
}
