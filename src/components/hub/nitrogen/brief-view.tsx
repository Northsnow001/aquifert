import Image from "next/image";
import type { CSSProperties } from "react";
import type { NitrogenBrief, PulseSignal } from "@/lib/nitrogen/engine";
import { briefHeader, sectionHeading } from "@/lib/nitrogen/render";
import { DEFAULT_DESIGN, textScale, visibleSections, type BriefDesign, type BriefSectionKey } from "@/lib/nitrogen/template";

const SIGNAL_TONE: Record<Exclude<PulseSignal, "Firm">, string> = {
  Balanced: "bg-s3 text-mid",
  Soft: "bg-blue-light text-blue",
  Watch: "bg-[#fff4de] text-[#9a5b00]",
};

type Colors = BriefDesign["colors"];

function Section({ title, colors, children }: { title: string; colors: Colors; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h3 className="mb-4 border-b-2 pb-1.5 text-[13.5px] font-extrabold uppercase tracking-[0.12em]" style={{ borderColor: colors.accent, color: colors.header }}>
        {title}
      </h3>
      <div className="flex flex-col gap-3 text-[15.5px] leading-relaxed" style={{ color: colors.body }}>
        {children}
      </div>
    </section>
  );
}

function Table({ head, rows, colors, firstCol = "w-[34%]" }: { head: string[]; rows: React.ReactNode[][]; colors: Colors; firstCol?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[420px] border-collapse text-left text-[14.5px]">
        <thead className="text-white [print-color-adjust:exact]" style={{ background: colors.header }}>
          <tr>
            {head.map((cell, index) => (
              <th key={cell} scope="col" className={`px-4 py-2.5 text-[12.5px] font-bold uppercase tracking-[0.08em] ${index === 0 ? firstCol : ""}`}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border align-top [print-color-adjust:exact]" style={index % 2 ? { background: colors.accentLight } : undefined}>
              {row.map((cell, column) => (
                <td key={column} className={`px-4 py-2.5 ${column === 0 ? "font-semibold" : ""}`} style={{ color: column === 0 ? colors.header : colors.body }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The desk's voice: an accent label beside italic commentary, one box per point. */
function AqView({ items, label, colors }: { items: { label?: string; text: string }[]; label: string; colors: Colors }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[56px_minmax(0,1fr)] overflow-hidden rounded-lg [print-color-adjust:exact] sm:grid-cols-[76px_minmax(0,1fr)]">
          <span
            className="flex items-center justify-center px-1 text-center text-[10.5px] font-extrabold uppercase leading-tight tracking-[0.1em] text-white sm:text-[11px]"
            style={{ background: colors.accent }}
          >
            {label}
          </span>
          <p className="px-4 py-3 text-[15px] italic leading-relaxed" style={{ background: colors.accentLight, color: colors.header }}>
            {item.label ? <strong className="font-bold not-italic">{item.label}. </strong> : null}
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BriefView({ brief, design = DEFAULT_DESIGN }: { brief: NitrogenBrief; design?: BriefDesign }) {
  const { colors } = design;
  const head = briefHeader(brief, design);
  const label = design.viewLabel.trim() || DEFAULT_DESIGN.viewLabel;

  const blocks: Record<BriefSectionKey, (heading: string) => React.ReactNode> = {
    requirement: (heading) => (
      <Section key="requirement" title={sectionHeading(heading, brief)} colors={colors}>
        <Table head={["Parameter", "Value"]} rows={brief.requirement.map(([name, value]) => [name, value])} colors={colors} />
      </Section>
    ),
    pulse: (heading) => (
      <Section key="pulse" title={sectionHeading(heading, brief)} colors={colors}>
        <Table
          head={["Market", `${brief.week} View`, "Signal"]}
          firstCol="w-[24%]"
          colors={colors}
          rows={brief.pulse.map((row) => [
            row.market,
            row.view,
            <span
              key="signal"
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-bold [print-color-adjust:exact] ${row.signal === "Firm" ? "text-white" : SIGNAL_TONE[row.signal]}`}
              style={row.signal === "Firm" ? { background: colors.accent } : undefined}
            >
              {row.signal}
            </span>,
          ])}
        />
      </Section>
    ),
    position: (heading) => (
      <Section key="position" title={sectionHeading(heading, brief)} colors={colors}>
        <AqView items={brief.position.map((text) => ({ text }))} label={label} colors={colors} />
      </Section>
    ),
    products: (heading) =>
      brief.products.map((item) => (
        <Section key={`product-${item.name}`} title={sectionHeading(heading, brief, item.name)} colors={colors}>
          <p>{item.note}</p>
          <p>{item.view}</p>
        </Section>
      )),
    logistics: (heading) => (
      <Section key="logistics" title={sectionHeading(heading, brief)} colors={colors}>
        {brief.logistics.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </Section>
    ),
    recommendations: (heading) => (
      <Section key="recommendations" title={sectionHeading(heading, brief)} colors={colors}>
        <AqView items={brief.recommendations} label={label} colors={colors} />
      </Section>
    ),
  };

  const quote = !design.quote.hidden && design.quote.text.trim() ? design.quote : null;

  return (
    <article className="aq-card mx-auto w-full max-w-4xl overflow-hidden print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <header className="px-6 pb-6 pt-5 text-white [print-color-adjust:exact] sm:px-10 sm:pb-7" style={{ background: colors.header }}>
        <div className="flex items-center justify-between gap-4">
          {design.showLogo ? <Image src="/brand/logo-v2-light.png" alt="Aquifert" width={814} height={214} className="h-7 w-auto sm:h-8" /> : <span />}
          <p className="font-mono text-[13px] font-semibold text-white/80">{brief.refNo}</p>
        </div>
        <h2 className="mt-6 text-[22px] font-extrabold leading-tight tracking-[-0.01em] sm:text-[27px]">
          {head.title.split(" | ").map((part, index) => (
            <span key={index}>
              {index ? (
                <span className="font-normal" style={{ color: colors.accent }}>
                  {" | "}
                </span>
              ) : null}
              {part}
            </span>
          ))}
        </h2>
        {head.subtitle || head.preparedBy ? (
          <p className="mt-2 text-[15px] text-white/90">
            {head.subtitle ? <strong className="font-semibold">{head.subtitle}</strong> : null}
            {head.subtitle && head.preparedBy ? <span className="text-white/50"> | </span> : null}
            {head.preparedBy}
          </p>
        ) : null}
        <p className="mt-1 text-[13.5px] text-white/65">
          <strong className="font-semibold text-white/85">{brief.week}</strong> | {brief.date}
          {head.confidential ? ` | ${head.confidential}` : ""}
        </p>
      </header>
      {head.disclaimer ? (
        <p className="border-b border-black/5 px-6 py-2.5 text-[13.5px] italic leading-snug [print-color-adjust:exact] sm:px-10" style={{ background: colors.notice, color: colors.noticeText }}>
          {head.disclaimer}
        </p>
      ) : null}

      <div className="flex flex-col gap-9 px-6 py-8 sm:px-10 sm:py-10" style={{ zoom: textScale(design) } as CSSProperties}>
        {visibleSections(design).map((section) => blocks[section.key](section.heading))}

        {quote || head.footer ? (
          <footer className="flex flex-col items-center gap-4 border-t border-border pt-7 text-center">
            {quote ? (
              <blockquote className="max-w-xl text-[15px] italic leading-relaxed" style={{ color: colors.body }}>
                &ldquo;{quote.text.trim()}&rdquo;
                {quote.source.trim() ? (
                  <cite className="mt-1 block text-[13.5px] not-italic" style={{ color: colors.muted }}>
                    {quote.source.trim()}
                  </cite>
                ) : null}
              </blockquote>
            ) : null}
            {head.footer ? (
              <p className="text-[12.5px]" style={{ color: colors.muted }}>
                {head.footer}
              </p>
            ) : null}
          </footer>
        ) : null}
      </div>
    </article>
  );
}
