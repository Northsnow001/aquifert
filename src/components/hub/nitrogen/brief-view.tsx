import Image from "next/image";
import type { CSSProperties } from "react";
import type { NitrogenBrief, PulseSignal } from "@/lib/nitrogen/engine";
import { briefHeader, callItems, hasPriorRead, productParagraphs, sectionHasContent, sectionHeading } from "@/lib/nitrogen/render";
import { DEFAULT_DESIGN, textScale, visibleSections, type BriefDesign, type BriefSectionKey } from "@/lib/nitrogen/template";

const SIGNAL_TONE: Record<Exclude<PulseSignal, "Firm">, string> = {
  Balanced: "bg-s3 text-mid",
  Soft: "bg-blue-light text-blue",
  Watch: "bg-[#fff4de] text-[#9a5b00]",
};

const SIGNAL_DOT: Record<Exclude<PulseSignal, "Firm">, string> = {
  Balanced: "#94a3b8",
  Soft: "#2f6fb3",
  Watch: "#d08a00",
};

type Colors = BriefDesign["colors"];

function Section({ title, colors, children }: { title: string; colors: Colors; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h3 className="mb-3 border-b-[1.5px] pb-1 text-[13px] font-extrabold uppercase tracking-[0.1em]" style={{ borderColor: colors.accent, color: colors.header }}>
        {title}
      </h3>
      <div className="flex flex-col gap-2.5 text-[15px] leading-[1.65] hyphens-auto sm:text-justify" style={{ color: colors.body }}>
        {children}
      </div>
    </section>
  );
}

