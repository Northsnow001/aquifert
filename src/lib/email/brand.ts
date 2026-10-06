export type DetailSection = { title: string; rows: Array<[string, string]> };

export type EmailBlock =
  /** Already-escaped inline HTML; use `inline()` to build it. */
  | { kind: "text"; html: string }
  | { kind: "details"; title?: string; sections: DetailSection[] }
  | { kind: "steps"; title: string; items: string[] }
  | { kind: "button"; label: string; href: string; tone?: "navy" | "teal" }
  | { kind: "note"; html: string }
  | { kind: "callout"; html: string }
  | { kind: "code"; code: string; label?: string };

export type BrandedEmail = {
  title: string;
  /** Inbox preview line. */
  preheader: string;
  /** Strap line under the logo. */
  tagline: string;
  eyebrow: string;
  heading: string;
  blocks: EmailBlock[];
  /** Why the reader got this email; the last line of the footer. */
  footerNote: string;
  deskEmail?: string;
  signature?: boolean;
};

export const DESK_EMAIL = "noreply@aquifert.com";
export const SITE_URL = "https://aquifert.com";
/** Emails load the logo from the app host, which serves /brand; aquifert.com does not. */
export const EMAIL_ASSET_ORIGIN = "https://ghfttgtoajfgzwthaggh.supabase.co/storage/v1/object/public/logo";
const ADDRESS = "Aquifert Ltd · 71-75 Shelton Street, London WC2H 9JQ";

const C = {
  page: "#EEF2F6",
  navy: "#16304D",
  navyDeep: "#10253C",
  teal: "#4F7F72",
  tealBright: "#8FB8A8",
  tealSoft: "#EEF4F2",
  tealLine: "#D3E2DD",
  ink: "#16304D",
  body: "#44586C",
  muted: "#7A8CA0",
  line: "#E4EAEF",
  footer: "#9FB3C8",
  footerDim: "#6E839B",
};

const SANS = "Arial,Helvetica,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Escapes text, turning `**bold**` into strong text and line breaks into <br>. */
export const inline = (text: string) =>
  escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.ink};">$1</strong>`)
    .replace(/\n/g, "<br>");

export const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1");

const stripTags = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Short, readable reference such as AQ-R-7K2M9Q: R for trading requirements, C for contact messages. */
export const emailReference = (prefix: "R" | "C") =>
  `AQ-${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;

const row = (content: string, padding: string) => `<tr><td class="aq-px" style="padding:${padding};">${content}</td></tr>`;

function detailsHtml(block: Extract<EmailBlock, { kind: "details" }>) {
  const sections = block.sections.map((section) => ({ ...section, rows: section.rows.filter(([, value]) => value.trim()) })).filter((section) => section.rows.length);
  if (!sections.length) return "";
  const titled = sections.length > 1 || !block.title;
  const body = sections
    .map((section, index) => {
      const head = titled
        ? `<tr><td colspan="2" style="padding:${index ? "18px" : "0"} 0 8px; font-family:${SANS}; font-size:11px; font-weight:bold; letter-spacing:1.6px; text-transform:uppercase; color:${C.teal};">${escapeHtml(section.title)}</td></tr>`
        : "";
      const rows = section.rows
        .map(
          ([label, value]) =>
            `<tr><td class="aq-label" width="38%" valign="top" style="padding:7px 12px 7px 0; border-top:1px solid ${C.tealLine}; font-family:${SANS}; font-size:13px; line-height:20px; color:${C.muted};">${escapeHtml(label)}</td><td valign="top" style="padding:7px 0; border-top:1px solid ${C.tealLine}; font-family:${SANS}; font-size:14px; line-height:20px; color:${C.ink}; font-weight:bold; white-space:pre-line;">${escapeHtml(value)}</td></tr>`,
        )
        .join("");
      return head + rows;
    })
    .join("");
  const title = block.title
    ? `<p style="margin:0 0 10px; font-family:${SANS}; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${C.teal};">${escapeHtml(block.title)}</p>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${C.tealSoft}; border:1px solid ${C.tealLine}; border-radius:14px; padding:22px 24px;">${title}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table></td></tr></table>`;
}

