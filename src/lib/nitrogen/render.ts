import type { NitrogenBrief } from "@/lib/nitrogen/engine";
import { DEFAULT_DESIGN, fill, visibleSections, type BriefDesign, type BriefSectionKey } from "@/lib/nitrogen/template";

const cell = (value: string) => value.replace(/\|/g, "/");

/** The brief's header lines with the design's wording filled in, shared by the page, the PDF and the Markdown. */
export function briefHeader(b: NitrogenBrief, design: BriefDesign) {
  const values = { partner: b.partner, week: b.week };
  return {
    title: fill(design.title, values),
    subtitle: fill(design.subtitle, values),
    preparedBy: fill(design.preparedBy, values),
    confidential: fill(design.confidential, values),
    disclaimer: fill(design.disclaimer, values),
    footer: fill(design.footer, values),
  };
}

export const sectionHeading = (heading: string, b: NitrogenBrief, product?: string) => fill(heading, { partner: b.partner, week: b.week, product });

/** The brief as Markdown, stored with the report and shown in the admin console. */
export function briefMarkdown(b: NitrogenBrief, design: BriefDesign = DEFAULT_DESIGN): string {
  const head = briefHeader(b, design);
  const blocks: Record<BriefSectionKey, (heading: string) => string[]> = {
    requirement: (heading) => [`## ${sectionHeading(heading, b)}`, ["| Parameter | Value |", "|---|---|", ...b.requirement.map(([name, value]) => `| ${name} | ${cell(value)} |`)].join("\n")],
    pulse: (heading) => [
      `## ${sectionHeading(heading, b)}`,
      [`| Market | ${b.week} View | Signal |`, "|---|---|---|", ...b.pulse.map((row) => `| ${cell(row.market)} | ${cell(row.view)} | ${row.signal} |`)].join("\n"),
    ],
    position: (heading) => [`## ${sectionHeading(heading, b)}`, ...b.position],
    products: (heading) => b.products.flatMap((item) => [`## ${sectionHeading(heading, b, item.name)}`, item.note, item.view]),
    logistics: (heading) => [`## ${sectionHeading(heading, b)}`, ...b.logistics],
    recommendations: (heading) => [`## ${sectionHeading(heading, b)}`, ...b.recommendations.map((item) => `**${item.label}.** ${item.text}`)],
  };
  return [
    `# ${head.title}`,
    [head.subtitle && `**${head.subtitle}**`, head.preparedBy].filter(Boolean).join(" | "),
    [`**${b.week}**`, b.date, `Reference ${b.refNo}`, head.confidential].filter(Boolean).join(" | "),
    head.disclaimer && `*${head.disclaimer}*`,
    ...visibleSections(design).flatMap((section) => blocks[section.key](section.heading)),
    `---`,
    !design.quote.hidden && design.quote.text.trim() ? `*“${design.quote.text.trim()}”${design.quote.source.trim() ? ` ${design.quote.source.trim()}` : ""}*` : "",
    head.footer && `*${head.footer}*`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
