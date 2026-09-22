// Aquifert ONE, design system components (scoped to .aq token context)
// Chrome is quiet, data is loud. Borders over shadows. Radii ≤ 12px.
import React, { useState } from "react";

const cx = (...p: (string | false | undefined)[]) => p.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};
export function AqButton({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  const sizes = { sm: "h-8 px-3 text-[0.8125rem]", md: "h-10 px-4 text-[0.875rem]", lg: "h-12 px-6 text-[1rem]" };
  const variants = {
    primary: "bg-[var(--aq-brand-primary)] text-[var(--aq-on-primary)] border border-transparent hover:brightness-110",
    secondary: "bg-transparent text-[var(--aq-text-primary)] border border-[var(--aq-border-strong)] hover:border-[var(--aq-brand-primary)] hover:text-[var(--aq-brand-primary)]",
    ghost: "bg-transparent text-[var(--aq-text-primary)] border border-transparent hover:bg-[var(--aq-surface-sunken)]",
    link: "bg-transparent text-[var(--aq-brand-primary)] border border-transparent underline-offset-4 hover:underline px-0 h-auto",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[4px] font-semibold transition-colors",
        "disabled:opacity-45 disabled:pointer-events-none min-w-[24px] min-h-[24px]",
        sizes[size], variants[variant], className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------------- Inputs ---------------- */
export function AqInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return (
    <input
      className={cx(
        "h-10 w-full rounded-[4px] border bg-[var(--aq-surface-raised)] px-3 text-[0.875rem] text-[var(--aq-text-primary)]",
        "placeholder:text-[var(--aq-text-secondary)]",
        invalid ? "border-[var(--aq-price-down)]" : "border-[var(--aq-border-strong)] hover:border-[var(--aq-grey-400)]",
        className,
      )}
      {...rest}
    />
  );
}
export function AqSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={cx(
        "h-10 w-full rounded-[4px] border border-[var(--aq-border-strong)] bg-[var(--aq-surface-raised)] px-3 text-[0.875rem] text-[var(--aq-text-primary)] hover:border-[var(--aq-grey-400)]",
        className,
      )}
      {...rest}
    >{children}</select>
  );
}
export function AqCheckbox({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[0.875rem] text-[var(--aq-text-primary)]">
      <input type="checkbox" className="h-[18px] w-[18px] rounded-[4px] accent-[#356793]" {...rest} />
      {label}
    </label>
  );
}
export function AqRadio({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[0.875rem] text-[var(--aq-text-primary)]">
      <input type="radio" className="h-[18px] w-[18px] accent-[#356793]" {...rest} />
      {label}
    </label>
  );
}

/* ---------------- Card ---------------- */
export function AqCard({ title, children, footer }: { title?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="rounded-[8px] border border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)]">
      {title && <header className="border-b border-[var(--aq-border-subtle)] px-4 py-3"><h3 className="aq-h3">{title}</h3></header>}
      <div className="px-4 py-4">{children}</div>
      {footer && <footer className="border-t border-[var(--aq-border-subtle)] px-4 py-3">{footer}</footer>}
    </section>
  );
}

/* ---------------- Tag & Badge ---------------- */
export function AqTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "accent" }) {
  const tones = {
    neutral: "border-[var(--aq-border-strong)] text-[var(--aq-text-secondary)]",
    brand: "border-[var(--aq-primary-300)] text-[var(--aq-brand-primary)]",
    accent: "border-[var(--aq-accent-300)] text-[var(--aq-price-up)]",
  };
  return <span className={cx("aq-label inline-flex items-center rounded-[4px] border px-2 py-1", tones[tone])}>{children}</span>;
}
export function AqBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "up" | "down" | "brand" }) {
  const tones = {
    neutral: "bg-[var(--aq-surface-sunken)] text-[var(--aq-text-secondary)]",
    up: "bg-[var(--aq-price-up)] text-white",
    down: "bg-[var(--aq-price-down)] text-white",
    brand: "bg-[var(--aq-brand-primary)] text-[var(--aq-on-primary)]",
  };
  return <span className={cx("inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[0.75rem] font-semibold leading-4", tones[tone])}>{children}</span>;
}

/* ---------------- PriceCell, direction never by colour alone ---------------- */
export function AqPriceCell({ value, change, pct }: { value: string; change: number; pct: number }) {
  const dir = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const color = dir === "up" ? "var(--aq-price-up)" : dir === "down" ? "var(--aq-price-down)" : "var(--aq-price-flat)";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
  const sign = change > 0 ? "+" : "";
  return (
    <span className="aq-data inline-flex items-baseline gap-2">
      <span className="text-[var(--aq-text-primary)]">{value}</span>
      <span style={{ color }}>
        <span aria-hidden>{arrow}</span>
        <span className="sr-only">{dir === "up" ? "up" : dir === "down" ? "down" : "unchanged"}</span>
        {" "}{sign}{change.toFixed(2)} ({sign}{pct.toFixed(2)}%)
      </span>
    </span>
  );
}

