import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFirmOfferEditor, applyPiEditor, applySalesContractEditor, proformaFromN8n, valuesFromPi } from "@/lib/desk-hitl/pi";
import { FO_ATTACHMENT_KINDS } from "@/lib/desk-hitl/types";

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

describe("FO pack kinds", () => {
  it("only allows COA, TDS and photo", () => {
    assert.deepEqual([...FO_ATTACHMENT_KINDS], ["coa", "tds", "photo"]);
  });
});

describe("applyFirmOfferEditor", () => {
  it("keeps buyer price and marks the document as a firm offer", () => {
    const base = proformaFromN8n(n8nPayload);
    assert.ok(base);
    const next = applyFirmOfferEditor(base, {
      ...valuesFromPi(base),
      packing: "25kg bags",
      unitPrice: "221.4",
    });
    assert.ok(!("error" in next));
    assert.equal(next.document, "firm_offer");
    assert.equal(next.unit_price_usd, 221.4);
    assert.equal(next.packing, "25kg bags");
    assert.equal(next.supplier.name, "");
  });
});

describe("applySalesContractEditor", () => {
  it("keeps buyer price and marks the document as a sales contract", () => {
    const base = proformaFromN8n(n8nPayload);
    assert.ok(base);
    const next = applySalesContractEditor(base, {
      ...valuesFromPi(base),
      packing: "jumbo bags",
      unitPrice: "470",
    });
    assert.ok(!("error" in next));
    assert.equal(next.document, "sales_contract");
    assert.equal(next.unit_price_usd, 470);
    assert.equal(next.packing, "jumbo bags");
    assert.equal(next.supplier.name, "");
  });
});
