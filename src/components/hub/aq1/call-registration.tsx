import { ArrowUpRight, CalendarClock } from "lucide-react";
import { btnPrimary } from "@/components/app/form";
import { calendlyLink } from "@/lib/calendly";

const CAMPAIGN = "weekly-market-call";

const callLink = (name: string, email: string, topic: string) => calendlyLink({ name, email, campaign: CAMPAIGN, content: topic.slice(0, 80) });

/** Places on the Weekly Market Call are booked in Calendly, which emails the invite and the joining link. */
export function CallRegistration({ name, email, topic }: { name: string; email: string; topic: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={callLink(name, email, topic)} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
        <CalendarClock className="h-4 w-4" aria-hidden /> Register on Calendly <ArrowUpRight className="h-4 w-4" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <p className="text-[13px] text-dim">Free for every member. Calendly emails you the invite and joining link.</p>
    </div>
  );
}

export function QuickRegister({ name, email, topic }: { name: string; email: string; topic: string }) {
  return (
    <a
      href={callLink(name, email, topic)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-[13px] font-semibold text-ink no-underline transition-colors hover:border-blue/35 hover:text-blue"
    >
      Register <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">for {topic} on Calendly (opens in a new tab)</span>
    </a>
  );
}
