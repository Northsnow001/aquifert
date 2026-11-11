import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { AQUIFERT_BANK, AQUIFERT_PO_ISSUER, type FirmOrderDraft } from "@/lib/firm-order/types";

type RGB = [number, number, number];

const INK: RGB = [28, 28, 28];
const MUTED: RGB = [70, 70, 70];
const LINE: RGB = [180, 180, 180];
const RULE: RGB = [40, 40, 40];

async function logoDataUrl(): Promise<string | null> {
  for (const file of ["logo-v2.png", "logo.png", "logo-v2-light.png"]) {
    try {
      const buf = await readFile(path.join(process.cwd(), "public", "brand", file));
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

function money(n: number, currency = "USD") {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function displayDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function lineAmount(order: FirmOrderDraft) {
  if (order.unit_price_usd == null || !order.quantity_mt) return null;
  const gross = order.quantity_mt * order.unit_price_usd;
  const afterDiscount = gross * (1 - (order.discount_pct || 0) / 100);
  return Math.round(afterDiscount * 100) / 100;
}

/** Commercial PDF. PO = supplier cost. Proforma / sales contract = buyer price. Never mix. */
export async function buildFirmOrderPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  if (order.document === "sales_contract") return buildSalesContractPdf(order);
  if (order.document === "purchase_contract") return buildPurchaseContractPdf(order);
  if (order.document === "documentary_instructions") return buildDocumentaryInstructionsPdf(order);

  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), logoDataUrl()]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const right = pageW - margin;
  let y = 42;
  const isPi = order.document === "proforma";
  const isOffer = order.document === "firm_offer";

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  if (logo) {
    try {
      doc.addImage(logo, "PNG", right - 132, 28, 132, 36);
    } catch {
      color(INK);
      font(16, "bold");
      doc.text("aquifert", right, 48, { align: "right" });
    }
  }

  y = 92;
  color(INK);
  font(22, "bold");
  doc.text(isPi ? "PROFORMA INVOICE" : isOffer ? "FIRM OFFER" : "PURCHASE ORDER", margin, y);

  y = 118;
  font(10, "bold");
  const partyLines = (isPi || isOffer
    ? [order.buyer.name, order.buyer.phone ? `WhatsApp: ${order.buyer.phone}` : "", order.buyer.email]
    : [
        order.supplier.name,
        order.supplier.attention ? `Attention: ${order.supplier.attention}` : "",
        order.supplier.address,
        order.supplier.city,
        order.supplier.country,
      ]
  ).filter((line): line is string => Boolean(line));
  if (!partyLines.length) partyLines.push(isPi || isOffer ? "Buyer" : "Supplier to be confirmed");
  doc.text(partyLines[0], margin + 18, y);
  font(9);
  color(MUTED);
  let sy = y + 13;
  for (const line of partyLines.slice(1)) {
    doc.text(line, margin + 18, sy);
    sy += 12;
  }

  const metaX = 318;
  const metaValueX = 430;
  const meta = isOffer
    ? [
        ["Offer Date", displayDate(order.po_date) || displayDate(new Date().toISOString())],
        ["Offer Number", order.order_ref || "—"],
        ["Reference", order.reference || "—"],
        ["VAT Number", order.vat_number || AQUIFERT_PO_ISSUER.vatNumber],
      ]
    : isPi
    ? [
        ["Invoice Date", displayDate(order.po_date) || displayDate(new Date().toISOString())],
        ["Invoice Number", order.order_ref || "—"],
        ["Reference", order.reference || "—"],
        ["VAT Number", order.vat_number || AQUIFERT_PO_ISSUER.vatNumber],
      ]
    : [
        ["Purchase Order Date", displayDate(order.po_date) || displayDate(new Date().toISOString())],
        ["Delivery Date", displayDate(order.delivery_date) || displayDate(order.laycan_to) || "—"],
        ["Purchase Order Number", order.order_ref || "—"],
        ["Reference", order.reference || "—"],
        ["VAT Number", order.vat_number || AQUIFERT_PO_ISSUER.vatNumber],
      ];
  let my = 118;
  for (const [label, value] of meta) {
    color(INK);
    font(8, "bold");
    doc.text(label, metaX, my);
    font(8);
    const lines = doc.splitTextToSize(value, 90) as string[];
    doc.text(lines, metaValueX, my);
    my += Math.max(16, lines.length * 11 + 5);
  }

  color(INK);
  font(8, "bold");
  doc.text(AQUIFERT_PO_ISSUER.name, right, 118, { align: "right" });
  font(8);
  let iy = 130;
  for (const line of AQUIFERT_PO_ISSUER.lines) {
    doc.text(line, right, iy, { align: "right" });
    iy += 11;
  }

  y = Math.max(sy, my, iy) + 28;
  const cols = {
    desc: margin,
    qty: 280,
    unit: 345,
    disc: 410,
    vat: 465,
    amt: right,
  };
  font(8, "bold");
  doc.text("Description", cols.desc, y);
  doc.text("Quantity", cols.qty, y, { align: "right" });
  doc.text("Unit Price", cols.unit, y, { align: "right" });
  doc.text("Discount", cols.disc, y, { align: "right" });
  doc.text("VAT", cols.vat, y, { align: "right" });
  doc.text(`Amount ${order.currency || "USD"}`, cols.amt, y, { align: "right" });
  y += 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.6);
  doc.line(margin, y, right, y);
  y += 16;

  const qty = order.quantity_mt ? order.quantity_mt.toFixed(2) : "—";
  const unit = order.unit_price_usd != null ? money(order.unit_price_usd) : "—";
  const amount = lineAmount(order);
  const description = [order.product, order.form_grade].filter(Boolean).join(" — ");
  font(9);
  color(INK);
  doc.text(description, cols.desc, y);
  doc.text(qty, cols.qty, y, { align: "right" });
  doc.text(unit, cols.unit, y, { align: "right" });
  doc.text(`${(order.discount_pct || 0).toFixed(2)}%`, cols.disc, y, { align: "right" });
  doc.text(order.vat_applicable ? "VAT" : "No VAT", cols.vat, y, { align: "right" });
  doc.text(amount != null ? money(amount) : "—", cols.amt, y, { align: "right" });
  y += 18;
  doc.setDrawColor(...LINE);
  doc.line(margin, y, right, y);
  y += 16;

  const notes: string[] = [];
  if (order.reference) notes.push(`TRADE REF: ${order.reference}`);
  if (order.payment_terms) notes.push(`PAYMENT TERMS: ${order.payment_terms}`);
  if (order.origin) notes.push(`Origin: ${order.origin}`);
  const delivery = [order.incoterm, order.price_basis || order.discharge_port].filter(Boolean).join(" ");
  if (delivery) notes.push(`Terms of Delivery ${delivery} (Incoterms 2020)`);
  if (order.load_port) notes.push(`Load port: ${order.load_port}`);
  if (order.shipping || order.laycan_from || order.laycan_to) {
    notes.push(`Shipping: ${order.shipping || [order.laycan_from, order.laycan_to].filter(Boolean).join(" → ")}`);
  }
  if (order.additional_information.trim()) notes.push(`ADDITIONAL INFORMATION:\n${order.additional_information.trim()}`);
  if (order.packing) notes.push(`Packing: ${order.packing}`);
  if (order.documents.trim()) notes.push(order.documents.trim());

  font(8);
  color(INK);
  for (const block of notes) {
    const lines = doc.splitTextToSize(block, right - margin) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 11 + 4;
  }

  y += 10;
  doc.setDrawColor(...LINE);
  doc.line(margin, y, right, y);
  y += 22;

  const subtotal = amount;
  const vatAmt = order.vat_applicable && subtotal != null ? Math.round(subtotal * 0.2 * 100) / 100 : 0;
  const total = subtotal != null ? subtotal + vatAmt : null;
  const totals: Array<[string, string, boolean]> = [
    ["Subtotal", subtotal != null ? money(subtotal) : "—", false],
    ["TOTAL  NO VAT", money(vatAmt), false],
    [`TOTAL ${order.currency || "USD"}`, total != null ? money(total) : "—", true],
  ];
  for (const [label, value, bold] of totals) {
    font(9, bold ? "bold" : "normal");
    doc.text(label, 430, y, { align: "right" });
    doc.text(value, right, y, { align: "right" });
    if (bold) {
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.8);
      doc.line(400, y + 4, right, y + 4);
      doc.line(400, y + 7, right, y + 7);
    }
    y += 16;
  }

  if (isPi) {
    y += 12;
    color(INK);
    font(8, "bold");
    doc.text("Banking Instructions", margin, y);
    y += 12;
    font(8);
    const bank = [
      `Beneficiary: ${AQUIFERT_BANK.beneficiary}`,
      `Bank: ${AQUIFERT_BANK.bankName}, ${AQUIFERT_BANK.bankAddress}`,
      `Account: ${AQUIFERT_BANK.account}  Currency: ${AQUIFERT_BANK.currency}`,
      `IBAN: ${AQUIFERT_BANK.iban}  BIC: ${AQUIFERT_BANK.bic}`,
    ];
    for (const line of bank) {
      doc.text(line, margin, y);
      y += 11;
    }
  }

  color(MUTED);
  font(7);
  doc.setPage(1);
  doc.text(AQUIFERT_PO_ISSUER.footer, pageW / 2, pageH - 28, { align: "center", maxWidth: pageW - margin * 2 });
  while (doc.getNumberOfPages() > 1) doc.deletePage(doc.getNumberOfPages());

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