function Table({ head, rows, colors, widths }: { head: string[]; rows: React.ReactNode[][]; colors: Colors; widths: string[] }) {
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[560px] table-fixed border-collapse text-left text-[13.5px] leading-snug">
        <colgroup>
          {widths.map((width, index) => (
            <col key={index} style={{ width }} />
          ))}
        </colgroup>
        <thead className="text-white [print-color-adjust:exact]" style={{ background: colors.header }}>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-3 py-2 text-[13px] font-bold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border align-top [print-color-adjust:exact]" style={index % 2 ? { background: colors.accentLight } : undefined}>
              {row.map((cell, column) => (
                <td key={column} className="px-3 py-2 text-left" style={{ color: column === 0 ? colors.header : colors.body }}>
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

function Signal({ signal, read, colors }: { signal: PulseSignal; read?: string; colors: Colors }) {
  if (read) {
    return (
      <span className="flex gap-2">
        <span aria-hidden className="mt-[0.45em] h-2 w-2 shrink-0 rounded-full [print-color-adjust:exact]" style={{ background: signal === "Firm" ? colors.accent : SIGNAL_DOT[signal] }} />
        <span>
          <span className="sr-only">{signal}: </span>
          {read}
        </span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-bold [print-color-adjust:exact] ${signal === "Firm" ? "text-white" : SIGNAL_TONE[signal]}`}
      style={signal === "Firm" ? { background: colors.accent } : undefined}
    >
      {signal}
    </span>
  );
}

/** The desk's voice: an accent label beside italic commentary. */
function AqView({ items, label, colors }: { items: { label?: string; text: string }[]; label: string; colors: Colors }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[56px_minmax(0,1fr)] overflow-hidden [print-color-adjust:exact] sm:grid-cols-[84px_minmax(0,1fr)]">
          <span
            className="flex items-center justify-center px-1 text-center text-[10.5px] font-extrabold uppercase leading-tight tracking-[0.1em] text-white sm:text-[11.5px]"
            style={{ background: colors.accent }}
          >
            {label}
          </span>
          <p className="px-4 py-3 text-[15px] italic leading-[1.6] sm:text-justify" style={{ background: colors.accentLight, color: colors.header }}>
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
  const prior = hasPriorRead(brief);

  const blocks: Record<BriefSectionKey, (heading: string) => React.ReactNode> = {
    pulse: (heading) => (
      <Section key="pulse" title={sectionHeading(heading, brief)} colors={colors}>
        <Table
          head={prior ? ["Driver", "Prior read", "This week", "Signal"] : ["Market", `${brief.week} View`, "Signal"]}
          widths={prior ? ["17%", "30%", "33%", "20%"] : ["22%", "60%", "18%"]}
          colors={colors}
          rows={brief.pulse.map((row) => [
            row.market,
            ...(prior ? [row.prior ?? ""] : []),
            row.view,
            <Signal key="signal" signal={row.signal} read={row.read} colors={colors} />,
          ])}
        />
      </Section>
    ),
    products: (heading) =>
      brief.products.map((item) => (
        <Section key={`product-${item.name}`} title={sectionHeading(heading, brief, item.name)} colors={colors}>
          {productParagraphs(item).map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </Section>
      )),
    macro: (heading) => (
      <Section key="macro" title={sectionHeading(heading, brief)} colors={colors}>
        {(brief.macro ?? []).map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </Section>
    ),
    position: (heading) => (
      <Section key="position" title={sectionHeading(heading, brief)} colors={colors}>
        {brief.position.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </Section>
    ),
    logistics: (heading) => (
      <Section key="logistics" title={sectionHeading(heading, brief)} colors={colors}>
        {brief.logistics.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </Section>
    ),
    call: (heading) => (
      <Section key="call" title={sectionHeading(heading, brief)} colors={colors}>
        <AqView items={callItems(brief)} label={label} colors={colors} />
        {brief.risk ? <p className="mt-1">{brief.risk}</p> : null}
      </Section>
    ),
    requirement: (heading) => (
      <Section key="requirement" title={sectionHeading(heading, brief)} colors={colors}>
        <Table head={["Parameter", "Value"]} widths={["34%", "66%"]} rows={brief.requirement.map(([name, value]) => [name, value])} colors={colors} />
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
          {design.showLogo ? (
            <Image src="/brand/logo-v2-light.png" alt="Aquifert" width={814} height={214} className="h-7 w-auto sm:h-8" />
          ) : (
            <p className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.accent }}>
              Aquifert ONE Hub
            </p>
          )}
          <p className="font-mono text-[13px] font-semibold text-white/70">{brief.refNo}</p>
        </div>
        <h2 className="mt-4 text-[21px] font-extrabold leading-tight tracking-[-0.005em] sm:text-[25px]">
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
          <p className="mt-1.5 text-[15px] text-white/85">
            {head.subtitle ? <span>{head.subtitle}</span> : null}
            {head.subtitle && head.preparedBy ? <span className="text-white/50"> | </span> : null}
            {head.preparedBy}
          </p>
        ) : null}
        <p className="mt-1 text-[13px] text-white/60">
          {brief.week} | {brief.date}
          {head.confidential ? ` | ${head.confidential}` : ""}
        </p>
      </header>
      {head.disclaimer ? (
        <p className="border-b border-black/5 px-6 py-2 text-[13px] italic leading-snug [print-color-adjust:exact] sm:px-10" style={{ background: colors.notice, color: colors.noticeText }}>
          {head.disclaimer}
        </p>
      ) : null}

      <div className="flex flex-col gap-7 px-6 py-7 sm:px-10 sm:py-8" style={{ zoom: textScale(design) } as CSSProperties}>
        {visibleSections(design)
          .filter((section) => sectionHasContent(section.key, brief, design))
          .map((section) => blocks[section.key](section.heading))}

        {quote || head.footer ? (
          <footer className="flex flex-col items-center gap-4 border-t border-border pt-6 text-center">
            {quote ? (
              <blockquote className="max-w-xl text-[14.5px] italic leading-relaxed" style={{ color: colors.muted }}>
                &ldquo;{quote.text.trim()}&rdquo;
                {quote.source.trim() ? <cite className="mt-1 block text-[13.5px]">{quote.source.trim()}</cite> : null}
              </blockquote>
            ) : null}
            {head.footer ? (
              <p className="w-full border-t-[1.5px] pt-2 text-left text-[12.5px] italic" style={{ color: colors.muted, borderColor: colors.accent }}>
                {head.footer}
              </p>
            ) : null}
          </footer>
        ) : null}
      </div>
    </article>
  );
}
