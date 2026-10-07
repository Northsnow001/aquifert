import { brandedHtml, brandedText, escapeHtml, type BrandedEmail, type DetailSection, type EmailBlock } from "@/lib/email/brand";
import { FORM_DETAILS, type EmailTemplate } from "@/lib/desk-settings/types";

export type { DetailSection } from "@/lib/email/brand";
export type EmailAction = { label: string; href: string };
export type RenderedEmail = { subject: string; html: string; text: string; unknownTags: string[] };

/** The parts of the branded frame that come from the form rather than the admin-written template. */
export type EmailFrame = {
  preheader: string;
  tagline: string;
  eyebrow: string;
  /** Used when the template has no `# headline` line. */
  heading: string;
  footerNote: string;
  detailsTitle?: string;
  deskEmail?: string;
  signature?: boolean;
  buttonTone?: "navy" | "teal";
};

const DEFAULT_FRAME: EmailFrame = {
  preheader: "",
  tagline: "Transparent Global Fertiliser Access",
  eyebrow: "Aquifert",
  heading: "",
  footerNote: "This is an automated message from Aquifert.",
};

const TAG = /\{([a-z_]+)\}/g;
const STEP = /^\s*\d+[.)]\s+/;

function fill(text: string, vars: Record<string, string>, escape: boolean) {
  return text.replace(TAG, (whole, key: string) => (key in vars ? (escape ? escapeHtml(vars[key]) : vars[key]) : escape ? escapeHtml(whole) : whole));
}

/** Tags written in the template that the form does not provide. */
export function unknownTags(template: EmailTemplate, vars: Record<string, string>) {
  const found = new Set<string>();
  for (const text of [template.subject, template.body]) for (const match of text.matchAll(TAG)) if (!(match[1] in vars)) found.add(match[1]);
  return [...found];
}

/** Drops separators left dangling when a tag such as {user_company} is empty. */
function tidySubject(subject: string) {
  const pieces = subject.replace(/\s+/g, " ").trim().split(/(\s*[—–|·]\s*)/);
  const kept: string[] = [];
  for (let index = 0; index < pieces.length; index += 2) {
    const text = pieces[index].trim();
    if (!text) continue;
    if (kept.length) kept.push(` ${pieces[index - 1].trim()} `);
    kept.push(text);
  }
  return kept.join("");
}

const formatted = (text: string, vars: Record<string, string>) =>
  fill(escapeHtml(text), vars, true)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#16304D;">$1</strong>')
    .replace(/\n/g, "<br>");

const isSteps = (lines: string[]) => lines.length > 0 && lines.every((line) => STEP.test(line));

/**
 * Turns an admin-written template into a branded email. Blank lines start a new paragraph, **text** is bold,
 * `# ` starts the headline, `## Title` followed by numbered lines becomes a steps box, {tags} are filled from
 * the submission and [form-details] becomes the submission card.
 */
export function renderEmail({
  template,
  vars,
  sections,
  action,
  frame: frameInput,
}: {
  template: EmailTemplate;
  vars: Record<string, string>;
  sections: DetailSection[];
  action?: EmailAction;
  frame?: Partial<EmailFrame>;
  /** Kept for callers that still pass it; the frame no longer prints a year. */
  year?: number;
}): RenderedEmail {
  const frame = { ...DEFAULT_FRAME, ...frameInput };
  const subject = tidySubject(fill(template.subject, vars, false));
  const parts = template.body
    .replace(/\r\n/g, "\n")
    .split(FORM_DETAILS)
    .flatMap((part, index, all) => [...part.split(/\n{2,}/), ...(index < all.length - 1 ? [FORM_DETAILS] : [])])
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.trim());

  let heading = "";
  let pendingTitle: string | null = null;
  const blocks: EmailBlock[] = [];
  const flushTitle = () => {
    if (pendingTitle) blocks.push({ kind: "text", html: `<strong style="color:#16304D;">${formatted(pendingTitle, vars)}</strong>` });
    pendingTitle = null;
  };

  for (const part of parts) {
    if (part === FORM_DETAILS) {
      flushTitle();
      blocks.push({ kind: "details", title: frame.detailsTitle, sections });
      continue;
    }
    let lines = part.split("\n");
    if (!heading && lines[0].startsWith("# ")) {
      heading = fill(lines[0].slice(2).trim(), vars, false).replace(/\*\*/g, "");
      lines = lines.slice(1);
      if (!lines.some((line) => line.trim())) continue;
    }
    if (lines[0].startsWith("## ")) {
      flushTitle();
      pendingTitle = lines[0].slice(3).trim();
      lines = lines.slice(1);
      if (!lines.some((line) => line.trim())) continue;
    }
    if (isSteps(lines)) {
      blocks.push({ kind: "steps", title: pendingTitle ? fill(pendingTitle, vars, false) : "", items: lines.map((line) => formatted(line.replace(STEP, ""), vars)) });
      pendingTitle = null;
      continue;
    }
    flushTitle();
    blocks.push({ kind: "text", html: formatted(lines.join("\n"), vars) });
  }
  flushTitle();

  if (action) {
    const button: EmailBlock = { kind: "button", label: action.label, href: action.href, tone: frame.buttonTone };
    const last = blocks.at(-1);
    if (last?.kind === "text" && blocks.some((block) => block.kind === "steps")) blocks.splice(blocks.length - 1, 1, button, { kind: "note", html: last.html });
    else blocks.push(button);
  }

  const signs = /\b(regards|sincerely|thanks,|cheers)\b/i.test(template.body);
  const email: BrandedEmail = {
    title: subject,
    preheader: frame.preheader || subject,
    tagline: frame.tagline,
    eyebrow: frame.eyebrow,
    heading: heading || frame.heading || subject,
    blocks,
    footerNote: frame.footerNote,
    deskEmail: frame.deskEmail,
    signature: frame.signature !== false && !signs,
  };
  return { subject, html: brandedHtml(email), text: brandedText(email), unknownTags: unknownTags(template, vars) };
}
