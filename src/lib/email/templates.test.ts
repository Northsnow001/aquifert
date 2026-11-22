import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { millFirmOfferEmail, millSupplierPackEmail } from "@/lib/email/templates";

describe("millFirmOfferEmail", () => {
  it("uses the mill quote and never the buyer indication", () => {
    const mail = millFirmOfferEmail({
      requestId: "rfq#081",
      supplierName: "Harbour",
      product: "Cursor IV",
      quantityMt: 800,
      packing: "bulk",
      documentation: "",
      incoterm: "CIF",
      destination: "Delhi",
      shipping: "2-week window",
      paymentTerms: "CAD",
      priceLine: "USD 600 / MT",
    });
    assert.match(mail.subject, /rfq#081/);
    assert.match(mail.text, /USD 600 \/ MT/);
    assert.match(mail.html, /USD 600 \/ MT/);
    assert.doesNotMatch(mail.text, /648/);
    assert.doesNotMatch(mail.html, /648/);
  });
});

describe("millSupplierPackEmail", () => {
  it("uses the mill quote and never the buyer indication", () => {
    const mail = millSupplierPackEmail({
      requestId: "rfq#081",
      supplierName: "Whorl Fert",
      product: "Cursor IV",
      quantityMt: 800,
      priceLine: "USD 600 / MT",
    });
    assert.match(mail.text, /USD 600 \/ MT/);
    assert.match(mail.text, /purchase order/i);
    assert.doesNotMatch(mail.text, /648/);
  });
});
