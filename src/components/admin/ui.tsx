import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { PublishStatus } from "@/lib/content-types";

/** Size-free field, for inline controls that set their own height and width. */
export const field =
  "rounded-xl border border-border bg-white px-3 text-[13.5px] text-ink shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] outline-none transition placeholder:text-dim hover:border-[#cdd7e1]";
export const input = `${field} h-10 w-full`;
export const textarea =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-ink shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] outline-none transition placeholder:text-dim hover:border-[#cdd7e1]";
export const label = "block text-[12.5px] font-medium text-mid";
export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue px-4 text-[13px] font-semibold text-white no-underline shadow-[0_6px_14px_-8px_rgb(47_111_179/0.7)] transition hover:bg-blue-dim disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 text-[13px] font-semibold text-ink no-underline transition hover:border-blue/40 hover:text-blue disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 text-[13px] font-semibold text-danger no-underline transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold text-mid no-underline transition hover:bg-black/[.05] hover:text-ink";

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs?.length ? (
          <nav className="mb-1.5 flex items-center gap-1.5 text-[12px] text-dim">
            {crumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                <Link href={crumb.href} className="text-dim no-underline hover:text-blue">
                  {crumb.label}
                </Link>
                <span>/</span>
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-mid">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`aq-card ${className}`}>{children}</section>;
}

export function CardHeader({ title, meta, actions }: { title: string; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>
        {meta ? <p className="mt-0.5 text-[12px] text-dim">{meta}</p> : null}
      </div>
      {actions}
    </div>
  );
}

const STATUS_STYLE: Record<PublishStatus, string> = {
  published: "bg-[#eaf7ef] text-[#1f7a45] ring-[#cdebd8]",
  draft: "bg-[#fff6e5] text-[#9a5b00] ring-[#f5dfb3]",
  private: "bg-s2 text-mid ring-border",
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "blue" | "teal" | "amber" }) {
  const tones = {
    neutral: "bg-s2 text-mid",
    blue: "bg-blue-light text-blue",
    teal: "bg-[#eaf5f0] text-[#2f6f57]",
    amber: "bg-[#fff6e5] text-[#9a5b00]",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Flash({ saved, error, message }: { saved?: string; error?: string; message?: string }) {
  if (saved) {
    return (
      <p className="mb-5 flex items-center gap-2 rounded-xl border border-[#cdebd8] bg-[#f1faf4] px-4 py-2.5 text-[13px] font-medium text-[#1f7a45]">
        <CheckCircle2 className="h-4 w-4" />
        {message ?? "Saved. The hub is showing this version now."}
      </p>
    );
  }
  if (error) {
    return (
      <p className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-danger">
        <CircleAlert className="h-4 w-4" />
        {message ?? "Check the required fields and save again."}
      </p>
    );
  }
  return null;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {body ? <p className="max-w-sm text-[13px] text-mid">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
