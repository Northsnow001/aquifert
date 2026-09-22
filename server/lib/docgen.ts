/**
 * Class-A document regeneration, Aquifert-issuable documents are REGENERATED
 * from structured trade data on Aquifert letterhead, never a supplier original
 * with a logo added. Content may originate from the supplier's lab (e.g. COA
 * batch results); the instrument is always Aquifert's.
 */

export interface DocGenContext {
  tradeRef: string;
  sellContractRef?: string | null;
  buyerName: string;
  product: string;
  sellSpec?: string | null;
  sellQtyMt?: number | null;
  tolerancePct?: number | null;
  sellPricePerMt?: number | null;
  currency: string;
  destination: string;
  consignee?: string | null;
  batchNo?: string | null;
  analysisResult?: string | null;
  containers?: string | null;
  packing?: string | null;
}

function header(title: string, c: DocGenContext) {
  return [
    "════════════════════════════════════════════════════════════",
    "  AQUIFERT LIMITED · London, United Kingdom",
    `  ${title}`,
    "════════════════════════════════════════════════════════════",
    `  Trade reference : ${c.tradeRef}`,
    c.sellContractRef ? `  Contract ref    : ${c.sellContractRef}` : null,
    `  Issued          : ${new Date().toISOString().slice(0, 10)}`,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

const FOOTER = [
  "",
  "────────────────────────────────────────────────────────────",
  "  This document is issued by Aquifert Limited under its General",
  "  Terms & Conditions. Regenerated from verified trade data.",
  "────────────────────────────────────────────────────────────",
].join("\n");

export function regenerateClassA(
  docType: "INVOICE" | "PACKING_LIST" | "CERTIFICATE" | "CUSTOMS" | "SDS",
  c: DocGenContext,
): string {
  const qty = c.sellQtyMt != null ? `${c.sellQtyMt} MT${c.tolerancePct ? ` ±${c.tolerancePct}% at seller's option` : ""}` : "As per contract";
  switch (docType) {
    case "INVOICE":
      return (
        header("COMMERCIAL INVOICE", c) +
        [
          `  Seller          : Aquifert Limited, London`,
          `  Buyer           : ${c.buyerName}`,
          c.consignee ? `  Consignee       : ${c.consignee}` : null,
          `  Product         : ${c.product}${c.sellSpec ? `, ${c.sellSpec}` : ""}`,
          `  Quantity        : ${qty}`,
          c.sellPricePerMt != null ? `  Unit price      : ${c.currency} ${c.sellPricePerMt.toFixed(2)} / MT` : null,
          c.sellPricePerMt != null && c.sellQtyMt != null
            ? `  Total value     : ${c.currency} ${(c.sellPricePerMt * c.sellQtyMt).toFixed(2)}`
            : null,
          `  Destination     : ${c.destination}`,
          "",
          "  Payment         : As per contract payment terms.",
        ]
          .filter(Boolean)
          .join("\n") +
        FOOTER
      );
    case "PACKING_LIST":
      return (
        header("PACKING LIST", c) +
        [
          `  Product         : ${c.product}`,
          `  Quantity        : ${qty}`,
          `  Packing         : ${c.packing ?? "25kg bags on pallets, in containers"}`,
          c.containers ? `  Containers      : ${c.containers}` : null,
          `  Destination     : ${c.destination}`,
        ]
          .filter(Boolean)
          .join("\n") +
        FOOTER
      );
    case "CERTIFICATE":
      return (
        header("CERTIFICATE OF ANALYSIS / QUANTITY", c) +
        [
          `  Product         : ${c.product}`,
          c.batchNo ? `  Batch           : ${c.batchNo}` : null,
          `  Contract spec   : ${c.sellSpec ?? "As per contract"}`,
          c.analysisResult ? `  Analysis result : ${c.analysisResult}` : null,
          `  Quantity        : ${qty}`,
          "",
          "  We certify that the above results conform to the contractual",
          "  specification. Findings final and binding as per contract.",
        ]
          .filter(Boolean)
          .join("\n") +
        FOOTER
      );
    default:
      return (
        header(docType.replace(/_/g, " "), c) +
        [`  Product         : ${c.product}`, `  Quantity        : ${qty}`, `  Destination     : ${c.destination}`].join("\n") +
        FOOTER
      );
  }
}
