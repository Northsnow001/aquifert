import { AQUIFERT_PO_ISSUER, type FirmOrderDraft } from "@/lib/firm-order/types";

/** Shared with the firm-offer PDF so the buyer email uses the same wording. */
export const CONTRACT_LETTERHEAD =
  "Aquifert Limited is a company registered in England and Wales (Company No.14506592) at 71-75 Shelton Street, London WC2H 9JQ.";

export const AQUIFERT_LEGAL_ADDRESS = `AQUIFERT LIMITED
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

export type ContractTerm = { label: string; body: string };
export type ContractClause = { heading: string; body: string };

export type LegalContractCopy = {
  title: string;
  letterhead: string;
  reference: string;
  date: string;
  preamble: string;
  terms: ContractTerm[];
  clauses: ContractClause[];
  sellerSignOff: string;
  counterpartySignOff: string;
  signatoryName: string;
  signatoryTitle: string;
  footer: string;
};

function money(n: number) {
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

/** The commercial contract the firm-offer PDF prints. Sales and purchase use the same clauses. */
export function legalContractCopy(
  order: FirmOrderDraft,
  kind: "sales" | "purchase",
  title = kind === "sales" ? "SALES CONTRACT" : "PURCHASE CONTRACT",
): LegalContractCopy {
  const amount = lineAmount(order);
  const unit = order.unit_price_usd != null ? money(order.unit_price_usd) : "—";
  const counterparty = kind === "sales" ? order.buyer.name || "the Buyer" : order.supplier.name || "the Seller";
  const destination = order.discharge_port || order.price_basis || "";
  const basis = [order.incoterm, destination].filter(Boolean).join(" ");
  const date = displayDate(order.po_date) || displayDate(new Date().toISOString());
  const instrument = title === "FIRM OFFER" ? "Firm Offer" : kind === "sales" ? "Sales Contract" : "Purchase Contract";
  const preamble =
    kind === "sales"
      ? `This ${instrument} is entered into between Aquifert Limited (“Seller”) and ${order.buyer.name || "the Buyer"} (“Buyer”) on the terms and conditions set out below.`
      : `This Purchase Contract is entered into between Aquifert Limited (“Buyer”) and ${order.supplier.name || "the Seller"} (“Seller”) on the terms and conditions set out below.`;

  const terms: ContractTerm[] = [];
  const push = (label: string, body: string) => {
    if (!body.trim()) return;
    terms.push({ label, body });
  };
  if (kind === "sales") {
    push("BUYER:", [order.buyer.name, order.buyer.phone, order.buyer.email].filter(Boolean).join("\n") || "As notified");
    push("SELLER:", AQUIFERT_LEGAL_ADDRESS);
  } else {
    push("BUYER:", AQUIFERT_LEGAL_ADDRESS);
    push(
      "SELLER:",
      [order.supplier.name, order.supplier.attention, order.supplier.address, order.supplier.city, order.supplier.country]
        .filter(Boolean)
        .join("\n") || "As notified",
    );
  }
  if (order.reference && order.reference !== order.order_ref) push("TRADE REFERENCE:", order.reference);
  push("PRODUCT:", [order.product, order.form_grade].filter(Boolean).join(" — "));
  push("QUANTITY:", `${order.quantity_mt || "—"} MTS +/- ${order.tolerance_pct || 5}% IN BUYERS OPTION`);
  push(
    "QUALITY:",
    order.form_grade
      ? `The product shall meet the following specifications: ${order.form_grade}. Quality and quantity as per internationally recognised third-party certificate of analysis at load port.`
      : "The product shall meet the commercially agreed specification. Quality and quantity as per internationally recognised third-party certificate of analysis at load port.",
  );
  if (order.packing) push("PACKING:", order.packing);
  if (order.origin) push("ORIGIN:", order.origin);
  push("DELIVERY:", `${basis} (Incoterms 2020). Duty unpaid, customs uncleared and taxes unpaid unless otherwise stated.`);
  push("FREE DAYS:", "As per standard conditions of the liner.");
  push(
    "SHIPMENT PERIOD:",
    order.shipping
      ? `${order.shipping} from loading port in Seller option. Transhipment is allowed and partial deliveries are allowed.`
      : "As agreed, from loading port in Seller option. Transhipment is allowed and partial deliveries are allowed.",
  );
  push("PRICE:", `USD ${unit} PER METRIC TONNE ${basis}${amount != null ? `. TOTAL VALUE USD ${money(amount)}` : ""}`);
  push(
    "PAYMENT:",
    order.payment_terms ||
      (kind === "sales"
        ? "As stated on the Proforma Invoice. Full amount due into Seller's designated bank account without any discount or rebate. Bank charges for Buyer's account."
        : "As agreed. Payment to Seller's designated bank account without any discount or rebate. Bank charges for Buyer's account."),
  );

  return {
    title,
    letterhead: CONTRACT_LETTERHEAD,
    reference: order.order_ref || order.reference,
    date,
    preamble,
    terms,
    clauses: [
      { heading: "PREPAYMENT ALLOCATION AND REIMBURSEMENT", body: PREPAYMENT_CLAUSE },
      {
        heading: "INSPECTION",
        body:
          kind === "sales"
            ? "As per internationally recognised third party inspections company's (AMSPEC, TCI and SGS etc.) certificate of analysis and quantity at load port for Aquifert cost."
            : "As per internationally recognised third party inspections company's certificate of analysis and quantity at load port for Buyer's cost.",
      },
      {
        heading: "INSURANCE",
        body:
          kind === "sales"
            ? "For Seller's account and responsibility as per Incoterms 2020."
            : "For Buyer's account and responsibility as per Incoterms 2020.",
      },
      { heading: "UNLOADING/UNSTUFFING CONTAINERS", body: UNLOADING_CLAUSE },
      { heading: "RETURNING CONTAINERS", body: RETURNING_CLAUSE },
      { heading: "GOVERNING LAW AND JURISDICTION", body: LAW_CLAUSE },
      {
        heading: "GENERAL TERMS",
        body: "The provisions of Incoterms 2020 and the General Terms and Conditions for CFR/CIF sales of Aquifert Limited shall be incorporated into this contract. In the event of any inconsistency between those terms and this contract, this contract shall prevail.",
      },
    ],
    sellerSignOff: "FOR AND ON BEHALF OF AQUIFERT LTD",
    counterpartySignOff: `FOR AND ON BEHALF OF ${counterparty.toUpperCase()}`,
    signatoryName: "MATT O'LEARY",
    signatoryTitle: "MANAGING DIRECTOR",
    footer: AQUIFERT_PO_ISSUER.footer,
  };
}
