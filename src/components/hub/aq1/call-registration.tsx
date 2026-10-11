import { ArrowUpRight, CalendarCheck } from "lucide-react";
import { btnPrimary } from "@/components/app/form";

/** Registration opens in a new tab; the confirmation email carries the joining link. */
export function CallRegistration({ href }: { href: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={href} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
        <CalendarCheck className="h-4 w-4" aria-hidden /> Register for the weekly call <ArrowUpRight className="h-4 w-4" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <p className="text-[13px] text-dim">Free for every member. Your confirmation email has the joining link.</p>
    </div>
  );
}

export function QuickRegister({ href, topic }: { href: string; topic: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-[13px] font-semibold text-ink no-underline transition-colors hover:border-blue/35 hover:text-blue"
    >
      Register <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">for {topic} (opens in a new tab)</span>
    </a>
  );
}
