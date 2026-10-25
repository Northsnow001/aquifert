import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import type { FirmOrderDraft } from "@/lib/firm-order/types";

type RGB = [number, number, number];

const NAVY: RGB = [11, 37, 69];
const TEAL: RGB = [14, 116, 144];
const BODY: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const WHITE: RGB = [255, 255, 255];

async function logoDataUrl(): Promise<string | null> {
  try {
    const file = path.join(process.cwd(), "public", "brand", "logo-v2-light.png");
    const buf = await readFile(file);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function money(n: number | null, currency: string) {
  if (n == null) return "To be confirmed by desk";
  return `${currency} ${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })} / MT`;
}

/** Branded A4 Firm Order draft PDF (bytes). Status is always draft pending clearance. */
export async function buildFirmOrderPdf(order: FirmOrderDraft): Promise<Uint8Array> {
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), logoDataUrl()]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  const color = (rgb: RGB) => doc.setTextColor(...rgb);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 88, "F");
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin, 22, 110, 29);
    } catch {
      /* logo optional */
    }
  } else {
    color(WHITE);
    font(14, "bold");
    doc.text("AQUIFERT", margin, 40);
  }
  color(WHITE);
  font(11, "bold");
  doc.text("FIRM ORDER DRAFT", pageW - margin, 36, { align: "right" });
  font(8);
  doc.text("Subject to trade desk clearance — not binding", pageW - margin, 52, { align: "right" });
  y = 112;

  color(BODY);
  font(16, "bold");
  doc.text("Firm Order Draft", margin, y);
  y += 18;
  color(MUTED);
  font(9);
  doc.text(`Status: ${order.status}`, margin, y);
  y += 14;
  doc.text(`Reference: ${order.order_ref || "To be assigned by Aquifert"}`, margin, y);
  y += 14;
  doc.text(`Issued: ${new Date().toISOString().slice(0, 10)}`, margin, y);
  y += 22;

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + contentW, y);
  y += 20;

  const row = (label: string, value: string) => {
    if (y > 760) {
      doc.addPage();
      y = 56;
    }
    color(MUTED);
    font(8, "bold");
    doc.text(label.toUpperCase(), margin, y);
    y += 12;
    color(BODY);
    font(10);
    const lines = doc.splitTextToSize(value || "—", contentW) as string[];
    doc.text(lines, margin, y);
    y += lines.length * 13 + 10;
  };

  const buyerBits = [order.buyer.name, order.buyer.email, order.buyer.phone].filter(Boolean).join(" · ");
  row("Buyer", buyerBits || "Authenticated WhatsApp buyer");
  row("Product", [order.product, order.form_grade].filter(Boolean).join(" — "));
  row("Packing", order.packing);
  row(
    "Quantity",
    `${order.quantity_mt || "—"} MT (±${order.tolerance_pct ?? 5}%)`,
  );
  row("Price", `${money(order.unit_price_usd, order.currency)} · ${order.incoterm} ${order.price_basis}`.trim());
  row("Load port", order.load_port);
  row("Discharge port", order.discharge_port);
  row("Laycan", [order.laycan_from, order.laycan_to].filter(Boolean).join(" → ") || "—");
  row("Payment", order.payment_terms);
  row("Documents / inspection", order.documents);

  if (order.assumed.length) {
    row("Assumed defaults", order.assumed.join("; "));
  }
  if (order.flags.length) {
    row("Desk flags (internal)", order.flags.join("; "));
  }
  if (order.negotiation_summary) {
    row("Negotiation summary", order.negotiation_summary);
  }

  y += 8;
  doc.setFillColor(...LINE);
  doc.roundedRect(margin, y, contentW, 52, 4, 4, "F");
  color(BODY);
  font(8);
  const notice = doc.splitTextToSize(
    "This document is a draft prepared for Aquifert trade desk clearance. It does not constitute a binding contract, offer, or acceptance until a named desk officer clears the order. Supplier identity is withheld.",
    contentW - 24,
  ) as string[];
  doc.text(notice, margin + 12, y + 16);

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

export function firmOrderFilename(order: FirmOrderDraft) {
  const day = new Date().toISOString().slice(0, 10);
  const slug = (order.product || "order").replace(/[^\w]+/g, "-").slice(0, 40);
  return `Aquifert-Firm-Order-${slug}-${day}.pdf`;
}
