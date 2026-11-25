import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firmOfferEmailDocument } from "@/lib/firm-order/offer-email";
import { parseFirmOrder } from "@/lib/firm-order/types";

describe("firmOfferEmailDocument", () => {
  it("uses the firm offer document, not the old plain letter", () => {
    const order = parseFirmOrder({
      document: "firm_offer",
      reference: "rfq#105",
      order_ref: "FO-0105",
      product: "DAP",
      form_grade: "high grade",
      packing: "34kg bags",
      origin: "Any origin",
      quantity_mt: 780,
      buyerPrice: 840,
      incoterm: "FOB",
      discharge_port: "Nigeria",
      shipping: "Within 2 weeks",
      payment_terms: "SBLC",
      buyer: { name: "Harbour Buyer", email: "buyer@example.com", phone: "+234" },
    });
    assert.ok(order);
    const mail = firmOfferEmailDocument({ order, note: "Dear Harbour, thank you." });
    assert.match(mail.html, /FIRM OFFER/);
    assert.match(mail.html, /FO-0105/);
    assert.match(mail.html, /Harbour Buyer/);
    assert.match(mail.html, /34kg bags/);
    assert.match(mail.html, /Any origin/);
    assert.match(mail.html, /USD 840\.00 PER METRIC TONNE FOB Nigeria/);
    assert.match(mail.html, /TOTAL VALUE USD 655,200\.00/);
    assert.match(mail.html, /PREPAYMENT ALLOCATION AND REIMBURSEMENT/);
    assert.match(mail.html, /GOVERNING LAW AND JURISDICTION/);
    assert.match(mail.html, /MATT O&#39;LEARY/);
    assert.match(mail.html, /Reply YES to this email to accept this firm offer/);
    assert.match(mail.text, /780 MTS \+\/- 5% IN BUYERS OPTION/);
    assert.doesNotMatch(mail.text, /The offer is this email/);
    assert.doesNotMatch(mail.html, /Matt will replace this paragraph/);
  });
});
