import { FORM_DETAILS, type EmailTemplate } from "@/lib/desk-settings/types";

export type DetailSection = { title: string; rows: Array<[string, string]> };
export type EmailAction = { label: string; href: string };
export type RenderedEmail = { subject: string; html: string; text: string; unknownTags: string[] };

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const TAG = /\{([a-z_]+)\}/g;

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

function detailsHtml(sections: DetailSection[]) {
  return sections
    .map((section) => {
      const rows = section.rows.filter(([, value]) => value.trim());
      if (!rows.length) return "";
      return [
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">',
        `<tr><td colspan="2" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(section.title)}</td></tr>`,
        ...rows.map(
          ([label, value]) =>
            `<tr><td width="170" style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:13px;color:#111827;vertical-align:top;white-space:pre-line;">${escapeHtml(value)}</td></tr>`,
        ),
        "</table>",
      ].join("");
    })
    .join("");
}

function detailsText(sections: DetailSection[]) {
  return sections
    .map((section) => {
      const rows = section.rows.filter(([, value]) => value.trim());
      return rows.length ? [section.title.toUpperCase(), ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n") : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function paragraphHtml(block: string, vars: Record<string, string>) {
  const formatted = fill(escapeHtml(block), vars, true).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#111827;">$1</strong>').replace(/\n/g, "<br>");
  return `<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">${formatted}</p>`;
}

function wrap(content: string, year: number) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1e3a5f;padding:24px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Aquifert</td>
<td style="color:#6baa8e;font-size:13px;text-align:right;font-weight:500;">Trading Desk</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 32px 16px;">${content}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">&copy; ${year} Aquifert. All rights reserved.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Turns an admin-written template into a branded email. Blank lines start a new paragraph, **text** is bold,
 * {tags} are filled from the submission and [form-details] becomes the submission table.
 */
export function renderEmail({
  template,
  vars,
  sections,
  action,
  year = new Date().getFullYear(),
}: {
  template: EmailTemplate;
  vars: Record<string, string>;
  sections: DetailSection[];
  action?: EmailAction;
  year?: number;
}): RenderedEmail {
  const subject = tidySubject(fill(template.subject, vars, false));
  const blocks = template.body
    .replace(/\r\n/g, "\n")
    .split(FORM_DETAILS)
    .flatMap((part, index, parts) => [...part.split(/\n{2,}/), ...(index < parts.length - 1 ? [FORM_DETAILS] : [])])
    .map((block) => block.replace(/^\n+|\n+$/g, ""))
    .filter((block) => block.trim());

  const htmlParts = blocks.map((block) => (block === FORM_DETAILS ? detailsHtml(sections) : paragraphHtml(block, vars)));
  const textParts = blocks.map((block) => (block === FORM_DETAILS ? detailsText(sections) : fill(block, vars, false).replace(/\*\*(.+?)\*\*/g, "$1")));
  if (action) {
    htmlParts.push(
      `<p style="margin:8px 0 16px;"><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:10px 20px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;">${escapeHtml(action.label)}</a></p>`,
    );
    textParts.push(`${action.label}: ${action.href}`);
  }
  return { subject, html: wrap(htmlParts.join("\n"), year), text: textParts.join("\n\n"), unknownTags: unknownTags(template, vars) };
}
