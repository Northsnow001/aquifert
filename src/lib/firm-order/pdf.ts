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
  doc.text(isPi ? "PRO FORMA INVOICE" : isOffer ? "FIRM OFFER" : "PURCHASE ORDER", margin, y);

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

const CONTRACT_LETTERHEAD =
  "Aquifert Limited is a company registered in England and Wales (Company No.14506592) at 71-75 Shelton Street, London WC2H 9JQ.";

const AQUIFERT_LEGAL_ADDRESS = `AQUIFERT LIMITED
71-75 SHELTON STREET
COVENT GARDEN,
LONDON, WC2H 9JQ
VAT NO: ${AQUIFERT_PO_ISSUER.vatNumber}`;

const PREPAYMENT_CLAUSE = `Any prepayment made by the Buyer under this contract shall be deemed to be an advance payment toward procurement, booking, logistics arrangements, supplier commitments, packaging, and other performance obligations undertaken by the Seller in reliance on this contract.

The Buyer acknowledges and agrees that upon receipt of any prepayment, the Seller may immediately allocate such funds toward upstream supply contracts, freight bookings, container positioning, financial hedging, inspection arrangements, or other performance-related costs.

In the event that:
(A) the Buyer cancels, suspends, delays, or otherwise fails to perform its obligations; or
(B) the contract cannot be performed due to circumstances attributable to the Buyer;
the Seller shall be entitled to retain the prepayment and apply it against any costs, losses, cancellation charges, price differences, financing costs, or liabilities incurred.`;

const UNLOADING_CLAUSE = `Buyer shall be responsible for receiving the containers and for paying all terminal handling charges to the carrier or its agent at destination. Buyer shall be responsible for unstuffing/unloading the product from the containers at Buyer's cost. Buyer shall have the time allowed under Seller's contract with the carrier and/or container lessor, whichever is less, to unload/unstuff and return the containers in which the product was transported. If Seller incurs any cost or expense, including but not limited to storage fees, demurrage/detention or other delay charges as a result of Buyer's failure to promptly remove the product from the vessel, conveyance, facility or container at destination, Buyer shall reimburse Seller for all such costs and expenses.`;

const RETURNING_CLAUSE = `Buyer shall be responsible for any and all consequences of delay beyond the time allowed by the carrier or container lessor in returning the containers to the carrier or container lessor and Buyer shall be responsible for any damage to the containers during unloading/unstuffing. Buyer shall indemnify Seller for any liability Seller may have to the carrier or container lessor for delay in returning the containers and any damage to the containers during unstuffing/unloading.`;

const LAW_CLAUSE = `This contract shall be governed by and construed in accordance with the laws of the United Arab Emirates. Any dispute, controversy, or claim arising out of or in connection with this contract, including any question regarding its existence, validity, interpretation, performance, breach, termination, or any non-contractual obligations arising out of or in connection with it, shall be referred to and finally resolved by arbitration under the Rules of Arbitration of the Dubai International Arbitration Centre (DIAC), which rules are deemed to be incorporated by reference into this clause. The arbitration shall be conducted by a sole arbitrator appointed in accordance with the DIAC Rules. The seat, or legal place, of arbitration shall be Dubai, United Arab Emirates. The language of the arbitration shall be English. The arbitral award shall be final and binding on the parties, and judgment upon the award may be entered and enforced by any court of competent jurisdiction.`;