export function firmOrderFilename(order: FirmOrderDraft) {
  const ref = (order.order_ref || order.reference || "doc").replace(/[^\w-]+/g, "-");
  if (order.document === "firm_offer") return `Firm_Offer_${ref}.pdf`;
  if (order.document === "proforma") return `Proforma_Invoice_${ref}.pdf`;
  if (order.document === "sales_contract") return `Sales_Contract_${ref}.pdf`;
  if (order.document === "purchase_contract") return `Purchase_Contract_${ref}.pdf`;
  if (order.document === "documentary_instructions") return `Documentary_Instructions_${ref}.pdf`;
  return `Purchase_Order_${ref}.pdf`;
}

async function buildSalesContractPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  const [{ jsPDF }] = await Promise.all([import("jspdf")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const right = pageW - margin;
  let y = 56;
  const amount = lineAmount(order);
  const unit = order.unit_price_usd != null ? money(order.unit_price_usd) : "—";
  const buyerName = order.buyer.name || "the Buyer";

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const block = (title: string, body: string) => {
    if (y > pageH - 90) {
      doc.addPage();
      y = 56;
    }
    color(INK);
    font(8, "bold");
    doc.text(title, margin, y);
    y += 12;
    font(9);
    const lines = doc.splitTextToSize(body, right - margin) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
  };

  color(MUTED);
  font(8);
  doc.text(AQUIFERT_PO_ISSUER.footer, margin, y, { maxWidth: right - margin });
  y += 28;
  color(INK);
  font(18, "bold");
  doc.text("SALES CONTRACT", margin, y);
  y += 22;
  font(9);
  doc.text(`CONTRACT REFERENCE: ${order.order_ref || order.reference}`, margin, y);
  y += 14;
  doc.text(`DATE: ${displayDate(order.po_date) || displayDate(new Date().toISOString())}`, margin, y);
  y += 18;

  block("BUYER:", [buyerName, order.buyer.phone, order.buyer.email].filter(Boolean).join("\n") || "As notified");
  block(
    "SELLER:",
    `${AQUIFERT_PO_ISSUER.name}\n71-75 Shelton Street, Covent Garden, London, WC2H 9JQ\nVAT NO: ${AQUIFERT_PO_ISSUER.vatNumber}`,
  );
  block("PRODUCT:", [order.product, order.form_grade].filter(Boolean).join(" — "));
  block(
    "QUANTITY:",
    `${order.quantity_mt || "—"} MTS +/- ${order.tolerance_pct || 5}% IN BUYERS OPTION`,
  );
  if (order.packing) block("PACKING:", order.packing);
  if (order.origin) block("ORIGIN:", order.origin);
  block(
    "DELIVERY:",
    `${order.incoterm} ${order.discharge_port || order.price_basis} (Incoterms 2020)${order.shipping ? `. ${order.shipping}` : ""}`,
  );
  block(
    "PRICE:",
    `USD ${unit} PER METRIC TONNE ${order.incoterm} ${order.discharge_port || order.price_basis}${amount != null ? `. TOTAL VALUE USD ${money(amount)}` : ""}`,
  );
  block(
    "PAYMENT:",
    order.payment_terms ||
      "As stated on the Proforma Invoice. Full amount due into Seller's account without discount or rebate. Bank charges for Buyer's account.",
  );
  block(
    "PREPAYMENT ALLOCATION AND REIMBURSEMENT:",
    "Any prepayment made by the Buyer under this contract shall be deemed an advance payment toward procurement, booking, logistics, supplier commitments, packaging and other performance obligations undertaken by the Seller. Upon receipt of any prepayment the Seller may allocate such funds toward upstream supply, freight, containers, inspection or other performance-related costs. If the Buyer cancels, suspends, delays or fails to perform, or the contract cannot be performed due to circumstances attributable to the Buyer, the Seller may retain the prepayment and apply it against costs, losses, cancellation charges, price differences, financing costs or liabilities incurred.",
  );
  block(
    "INSPECTION:",
    "As per internationally recognised third party inspection (SGS or equivalent) certificate of analysis and quantity at load port.",
  );
  block("INSURANCE:", "As per Incoterms 2020.");
  block(
    "GENERAL TERMS:",
    "The provisions of Incoterms 2020 and the General Terms and Conditions of Aquifert Limited are incorporated into this contract.",
  );
  y += 8;
  font(9, "bold");
  doc.text("FOR AND ON BEHALF OF AQUIFERT LTD", margin, y);
  doc.text(`FOR AND ON BEHALF OF ${buyerName.toUpperCase()}`, right, y, { align: "right" });
  y += 36;
  font(8);
  doc.text("SIGNATURE", margin, y);
  doc.text("SIGNATURE", right, y, { align: "right" });
  y += 14;
  doc.text("NAME: MATT O'LEARY", margin, y);
  y += 12;
  doc.text("TITLE: MANAGING DIRECTOR", margin, y);

  color(MUTED);
  font(7);
  doc.text(AQUIFERT_PO_ISSUER.footer, pageW / 2, pageH - 28, { align: "center", maxWidth: pageW - margin * 2 });
  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

async function buildPurchaseContractPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  const [{ jsPDF }] = await Promise.all([import("jspdf")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const right = pageW - margin;
  let y = 56;
  const amount = lineAmount(order);
  const unit = order.unit_price_usd != null ? money(order.unit_price_usd) : "—";
  const sellerName = order.supplier.name || "the Seller";

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const block = (title: string, body: string) => {
    if (y > pageH - 90) {
      doc.addPage();
      y = 56;
    }
    color(INK);
    font(8, "bold");
    doc.text(title, margin, y);
    y += 12;
    font(9);
    const lines = doc.splitTextToSize(body, right - margin) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
  };

  color(MUTED);
  font(8);
  doc.text(AQUIFERT_PO_ISSUER.footer, margin, y, { maxWidth: right - margin });
  y += 28;
  color(INK);
  font(18, "bold");
  doc.text("PURCHASE CONTRACT", margin, y);
  y += 22;
  font(9);
  doc.text(`CONTRACT REFERENCE: ${order.order_ref || order.reference}`, margin, y);
  y += 14;
  doc.text(`DATE: ${displayDate(order.po_date) || displayDate(new Date().toISOString())}`, margin, y);
  y += 18;

  block(
    "BUYER:",
    `${AQUIFERT_PO_ISSUER.name}\n71-75 Shelton Street, Covent Garden, London, WC2H 9JQ\nVAT NO: ${AQUIFERT_PO_ISSUER.vatNumber}`,
  );
  block(
    "SELLER:",
    [sellerName, order.supplier.attention, order.supplier.address, order.supplier.city, order.supplier.country]
      .filter(Boolean)
      .join("\n") || sellerName,
  );
  block("PRODUCT:", [order.product, order.form_grade].filter(Boolean).join(" — "));
  block("QUANTITY:", `${order.quantity_mt || "—"} MTS +/- ${order.tolerance_pct || 5}%`);
  if (order.packing) block("PACKING:", order.packing);
  if (order.origin) block("ORIGIN:", order.origin);
  block(
    "DELIVERY:",
    `${order.incoterm} ${order.discharge_port || order.price_basis || order.load_port} (Incoterms 2020)${order.shipping ? `. ${order.shipping}` : ""}`,
  );
  block(
    "PRICE:",
    `USD ${unit} PER METRIC TONNE ${order.incoterm} ${order.load_port || order.price_basis}${amount != null ? `. TOTAL VALUE USD ${money(amount)}` : ""}`,
  );
  block(
    "PAYMENT:",
    order.payment_terms ||
      "As agreed. Payment to Seller's designated account without discount or rebate. Bank charges for Buyer's account.",
  );
  block(
    "INSPECTION:",
    "As per internationally recognised third party inspection certificate of analysis and quantity at load port.",
  );
  block("INSURANCE:", "As per Incoterms 2020.");
  block(
    "GENERAL TERMS:",
    "The provisions of Incoterms 2020 and the General Terms and Conditions of Aquifert Limited are incorporated into this contract.",
  );
  y += 8;
  font(9, "bold");
  doc.text("FOR AND ON BEHALF OF AQUIFERT LTD", margin, y);
  doc.text(`FOR AND ON BEHALF OF ${sellerName.toUpperCase()}`, right, y, { align: "right" });
  y += 36;
  font(8);
  doc.text("NAME: MATT O'LEARY", margin, y);
  y += 12;
  doc.text("TITLE: MANAGING DIRECTOR", margin, y);

  color(MUTED);
  font(7);
  doc.text(AQUIFERT_PO_ISSUER.footer, pageW / 2, pageH - 28, { align: "center", maxWidth: pageW - margin * 2 });
  return new Uint8Array(doc.output("arraybuffer"));
}

async function buildDocumentaryInstructionsPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  const [{ jsPDF }] = await Promise.all([import("jspdf")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = 56;

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const block = (title: string, body: string) => {
    if (y > pageH - 90) {
      doc.addPage();
      y = 56;
    }
    color(INK);
    font(8, "bold");
    doc.text(title, margin, y);
    y += 12;
    font(9);
    const lines = doc.splitTextToSize(body, pageW - margin * 2) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
  };

  color(MUTED);
  font(8);
  doc.text(AQUIFERT_PO_ISSUER.footer, margin, y, { maxWidth: pageW - margin * 2 });
  y += 28;
  color(INK);
  font(16, "bold");
  doc.text("DOCUMENTARY INSTRUCTIONS", margin, y);
  y += 18;
  font(10);
  doc.text(
    `${order.quantity_mt || ""} MT OF ${order.product.toUpperCase()} TO ${(order.discharge_port || order.price_basis || "").toUpperCase()}`,
    margin,
    y,
  );
  y += 22;

  block("GOODS DESCRIPTION", [order.product, order.form_grade, order.packing].filter(Boolean).join(" — "));
  block("QUANTITY", `${order.quantity_mt || "—"} MTS ± ${order.tolerance_pct || 5}%`);
  block(
    "SHIPPER",
    `${AQUIFERT_PO_ISSUER.name}\n71-75 Shelton Street, Covent Garden, London, WC2H 9JQ\nVAT NO: ${AQUIFERT_PO_ISSUER.vatNumber}`,
  );
  block("POD", order.discharge_port || order.price_basis || "—");
  block("LOAD PORT", order.load_port || "—");
  block("INCOTERM", `${order.incoterm} (Incoterms 2020)`);
  block("BL TO SHOW", "TOTAL NET / GROSS WEIGHT\nNO. OF PACKAGES");
  block(
    "DOCUMENTS REQUIRED",
    [
      "1 Original and one copy: Commercial Invoice",
      "3 Original and one copy: Bill of Lading",
      "1 Original and one copy: Analysis Certificate",
      "1 Original and one copy: Weight Certificate",
      "1 Original and one copy: Origin Certificate",
      "1 Original and one copy: Packing List",
      "1 Original and one copy: Insurance Certificate (as per Incoterm)",
    ].join("\n"),
  );
  block("TRADE REF", order.reference || order.order_ref || "—");

  color(MUTED);
  font(7);
  doc.text(AQUIFERT_PO_ISSUER.footer, pageW / 2, pageH - 28, { align: "center", maxWidth: pageW - margin * 2 });
  return new Uint8Array(doc.output("arraybuffer"));
}