function stepsHtml(block: Extract<EmailBlock, { kind: "steps" }>) {
  const items = block.items
    .map(
      (item, index) =>
        `<tr><td width="40" valign="top" style="padding:${index ? "12px" : "0"} 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="26" height="26" style="width:26px; height:26px; border-radius:13px; background-color:${C.teal}; font-family:${SANS}; font-size:13px; font-weight:bold; line-height:26px; color:#FFFFFF;">${index + 1}</td></tr></table></td><td valign="top" style="padding:${index ? "12px" : "0"} 0 0; font-family:${SANS}; font-size:14px; line-height:24px; color:${C.body};">${item}</td></tr>`,
    )
    .join("");
  const title = block.title
    ? `<p style="margin:0 0 14px; font-family:${SANS}; font-size:12px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${C.teal};">${escapeHtml(block.title)}</p>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FFFFFF; border:1px solid ${C.line}; border-radius:14px; padding:22px 24px;">${title}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table></td></tr></table>`;
}

function buttonHtml(block: Extract<EmailBlock, { kind: "button" }>) {
  const color = block.tone === "teal" ? C.teal : C.navy;
  const href = escapeHtml(block.href);
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" bgcolor="${color}" style="border-radius:999px; background-color:${color};"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="50%" fillcolor="${color}" stroke="f"><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(block.label)}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${href}" style="display:inline-block; padding:16px 40px; font-family:${SANS}; font-size:15px; font-weight:bold; line-height:20px; color:#FFFFFF; text-decoration:none; border-radius:999px;">${escapeHtml(block.label)}</a><!--<![endif]--></td></tr></table>`;
}

function blockHtml(block: EmailBlock) {
  switch (block.kind) {
    case "text":
      return row(`<p style="margin:0; font-family:${SANS}; font-size:15px; line-height:26px; color:${C.body};">${block.html}</p>`, "16px 48px 0");
    case "details": {
      const html = detailsHtml(block);
      return html ? row(html, "26px 48px 0") : "";
    }
    case "steps":
      return block.items.length ? row(stepsHtml(block), "22px 48px 0") : "";
    case "button":
      return row(buttonHtml(block), "30px 48px 0");
    case "note":
      return row(`<p style="margin:0; text-align:center; font-family:${SANS}; font-size:13px; line-height:22px; color:${C.muted};">${block.html}</p>`, "20px 48px 0");
    case "callout":
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#FBF6E9; border:1px solid #EBD9A8; border-radius:12px; padding:16px 20px; font-family:${SANS}; font-size:13px; line-height:22px; color:#7A6520;">${block.html}</td></tr></table>`,
        "24px 48px 0",
      );
    case "code":
      return row(
        `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" style="background-color:${C.tealSoft}; border:1px solid ${C.tealLine}; border-radius:14px; padding:20px 36px;">${block.label ? `<p style="margin:0 0 8px; font-family:${SANS}; font-size:11px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${C.teal};">${escapeHtml(block.label)}</p>` : ""}<span style="font-family:'Courier New',Courier,monospace; font-size:38px; font-weight:bold; letter-spacing:12px; line-height:46px; color:${C.ink};">${escapeHtml(block.code)}</span></td></tr></table>`,
        "30px 48px 0",
      );
  }
}

