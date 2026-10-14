import type { NitrogenBrief } from "@/lib/nitrogen/engine";
import { DEFAULT_DESIGN, fill, visibleSections, type BriefDesign, type BriefSectionKey } from "@/lib/nitrogen/template";

const cell = (value: string) => value.replace(/\|/g, "/");

/** With no company on the brief, {partner} is dropped from labels and reads "the member" in sentences, never a person's name. */
const withPartner = (text: string, b: NitrogenBrief, standIn = "") =>
  b.partner.trim() ? text : text.replace(/\{partner\}\s*/g, standIn ? `${standIn} ` : "").replace(/\s+([.,;:])/g, "$1").trim();

/** The brief's header lines with the design's wording filled in, shared by the page, the PDF and the Markdown. */
export function briefHeader(b: NitrogenBrief, design: BriefDesign) {
  const values = { partner: b.partner, week: b.week };
  return {
    title: fill(withPartner(design.title, b), values),
    subtitle: fill(withPartner(design.subtitle, b), values),
    preparedBy: fill(withPartner(design.preparedBy, b), values),
    confidential: fill(withPartner(design.confidential, b), values),
    disclaimer: fill(withPartner(design.disclaimer, b, "the member"), values),
    footer: fill(withPartner(design.footer, b), values),
  };
}

export const sectionHeading = (heading: string, b: NitrogenBrief, product?: string) => fill(withPartner(heading, b), { partner: b.partner, week: b.week, product });

/** True when the pulse carries the AI's week-on-week drivers rather than one row per product. */
export const hasPriorRead = (b: NitrogenBrief) => b.pulse.some((row) => row.prior);

/** The pulse as table rows: Driver, Prior read, This week, Signal; or Market, view, Signal on older briefs. */
export function pulseTable(b: NitrogenBrief) {
  const prior = hasPriorRead(b);
  return {
    head: prior ? ["Driver", "Prior read", "This week", "Signal"] : ["Market", `${b.week} View`, "Signal"],
    rows: b.pulse.map((row) => (prior ? [row.market, row.prior ?? "", row.view, row.read || row.signal] : [row.market, row.view, row.read || row.signal])),
  };
}

/** A product's commentary: the AI's paragraphs, or the desk note and view. */
export const productParagraphs = (item: NitrogenBrief["products"][number]) => (item.paragraphs?.length ? item.paragraphs : [item.note, item.view].filter(Boolean));

/** The AQ View boxes under The call. Briefs written before the call existed show their recommendations there instead. */
export const callItems = (b: NitrogenBrief): { label?: string; text: string }[] => (b.call ? [{ text: b.call }] : b.recommendations);

/** Whether a section has anything to show for this brief. */
export function sectionHasContent(key: BriefSectionKey, b: NitrogenBrief, design: BriefDesign) {
  if (key === "macro") return Boolean(b.macro?.length);
  if (key === "call") return Boolean(b.call) || (b.recommendations.length > 0 && !visibleSections(design).some((section) => section.key === "recommendations"));
  return true;
}

/** The brief as Markdown, stored with the report and shown in the admin console. */
export function briefMarkdown(b: NitrogenBrief, design: BriefDesign = DEFAULT_DESIGN): string {
  const head = briefHeader(b, design);
  const blocks: Record<BriefSectionKey, (heading: string) => string[]> = {
    requirement: (heading) => [`## ${sectionHeading(heading, b)}`, ["| Parameter | Value |", "|---|---|", ...b.requirement.map(([name, value]) => `| ${name} | ${cell(value)} |`)].join("\n")],
    pulse: (heading) => {
      const { head, rows } = pulseTable(b);
      return [
        `## ${sectionHeading(heading, b)}`,
        [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n"),
      ];
    },
    position: (heading) => [`## ${sectionHeading(heading, b)}`, ...b.position],
    products: (heading) => b.products.flatMap((item) => [`## ${sectionHeading(heading, b, item.name)}`, ...productParagraphs(item)]),
    macro: (heading) => [`## ${sectionHeading(heading, b)}`, ...(b.macro ?? [])],
    logistics: (heading) => [`## ${sectionHeading(heading, b)}`, ...b.logistics],
    call: (heading) => [
      `## ${sectionHeading(heading, b)}`,
      ...callItems(b).map((item) => `> **${item.label ?? (design.viewLabel.trim() || DEFAULT_DESIGN.viewLabel)}.** *${item.text}*`),
      b.risk ?? "",
    ],
    recommendations: (heading) => [`## ${sectionHeading(heading, b)}`, ...b.recommendations.map((item) => `**${item.label}.** ${item.text}`)],
  };
  return [
    `# ${head.title}`,
    [head.subtitle && `**${head.subtitle}**`, head.preparedBy].filter(Boolean).join(" | "),
    [`**${b.week}**`, b.date, `Reference ${b.refNo}`, head.confidential].filter(Boolean).join(" | "),
    head.disclaimer && `*${head.disclaimer}*`,
    ...visibleSections(design)
      .filter((section) => sectionHasContent(section.key, b, design))
      .flatMap((section) => blocks[section.key](section.heading)),
    `---`,
    !design.quote.hidden && design.quote.text.trim() ? `*“${design.quote.text.trim()}”${design.quote.source.trim() ? ` ${design.quote.source.trim()}` : ""}*` : "",
    head.footer && `*${head.footer}*`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
