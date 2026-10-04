import { HedgeMatrix } from "@/components/hub/hedge-matrix";
import { splitParagraphs, type HedgeReport, type HedgeSection } from "@/lib/content-types";

const UREA_FIRST = (a: HedgeSection, b: HedgeSection) => Number(/urea/i.test(b.label)) - Number(/urea/i.test(a.label));

export function PaperForwardBrief({ reports, className = "" }: { reports: HedgeReport[]; className?: string }) {
  const report = reports[0];
  if (!report) return null;
  const paragraphs = splitParagraphs(report.narrative);
  const sections = [...report.sections].sort(UREA_FIRST);

  return (
    <section aria-labelledby="hedge-title" className={`aq-card flex min-w-0 flex-col overflow-hidden ${className}`}>
      <header className="shrink-0 border-b border-border px-5 py-3.5">
        <h2 id="hedge-title" className="text-[16.5px] font-semibold text-ink">
          Direct Hedge
        </h2>
        <p className="font-mono text-[12px] uppercase tracking-wide text-dim">Paper forward curves</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <HedgeMatrix sections={sections} fit />
        {paragraphs.length ? (
          <div className="space-y-3 border-t border-border px-5 py-4">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
