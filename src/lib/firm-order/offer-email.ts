import { EMAIL_ASSET_ORIGIN, escapeHtml } from "@/lib/email/brand";
import { legalContractCopy } from "@/lib/firm-order/contract-copy";
import type { FirmOrderDraft } from "@/lib/firm-order/types";

const SERIF = "Georgia,'Times New Roman',Times,serif";
const INK = "#1C1C1C";
const MUTED = "#464646";

const br = (value: string) => escapeHtml(value).replace(/\n/g, "<br>");

/** The firm offer as it is printed, for the buyer email and the desk preview. */
export function firmOfferMessageHtml(input: { order: FirmOrderDraft; note: string }) {
  const copy = legalContractCopy(input.order, "sales", "FIRM OFFER");
  const note = input.note.trim();
  const logo = `${EMAIL_ASSET_ORIGIN}/logo-v2.png`;
  const terms = copy.terms
    .map(
      (item) =>
        `<tr><td valign="top" width="148" style="width:148px; padding:0 12px 10px 0; font-family:${SERIF}; font-size:12px; line-height:16px; font-weight:bold; color:${INK};">${escapeHtml(item.label)}</td><td valign="top" style="padding:0 0 10px; font-family:${SERIF}; font-size:13px; line-height:17px; color:${INK};">${br(item.body)}</td></tr>`,
    )
    .join("");
  const clauses = copy.clauses
    .map((item) => {
      const paragraphs = item.body
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map(
          (paragraph) =>
            `<p style="margin:0 0 10px; font-family:${SERIF}; font-size:13px; line-height:18px; color:${INK};">${br(paragraph)}</p>`,
        )
        .join("");
      return `<p style="margin:16px 0 6px; font-family:${SERIF}; font-size:13px; line-height:18px; font-weight:bold; color:${INK};">${escapeHtml(item.heading)}</p>${paragraphs}`;
    })
    .join("");
  const covering = note
    ? `<p style="margin:0 0 18px; font-family:${SERIF}; font-size:14px; line-height:20px; color:${INK};">${br(note)}</p><p style="margin:0 0 22px; font-family:${SERIF}; font-size:14px; line-height:20px; color:${INK};">Reply YES to this email to accept this firm offer.</p>`
    : `<p style="margin:0 0 22px; font-family:${SERIF}; font-size:14px; line-height:20px; color:${INK};">Reply YES to this email to accept this firm offer.</p>`;

  return `${covering}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #b4b4b4;">
<tr><td style="padding:22px 28px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td valign="top" style="padding-right:16px; font-family:${SERIF}; font-size:11px; line-height:15px; color:${MUTED};">${br(copy.letterhead)}</td>
<td valign="top" align="right" width="130" style="width:130px;"><img src="${logo}" alt="Aquifert" width="130" style="display:block; width:130px; max-width:130px; height:auto; border:0;" /></td>
</tr>
</table>
<div style="margin-top:12px; border-top:1px solid #282828; font-size:0; line-height:0;">&nbsp;</div>
</td></tr>
<tr><td style="padding:22px 28px 8px;">
<p style="margin:0; font-family:${SERIF}; font-size:22px; line-height:26px; font-weight:bold; letter-spacing:0.5px; text-align:center; color:${INK};">${escapeHtml(copy.title)}</p>
<p style="margin:16px 0 0; font-family:${SERIF}; font-size:13px; line-height:18px; color:${INK};">CONTRACT REFERENCE: ${escapeHtml(copy.reference)}</p>
<p style="margin:4px 0 0; font-family:${SERIF}; font-size:13px; line-height:18px; color:${INK};">DATE: ${escapeHtml(copy.date)}</p>
<p style="margin:12px 0 16px; font-family:${SERIF}; font-size:13px; line-height:18px; font-style:italic; color:${INK};">${br(copy.preamble)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${terms}</table>
${clauses}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
<tr>
<td valign="top" width="48%" style="width:48%; padding-right:16px; font-family:${SERIF}; font-size:12px; line-height:16px; font-weight:bold; color:${INK};">${escapeHtml(copy.sellerSignOff)}<div style="margin-top:28px; border-top:1px solid ${INK}; font-size:0; line-height:0;">&nbsp;</div><p style="margin:8px 0 0; font-weight:normal;">SIGNATURE</p><p style="margin:6px 0 0; font-weight:normal;">NAME: ${escapeHtml(copy.signatoryName)}</p><p style="margin:4px 0 0; font-weight:normal;">TITLE: ${escapeHtml(copy.signatoryTitle)}</p><p style="margin:4px 0 0; font-weight:normal;">DATE: ${escapeHtml(copy.date)}</p></td>
<td valign="top" width="48%" style="width:48%; font-family:${SERIF}; font-size:12px; line-height:16px; font-weight:bold; color:${INK};">${escapeHtml(copy.counterpartySignOff)}<div style="margin-top:28px; border-top:1px solid ${INK}; font-size:0; line-height:0;">&nbsp;</div><p style="margin:8px 0 0; font-weight:normal;">SIGNATURE</p><p style="margin:6px 0 0; font-weight:normal;">NAME:</p><p style="margin:4px 0 0; font-weight:normal;">TITLE:</p><p style="margin:4px 0 0; font-weight:normal;">DATE:</p></td>
</tr>
</table>
</td></tr>
<tr><td style="padding:16px 28px 18px; border-top:1px solid #b4b4b4; font-family:${SERIF}; font-size:10px; line-height:14px; color:${MUTED};">${escapeHtml(copy.footer)}</td></tr>
</table>`;
}

export function firmOfferMessageText(input: { order: FirmOrderDraft; note: string }) {
  const copy = legalContractCopy(input.order, "sales", "FIRM OFFER");
  const terms = copy.terms.map((item) => `${item.label} ${item.body}`).join("\n");
  const clauses = copy.clauses.map((item) => `${item.heading}\n${item.body}`).join("\n\n");
  return [
    input.note.trim(),
    "Reply YES to this email to accept this firm offer.",
    copy.title,
    `CONTRACT REFERENCE: ${copy.reference}`,
    `DATE: ${copy.date}`,
    copy.preamble,
    terms,
    clauses,
    `${copy.sellerSignOff}\nSIGNATURE\nNAME: ${copy.signatoryName}\nTITLE: ${copy.signatoryTitle}\nDATE: ${copy.date}`,
    `${copy.counterpartySignOff}\nSIGNATURE\nNAME:\nTITLE:\nDATE:`,
    copy.footer,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function firmOfferEmailDocument(input: { order: FirmOrderDraft; note: string }) {
  const body = firmOfferMessageHtml(input);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>FIRM OFFER</title></head>
<body style="margin:0; padding:24px 12px; background:#f3f3f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px; max-width:640px;"><tr><td>${body}</td></tr></table>
</td></tr></table>
</body>
</html>`;
  return { html, text: firmOfferMessageText(input) };
}