/* ---------------- MarketTable ---------------- */
export type MarketRow = { product: string; price: string; change: number; pct: number; updated: string };
export function AqMarketTable({ rows, caption }: { rows: MarketRow[]; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-[8px] border border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)]">
      <table className="w-full border-collapse text-[0.875rem]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="sticky top-0 border-b border-[var(--aq-border-strong)] bg-[var(--aq-surface-raised)]">
            {["Product", "Price", "Change", "Updated"].map((h, i) => (
              <th key={h} scope="col" className={cx("aq-label px-4 py-2.5 text-[var(--aq-text-secondary)]", i > 0 ? "text-right" : "text-left")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product} className="border-b border-[var(--aq-border-subtle)] last:border-0 hover:bg-[var(--aq-surface-sunken)]">
              <th scope="row" className="px-4 py-2.5 text-left font-medium text-[var(--aq-text-primary)]">{r.product}</th>
              <td data-numeric className="px-4 py-2.5 text-right">{r.price}</td>
              <td data-numeric className="px-4 py-2.5 text-right"><AqPriceCell value="" change={r.change} pct={r.pct} /></td>
              <td data-numeric className="px-4 py-2.5 text-right text-[var(--aq-text-secondary)]">{r.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Data disclaimers ---------------- */
export function AqDataDisclaimer({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[0.75rem] leading-5 text-[var(--aq-text-secondary)]">{children}</p>;
}
export function AqSourceAttribution({ source, href }: { source: string; href?: string }) {
  return (
    <p className="text-[0.75rem] text-[var(--aq-text-secondary)]">
      Source: {href ? <a className="text-[var(--aq-brand-primary)] underline underline-offset-2" href={href}>{source}</a> : source}
    </p>
  );
}

/* ---------------- Skeleton (matches final layout, zero shift) ---------------- */
export function AqSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-[4px] bg-[var(--aq-border-subtle)]", className)} />;
}

/* ---------------- Empty / Error state blocks ---------------- */
export function AqEmpty({ title, action }: { title: string; action: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[var(--aq-border-strong)] px-4 py-8 text-center">
      <p className="aq-small text-[var(--aq-text-secondary)]">{title}</p>
      <AqButton variant="link" className="mt-1">{action}</AqButton>
    </div>
  );
}
export function AqError({ what, onRetry }: { what: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[8px] border border-[var(--aq-price-down)] px-4 py-4" role="alert">
      <p className="aq-small font-semibold text-[var(--aq-price-down)]">Something failed</p>
      <p className="aq-small mt-0.5 text-[var(--aq-text-secondary)]">{what}</p>
      <AqButton variant="secondary" size="sm" className="mt-2" onClick={onRetry}>Retry</AqButton>
    </div>
  );
}

/* ---------------- Modal (shadows only for genuinely floating things) ---------------- */
export function AqModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[12px] bg-[var(--aq-surface-raised)] p-6 shadow-2xl">
        <h3 className="aq-h3">{title}</h3>
        <div className="aq-body mt-2 text-[var(--aq-text-secondary)]">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <AqButton variant="ghost" onClick={onClose}>Cancel</AqButton>
          <AqButton onClick={onClose}>Confirm</AqButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Toast ---------------- */
export function AqToast({ tone = "neutral", children }: { tone?: "neutral" | "up" | "down"; children: React.ReactNode }) {
  const bar = tone === "up" ? "var(--aq-price-up)" : tone === "down" ? "var(--aq-price-down)" : "var(--aq-brand-primary)";
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)] px-4 py-3 shadow-lg" role="status">
      <span className="h-8 w-1 rounded-full" style={{ background: bar }} aria-hidden />
      <p className="aq-small text-[var(--aq-text-primary)]">{children}</p>
    </div>
  );
}

/* ---------------- Accordion / Tabs / Breadcrumb ---------------- */
export function AqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[var(--aq-border-subtle)] rounded-[8px] border border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)]">
      {items.map((it, i) => (
        <div key={it.q}>
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[0.9375rem] font-semibold text-[var(--aq-text-primary)]"
            aria-expanded={openIdx === i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            {it.q}
            <span aria-hidden className="text-[var(--aq-text-secondary)]">{openIdx === i ? "−" : "+"}</span>
          </button>
          {openIdx === i && <p className="aq-small px-4 pb-4 text-[var(--aq-text-secondary)]">{it.a}</p>}
        </div>
      ))}
    </div>
  );
}
export function AqTabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-[var(--aq-border-subtle)]">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-[0.875rem] font-semibold",
              active === i
                ? "border-[var(--aq-brand-primary)] text-[var(--aq-brand-primary)]"
                : "border-transparent text-[var(--aq-text-secondary)] hover:text-[var(--aq-text-primary)]",
            )}
          >{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" className="py-4">{tabs[active].content}</div>
    </div>
  );
}
export function AqBreadcrumb({ trail }: { trail: string[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem]">
        {trail.map((t, i) => (
          <li key={t} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-[var(--aq-text-secondary)]">/</span>}
            {i === trail.length - 1
              ? <span aria-current="page" className="font-semibold text-[var(--aq-text-primary)]">{t}</span>
              : <a href="#" onClick={(e) => e.preventDefault()} className="text-[var(--aq-brand-primary)] hover:underline">{t}</a>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
