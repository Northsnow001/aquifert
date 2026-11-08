import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFirmOrder, purchaseOrderNumber } from "@/lib/firm-order/types";

describe("parseFirmOrder", () => {
  it("accepts negotiator payload", () => {
    const order = parseFirmOrder({
      status: "PURCHASE_ORDER",
      product: "Granular Urea",
      form_grade: "46% N",
      packing: "50kg bags",
      quantity_mt: 20,
      tolerance_pct: 5,
      unit_price_usd: 420,
      currency: "USD",
      incoterm: "CFR",
      price_basis: "Lagos Apapa",
      buyer: { name: "Kayode", email: "a@b.com", phone: "234" },
      flags: ["Laycan > 90 days"],
      assumed: ["Tolerance ±5%"],
    });
    assert.ok(order);
    assert.equal(order.product, "Granular Urea");
    assert.equal(order.quantity_mt, 20);
    assert.equal(order.buyer.name, "Kayode");
    assert.equal(order.unit_price_usd, 420);
  });

  it("unwraps firm_order wrapper", () => {
    const order = parseFirmOrder({ firm_order: { product: "DAP", quantity_mt: "100", supplierUnitPrice: 380 } });
    assert.ok(order);
    assert.equal(order.product, "DAP");
    assert.equal(order.quantity_mt, 100);
    assert.equal(order.document, "purchase_order");
    assert.equal(order.unit_price_usd, 380);
  });

  it("locks proforma to buyer price when both prices are present", () => {
    const order = parseFirmOrder({
      document: "proforma",
      product: "Sulphuric dioxide",
      buyerPrice: 221.4,
      supplierUnitPrice: 205,
    });
    assert.ok(order);
    assert.equal(order.document, "proforma");
    assert.equal(order.unit_price_usd, 221.4);
  });

  it("refuses a proforma that only has supplier cost", () => {
    assert.equal(parseFirmOrder({ document: "proforma", product: "Urea", supplierUnitPrice: 205 }), null);
  });

  it("rejects empty product", () => {
    assert.equal(parseFirmOrder({ product: "" }), null);
  });

  it("mints PO-0002 from rfq#002", () => {
    assert.equal(purchaseOrderNumber("rfq#002"), "PO-0002");
  });
});