async function buildLegalContractPdf(
  order: FirmOrderDraft,
  kind: "sales" | "purchase",
): Promise<Uint8Array> {
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), logoDataUrl()]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 52;
  const right = pageW - margin;
  const contentW = right - margin;
  const labelCol = 148;
  const valueX = margin + labelCol;
  const valueW = contentW - labelCol;
  const footerY = pageH - 36;
  const logoRatio = 814 / 214;
  const logoH = 34;
  const logoW = logoH * logoRatio;
  let y = 102;
  const amount = lineAmount(order);
  const unit = order.unit_price_usd != null ? money(order.unit_price_usd) : "—";
  const counterparty =
    kind === "sales"
      ? order.buyer.name || "the Buyer"
      : order.supplier.name || "the Seller";
  const destination = order.discharge_port || order.price_basis || "";
  const basis = [order.incoterm, destination].filter(Boolean).join(" ");
  const title = kind === "sales" ? "SALES CONTRACT" : "PURCHASE CONTRACT";
  const contractDate = displayDate(order.po_date) || displayDate(new Date().toISOString());
  const leading = 13;

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("times", style);
    doc.setFontSize(size);
  };
  const drawLogo = () => {
    if (!logo) {
      color(INK);
      font(16, "bold");
      doc.text("aquifert", right, 48, { align: "right" });
      return;
    }
    try {
      doc.addImage(logo, "PNG", right - logoW, 24, logoW, logoH);
    } catch {
      color(INK);
      font(16, "bold");
      doc.text("aquifert", right, 48, { align: "right" });
    }
  };
  const letterhead = () => {
    drawLogo();
    color(MUTED);
    font(8);
    const lines = doc.splitTextToSize(CONTRACT_LETTERHEAD, contentW - logoW - 12) as string[];
    doc.text(lines, margin, 40);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.8);
    doc.line(margin, 72, right, 72);
  };
  const newPage = () => {
    doc.addPage();
    letterhead();
    y = 102;
  };
  const ensure = (need: number) => {
    if (y + need < footerY - 18) return;
    newPage();
  };
  const term = (label: string, body: string) => {
    if (!body.trim()) return;
    const lines = doc.splitTextToSize(body, valueW) as string[];
    ensure(lines.length * leading + 10);
    color(INK);
    font(9, "bold");
    doc.text(label, margin, y);
    font(10);
    doc.text(lines, valueX, y);
    y += lines.length * leading + 8;
  };
  const clause = (heading: string, body: string) => {
    const paragraphs = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    ensure(leading * 4);
    color(INK);
    font(10, "bold");
    const head = doc.splitTextToSize(heading, contentW) as string[];
    doc.text(head, margin, y);
    y += head.length * leading + 6;
    font(10);
    for (const para of paragraphs) {
      const lines = doc.splitTextToSize(para, contentW) as string[];
      ensure(lines.length * leading + 8);
      doc.text(lines, margin, y);
      y += lines.length * leading + 10;
    }
    y += 4;
  };

  letterhead();
  color(INK);
  font(22, "bold");
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 26;
  font(10);
  doc.text(`CONTRACT REFERENCE: ${order.order_ref || order.reference}`, margin, y);
  y += 14;
  doc.text(`DATE: ${contractDate}`, margin, y);
  y += 18;
  font(10, "italic");
  const preamble =
    kind === "sales"
      ? `This Sales Contract is entered into between Aquifert Limited (“Seller”) and ${order.buyer.name || "the Buyer"} (“Buyer”) on the terms and conditions set out below.`
      : `This Purchase Contract is entered into between Aquifert Limited (“Buyer”) and ${order.supplier.name || "the Seller"} (“Seller”) on the terms and conditions set out below.`;
  const preambleLines = doc.splitTextToSize(preamble, contentW) as string[];
  doc.text(preambleLines, margin, y);
  y += preambleLines.length * leading + 14;

  if (kind === "sales") {
    term("BUYER:", [order.buyer.name, order.buyer.phone, order.buyer.email].filter(Boolean).join("\n") || "As notified");
    term("SELLER:", AQUIFERT_LEGAL_ADDRESS);
  } else {
    term("BUYER:", AQUIFERT_LEGAL_ADDRESS);
    term(
      "SELLER:",
      [order.supplier.name, order.supplier.attention, order.supplier.address, order.supplier.city, order.supplier.country]
        .filter(Boolean)
        .join("\n") || "As notified",
    );
  }
  if (order.reference && order.reference !== order.order_ref) term("TRADE REFERENCE:", order.reference);
  term("PRODUCT:", [order.product, order.form_grade].filter(Boolean).join(" — "));
  term("QUANTITY:", `${order.quantity_mt || "—"} MTS +/- ${order.tolerance_pct || 5}% IN BUYERS OPTION`);
  term(
    "QUALITY:",
    order.form_grade
      ? `The product shall meet the following specifications: ${order.form_grade}. Quality and quantity as per internationally recognised third-party certificate of analysis at load port.`
      : "The product shall meet the commercially agreed specification. Quality and quantity as per internationally recognised third-party certificate of analysis at load port.",
  );
  if (order.packing) term("PACKING:", order.packing);
  if (order.origin) term("ORIGIN:", order.origin);
  term(
    "DELIVERY:",
    `${basis} (Incoterms 2020). Duty unpaid, customs uncleared and taxes unpaid unless otherwise stated.`,
  );
  term("FREE DAYS:", "As per standard conditions of the liner.");
  term(
    "SHIPMENT PERIOD:",
    order.shipping
      ? `${order.shipping} from loading port in Seller option. Transhipment is allowed and partial deliveries are allowed.`
      : "As agreed, from loading port in Seller option. Transhipment is allowed and partial deliveries are allowed.",
  );
  term(
    "PRICE:",
    `USD ${unit} PER METRIC TONNE ${basis}${amount != null ? `. TOTAL VALUE USD ${money(amount)}` : ""}`,
  );
  term(
    "PAYMENT:",
    order.payment_terms ||
      (kind === "sales"
        ? "As stated on the Proforma Invoice. Full amount due into Seller's designated bank account without any discount or rebate. Bank charges for Buyer's account."
        : "As agreed. Payment to Seller's designated bank account without any discount or rebate. Bank charges for Buyer's account."),
  );

  newPage();
  clause("PREPAYMENT ALLOCATION AND REIMBURSEMENT", PREPAYMENT_CLAUSE);
  clause(
    "INSPECTION",
    kind === "sales"
      ? "As per internationally recognised third party inspections company's (AMSPEC, TCI and SGS etc.) certificate of analysis and quantity at load port for Aquifert cost."
      : "As per internationally recognised third party inspections company's certificate of analysis and quantity at load port for Buyer's cost.",
  );
  clause(
    "INSURANCE",
    kind === "sales"
      ? "For Seller's account and responsibility as per Incoterms 2020."
      : "For Buyer's account and responsibility as per Incoterms 2020.",
  );
  clause("UNLOADING/UNSTUFFING CONTAINERS", UNLOADING_CLAUSE);
  clause("RETURNING CONTAINERS", RETURNING_CLAUSE);
  clause("GOVERNING LAW AND JURISDICTION", LAW_CLAUSE);
  clause(
    "GENERAL TERMS",
    "The provisions of Incoterms 2020 and the General Terms and Conditions for CFR/CIF sales of Aquifert Limited shall be incorporated into this contract. In the event of any inconsistency between those terms and this contract, this contract shall prevail.",
  );

  ensure(160);
  y += 18;
  font(10, "bold");
  doc.text("FOR AND ON BEHALF OF AQUIFERT LTD", margin, y);
  doc.text(`FOR AND ON BEHALF OF ${counterparty.toUpperCase()}`, right - 200, y);
  y += 46;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 200, y);
  doc.line(right - 200, y, right, y);
  y += 14;
  font(9);
  doc.text("SIGNATURE", margin, y);
  doc.text("SIGNATURE", right - 200, y);
  y += 16;
  doc.text("NAME: MATT O'LEARY", margin, y);
  doc.text("NAME:", right - 200, y);
  y += 14;
  doc.text("TITLE: MANAGING DIRECTOR", margin, y);
  doc.text("TITLE:", right - 200, y);
  y += 14;
  doc.text(`DATE: ${contractDate}`, margin, y);
  doc.text("DATE:", right - 200, y);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 10, right, footerY - 10);
    color(MUTED);
    font(7.5);
    doc.text(AQUIFERT_PO_ISSUER.footer, margin, footerY, { maxWidth: contentW - 70 });
    doc.text(`Page ${i} of ${pages}`, right, footerY, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

async function buildSalesContractPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  return buildLegalContractPdf(order, "sales");
}

async function buildPurchaseContractPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  return buildLegalContractPdf(order, "purchase");
}

async function buildDocumentaryInstructionsPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), logoDataUrl()]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const right = pageW - margin;
  let y = 96;

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

  if (logo) {
    try {
      const logoH = 34;
      const logoW = logoH * (814 / 214);
      doc.addImage(logo, "PNG", right - logoW, 24, logoW, logoH);
    } catch {
      /* keep text letterhead */
    }
  }
  color(MUTED);
  font(8);
  doc.text(CONTRACT_LETTERHEAD, margin, 40, { maxWidth: pageW - margin * 2 - 160 });
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.7);
  doc.line(margin, 72, right, 72);
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
      order.documents.trim() ? `Buyer / inspection: ${order.documents.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  block("TRADE REF", order.reference || order.order_ref || "—");
  block(
    "DISTRIBUTION OF THE DOCUMENTS",
    "All original documents to be sent by courier as instructed. A copy of all documents to be sent by email right after loading to mol@aquifert.com.",
  );

  return new Uint8Array(doc.output("arraybuffer"));
}