function blockText(block: EmailBlock) {
  switch (block.kind) {
    case "text":
    case "note":
    case "callout":
      return stripTags(block.html);
    case "details":
      return block.sections
        .map((section) => {
          const rows = section.rows.filter(([, value]) => value.trim());
          return rows.length ? [section.title.toUpperCase(), ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n") : "";
        })
        .filter(Boolean)
        .join("\n\n");
    case "steps":
      return [block.title.toUpperCase(), ...block.items.map((item, index) => `${index + 1}. ${stripTags(item)}`)].filter(Boolean).join("\n");
    case "button":
      return `${block.label}: ${block.href}`;
    case "code":
      return block.label ? `${block.label}: ${block.code}` : block.code;
  }
}

/** The Aquifert email frame: logo header, headline, content blocks, signature and footer. Table-based for Outlook and Gmail. */
export function brandedHtml(email: BrandedEmail) {
  const desk = escapeHtml(email.deskEmail?.trim() || DESK_EMAIL);
  const logo = `${EMAIL_ASSET_ORIGIN}/logo-v2.png`;
  const mark = `${EMAIL_ASSET_ORIGIN}/mark-v2.png`;
  const signature =
    email.signature === false
      ? ""
      : row(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${C.line}; padding-top:26px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:14px;"><img src="${mark}" alt="" width="34" height="34" style="display:block; width:34px; height:34px; border:0;" /></td><td valign="middle"><p style="margin:0; font-family:${SANS}; font-size:14px; line-height:22px; color:${C.body};">Kind regards,</p><p style="margin:2px 0 0; font-family:${SERIF}; font-size:18px; font-weight:bold; line-height:24px; color:${C.ink};">Matt &amp; Phil</p><p style="margin:1px 0 0; font-family:${SANS}; font-size:13px; line-height:20px; color:${C.teal};">The Aquifert Trade Desk</p></td></tr></table></td></tr></table>`,
          "36px 48px 40px",
        );

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(email.title)}</title>
<!--[if mso]><style>table{border-collapse:collapse}td,p,a,span{font-family:Arial,sans-serif!important}</style><![endif]-->
<style>
@media only screen and (max-width:620px){
  .aq-shell{width:100%!important}
  .aq-px{padding-left:24px!important;padding-right:24px!important}
  .aq-h1{font-size:25px!important;line-height:32px!important}
  .aq-label{width:42%!important}
}
</style>
</head>
<body style="margin:0; padding:0; background-color:${C.page}; -webkit-font-smoothing:antialiased; -webkit-text-size-adjust:100%;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${C.page};">${escapeHtml(email.preheader)}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="aq-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
<tr><td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF; border-radius:20px 20px 0 0; padding:34px 32px 28px;">
<a href="${SITE_URL}" style="text-decoration:none;"><img src="${logo}" alt="Aquifert" width="176" style="display:block; width:176px; max-width:176px; height:auto; border:0; outline:none; margin:0 auto; color:${C.navy}; font-family:${SANS}; font-size:24px; font-weight:bold;" /></a>
<p style="margin:14px 0 0; font-family:${SANS}; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${C.teal};">${escapeHtml(email.tagline)}</p>
</td></tr>
<tr><td height="4" bgcolor="${C.teal}" style="height:4px; line-height:4px; font-size:4px; background-color:${C.teal}; background-image:linear-gradient(90deg, ${C.teal} 0%, ${C.tealBright} 100%);">&nbsp;</td></tr>
<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${row(
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${C.tealSoft}; border:1px solid ${C.tealLine}; border-radius:999px; padding:6px 14px; font-family:${SANS}; font-size:11px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:${C.teal};">${escapeHtml(email.eyebrow)}</td></tr></table><h1 class="aq-h1" style="margin:18px 0 0; font-family:${SERIF}; font-size:30px; line-height:38px; font-weight:bold; color:${C.ink};">${escapeHtml(email.heading)}</h1>`,
  "44px 48px 0",
)}
${email.blocks.map(blockHtml).join("\n")}
${signature}
</table>
</td></tr>
<tr><td align="center" bgcolor="${C.navy}" style="background-color:${C.navy}; border-radius:0 0 20px 20px; padding:28px 40px;">
<p style="margin:0; font-family:${SANS}; font-size:12px; line-height:22px; color:${C.footer};">${escapeHtml(ADDRESS)}<br /><a href="${SITE_URL}" style="color:${C.tealBright}; text-decoration:none;">aquifert.com</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:${desk}" style="color:${C.tealBright}; text-decoration:none;">${desk}</a></p>
<p style="margin:12px 0 0; font-family:${SANS}; font-size:11px; line-height:18px; color:${C.footerDim};">${escapeHtml(email.footerNote)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function brandedText(email: BrandedEmail) {
  const desk = email.deskEmail?.trim() || DESK_EMAIL;
  return [
    email.eyebrow.toUpperCase(),
    email.heading,
    ...email.blocks.map(blockText).filter(Boolean),
    email.signature === false ? "" : "Kind regards,\nMatt & Phil\nThe Aquifert Trade Desk",
    `${ADDRESS}\naquifert.com · ${desk}\n${email.footerNote}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
