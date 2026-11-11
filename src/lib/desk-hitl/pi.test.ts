import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPiEditor, proformaFromN8n, valuesFromPi } from "@/lib/desk-hitl/pi";

const n8nPayload = {
  document: "proforma",
  product: "Calcium nitrate",
  quantity_mt: 200,
  buyer_unit_price: 456,
  currency: "USD",
  incoterm: "FOB",
  discharge_port: "Shanghai",
  reference: "rfq#008",
  order_ref: "AQ000008",
  buyer: { name: "Kayode Daniel", email: "kaytoba49@gmail.com", phone: "2349022834241" },
  supplier: { name: "Harbour Fertiliser" },
};

describe("proformaFromN8n", () => {
  it("accepts the WF11 payload and strips the supplier", () => {
    const order = proformaFromN8n(n8nPayload);
    assert.ok(order);
    assert.equal(order.document, "proforma");
    assert.equal(order.unit_price_usd, 456);
    assert.equal(order.supplier.name, "");
    assert.equal(order.buyer.email, "kaytoba49@gmail.com");
  });

  it("rejects a firm offer", () => {
    assert.equal(proformaFromN8n({ ...n8nPayload, document: "firm_offer" }), null);
  });
});

describe("applyPiEditor", () => {
  it("writes Matt’s edits onto the PDF fields without restoring the supplier", () => {
    const base = proformaFromN8n(n8nPayload);
    assert.ok(base);
    const values = valuesFromPi(base);
    const next = applyPiEditor(base, {
      ...values,
      unitPrice: "460",
      packing: "25kg bags",
      additionalInformation: "Validity 7 days.",
    });
    assert.ok(!("error" in next));
    assert.equal(next.unit_price_usd, 460);
    assert.equal(next.packing, "25kg bags");
    assert.equal(next.additional_information, "Validity 7 days.");
    assert.equal(next.document, "proforma");
    assert.equal(next.supplier.name, "");
  });
});
