import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { fmtDate, gbp } from "@/lib/format";
import { toast } from "sonner";

export type InvoicePdfData = {
  invoiceNumber: string;
  type: string;
  date: Date | string;
  dueDate?: Date | string | null;
  buyerName: string;
  buyerOrg?: string | null;
  buyerAddress?: string | null;
  orderNumber: string;
  product: string;
  quantity: number;
  productCost: number;
  shippingCost: number;
  clearingCost: number;
  total: number;
  showBreakdown: boolean;
};

export async function generateInvoicePdf(d: InvoicePdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Branded header
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, W, 92, "F");
  doc.setFillColor(79, 127, 114);
  doc.rect(40, 28, 30, 30, "F");
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("A", 51, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("AQUIFERT", 82, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Fertilizer Trading, Reimagined · aquifert.com · trade@aquifert.com", 82, 66);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(d.type === "PROFORMA" ? "PROFORMA INVOICE" : d.type.replace(/_/g, " "), W - 40, 52, { align: "right" });

  // Meta
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  let y = 124;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice No:", 40, y);
  doc.text("Issue Date:", 40, y + 16);
  doc.text("Due Date:", 40, y + 32);
  doc.text("Order Ref:", 40, y + 48);
  doc.setFont("helvetica", "normal");
  doc.text(d.invoiceNumber, 115, y);
  doc.text(fmtDate(d.date), 115, y + 16);
  doc.text(fmtDate(d.dueDate), 115, y + 32);
  doc.text(d.orderNumber, 115, y + 48);

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", W - 260, y);
  doc.setFont("helvetica", "normal");
  doc.text(d.buyerOrg ?? d.buyerName, W - 260, y + 16);
  doc.text(d.buyerName, W - 260, y + 32);
  if (d.buyerAddress) {
    const lines = doc.splitTextToSize(d.buyerAddress, 220);
    doc.text(lines, W - 260, y + 48);
  }

  // Line items table
  y = 210;
  doc.setFillColor(240, 245, 250);
  doc.rect(40, y, W - 80, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIPTION", 48, y + 17);
  doc.text("AMOUNT (GBP)", W - 48, y + 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const rows: [string, number][] = d.showBreakdown
    ? [
        [`${d.product}, ${d.quantity.toLocaleString()} tons (product cost)`, d.productCost],
        ["Ocean freight & insurance", d.shippingCost],
        ["UK port clearing & duties", d.clearingCost],
      ]
    : [[`${d.product}, ${d.quantity.toLocaleString()} tons (all-inclusive landed cost)`, d.total]];
  y += 26;
  rows.forEach(([label, amount], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 252, 254);
      doc.rect(40, y, W - 80, 24, "F");
    }
    doc.text(label, 48, y + 16);
    doc.text(gbp(amount), W - 48, y + 16, { align: "right" });
    y += 24;
  });

  // Totals
  y += 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, y, W - 40, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TOTAL DUE", 48, y);
  doc.setTextColor(0, 51, 102);
  doc.text(gbp(d.total), W - 48, y, { align: "right" });
  doc.setTextColor(30, 41, 59);

  // Bank details + QR
  y += 40;
  doc.setFontSize(10);
  doc.text("Payment Details", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Bank: Barclays Bank UK plc · Account: AQUIFERT Trading Ltd", 40, y + 16);
  doc.text("Sort Code: 20-00-00 · Account No: 13847562 · IBAN: GB29 BUKB 2000 0013 8475 62", 40, y + 30);
  doc.text(`Reference: ${d.invoiceNumber}`, 40, y + 44);

  try {
    const qr = await QRCode.toDataURL(`AQUIFERT:PAY:${d.invoiceNumber}:${d.total}`, { margin: 0, width: 96 });
    doc.addImage(qr, "PNG", W - 136, y - 6, 80, 80);
    doc.setFontSize(8);
    doc.text("Scan to pay", W - 96, y + 84, { align: "center" });
  } catch {
    /* QR optional */
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(
    "AQUIFERT Ltd · Registered in England & Wales · VAT GB 445 8890 12 · This document was generated electronically and is valid without signature.",
    W / 2,
    800,
    { align: "center" },
  );

  doc.save(`${d.invoiceNumber}.pdf`);
}

export function InvoiceDownloadButton({ data, label = "Download PDF" }: { data: InvoicePdfData; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="aqf-btn-press"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await generateInvoicePdf(data);
          toast.success("Invoice PDF downloaded");
        } catch {
          toast.error("Could not generate PDF");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
      {label}
    </Button>
  );
}
