import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";

export type FaqItem = { q: string; a: string };

/** Accessible FAQ accordion, content stays in the DOM for search + AI crawlers. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-[0_2px_4px_rgb(14_32_49/0.06),0_24px_48px_-24px_rgb(37_79_118/0.3)]">
      {items.map((f, i) => (
        <details key={f.q} className="group px-6 py-5 open:bg-muted/40 sm:px-8" name="faq">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-navy-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
            <span>
              <span className="mr-3 font-data text-sm font-bold text-teal-600 dark:text-teal-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              {f.q}
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 group-open:rotate-180 dark:text-slate-400" />
          </summary>
          <p className="mt-3 max-w-3xl pl-9 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Builds FAQPage structured data from the same items that render on screen. */
export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Section header pattern shared by marketing pages. */
export function SectionHeader({
  kicker,
  title,
  sub,
  center = false,
}: {
  kicker: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "text-center" : ""}>
      <p className="text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">{kicker}</p>
      <h2 className={`mt-2 text-3xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-4xl ${center ? "mx-auto max-w-3xl text-balance" : ""}`}>
        {title}
      </h2>
      {sub && (
        <p className={`mt-4 leading-relaxed text-slate-700 dark:text-slate-300 ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
          {sub}
        </p>
      )}
    </Reveal>
  );
}
