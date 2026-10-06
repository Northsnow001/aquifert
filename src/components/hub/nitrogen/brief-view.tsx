import Image from "next/image";
import { BRIEF_FOOTER, BRIEF_QUOTE, type NitrogenBrief, type PulseSignal } from "@/lib/nitrogen/engine";

const SIGNAL_TONE: Record<PulseSignal, string> = {
  Firm: "bg-teal-600 text-white",
  Balanced: "bg-s3 text-mid",
  Soft: "bg-blue-light text-blue",
  Watch: "bg-[#fff4de] text-[#9a5b00]",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <h3 className="mb-4 border-b-2 border-teal-500 pb-1.5 text-[13.5px] font-extrabold uppercase tracking-[0.12em] text-ink">{title}</h3>
      <div className="flex flex-col gap-3 text-[15.5px] leading-relaxed text-mid">{children}</div>
    </section>
  );
}

function Table({ head, rows, firstCol = "w-[34%]" }: { head: string[]; rows: React.ReactNode[][]; firstCol?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[420px] border-collapse text-left text-[14.5px]">
        <thead className="bg-navy-800 text-white [print-color-adjust:exact]">
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
            <tr key={index} className={`border-t border-border align-top [print-color-adjust:exact] ${index % 2 ? "bg-teal-50/70" : ""}`}>
              {row.map((cell, column) => (
                <td key={column} className={`px-4 py-2.5 ${column === 0 ? "font-semibold text-ink" : "text-mid"}`}>
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

/** The desk's voice: a teal AQ VIEW label beside italic commentary, one box per point. */
function AqView({ items }: { items: { label?: string; text: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[56px_minmax(0,1fr)] overflow-hidden rounded-lg [print-color-adjust:exact] sm:grid-cols-[76px_minmax(0,1fr)]">
          <span className="flex items-center justify-center bg-teal-600 px-1 text-center text-[10.5px] font-extrabold uppercase leading-tight tracking-[0.1em] text-white sm:text-[11px]">AQ View</span>
          <p className="bg-teal-50 px-4 py-3 text-[15px] italic leading-relaxed text-ink">
            {item.label ? <strong className="font-bold not-italic">{item.label}. </strong> : null}
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BriefView({ brief }: { brief: NitrogenBrief }) {
  return (
    <article className="aq-card mx-auto w-full max-w-4xl overflow-hidden print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <header className="bg-navy-800 px-6 pb-6 pt-5 text-white [print-color-adjust:exact] sm:px-10 sm:pb-7">
        <div className="flex items-center justify-between gap-4">
          <Image src="/brand/logo-v2-light.png" alt="Aquifert" width={814} height={214} className="h-7 w-auto sm:h-8" />
          <p className="font-mono text-[13px] font-semibold text-white/80">{brief.refNo}</p>
        </div>
        <h2 className="mt-6 text-[22px] font-extrabold leading-tight tracking-[-0.01em] sm:text-[27px]">
          AQ VIEW SPECIAL EDITION <span className="font-normal text-teal-300">|</span> Nitrogen Brief
        </h2>
        <p className="mt-2 text-[15px] text-white/90">
          <strong className="font-semibold">{brief.partner} Partnership Intelligence</strong> <span className="text-white/50">|</span> Prepared by the Aquifert Trading Desk
        </p>
        <p className="mt-1 text-[13.5px] text-white/65">
          <strong className="font-semibold text-white/85">{brief.week}</strong> | {brief.date} | Confidential. Not for redistribution.
        </p>
      </header>
      <p className="border-b border-[#f3e3b0] bg-[#fff8e1] px-6 py-2.5 text-[13.5px] italic leading-snug text-[#8a6508] [print-color-adjust:exact] sm:px-10">{brief.disclaimer}</p>

      <div className="flex flex-col gap-9 px-6 py-8 sm:px-10 sm:py-10">
        <Section title="Supply Requirement">
          <Table head={["Parameter", "Value"]} rows={brief.requirement.map(([name, value]) => [name, value])} />
        </Section>

        <Section title={`Market Pulse | ${brief.week}`}>
          <Table
            head={["Market", `${brief.week} View`, "Signal"]}
            firstCol="w-[24%]"
            rows={brief.pulse.map((row) => [
              row.market,
              row.view,
              <span key="signal" className={`inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-bold [print-color-adjust:exact] ${SIGNAL_TONE[row.signal]}`}>
                {row.signal}
              </span>,
            ])}
          />
        </Section>

        <Section title="The Position">
          <AqView items={brief.position.map((text) => ({ text }))} />
        </Section>

        {brief.products.map((item) => (
          <Section key={item.name} title={item.name}>
            <p>{item.note}</p>
            <p>{item.view}</p>
          </Section>
        ))}

        <Section title="Logistics and Shipment Plan">
          {brief.logistics.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </Section>

        <Section title="Recommendations">
          <AqView items={brief.recommendations} />
        </Section>

        <footer className="flex flex-col items-center gap-4 border-t border-border pt-7 text-center">
          <blockquote className="max-w-xl text-[15px] italic leading-relaxed text-mid">
            &ldquo;{BRIEF_QUOTE.text}&rdquo;
            <cite className="mt-1 block text-[13.5px] not-italic text-dim">{BRIEF_QUOTE.source}</cite>
          </blockquote>
          <p className="text-[12.5px] text-dim">{BRIEF_FOOTER}</p>
        </footer>
      </div>
    </article>
  );
}
