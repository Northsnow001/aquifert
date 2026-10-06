import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Filled and outline pill links for the plan sales pages; `light` sits on navy or video. */
export const heroPrimary = "inline-flex items-center gap-2 rounded-full bg-teal-500 px-7 py-3 text-[15px] font-semibold text-white no-underline shadow-[0_10px_24px_-12px_rgb(79_127_114/0.9)] transition hover:bg-teal-400 active:scale-[0.98]";
export const heroGhost = "inline-flex items-center gap-2 rounded-full border border-white/50 px-7 py-3 text-[15px] font-semibold text-white no-underline backdrop-blur-sm transition hover:bg-white/10 active:scale-[0.98]";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-teal-700">{children}</p>;
}

export function CrossSell({ eyebrow, line, href, cta, icon: Icon = ArrowRight }: { eyebrow: string; line: string; href: string; cta: string; icon?: typeof ArrowRight }) {
  return (
    <section className="aq-card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <p className="mt-2 max-w-lg text-[18px] font-bold leading-snug text-ink">{line}</p>
      </div>
      <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-6 py-3 text-[15px] font-semibold text-white no-underline transition hover:bg-navy-600 active:scale-[0.98]">
        {cta} <Icon className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}

export function ClosingCta({ title, body, gradient, glow, children }: { title: string; body: string; gradient: string; glow: string; children: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[22px] bg-navy-900 px-6 py-14 text-center text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-90" style={{ background: gradient }} aria-hidden />
      <div className={`pointer-events-none absolute -z-10 h-64 w-64 rounded-full blur-3xl ${glow}`} aria-hidden />
      <h2 className="mx-auto max-w-xl text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-[15.5px] leading-relaxed text-white/75">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>
    </section>
  );
}

export function PlanBadge({ tone, children }: { tone: "green" | "teal"; children: React.ReactNode }) {
  return (
    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white shadow-sm ${tone === "green" ? "bg-[#2fa865]" : "bg-teal-500"}`}>
      {children}
    </span>
  );
}
