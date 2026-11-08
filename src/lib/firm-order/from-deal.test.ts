import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyerDocumentFromDeal, firmOrderFromDeal } from "@/lib/firm-order/from-deal";
import { parseFirmOrder } from "@/lib/firm-order/types";
import type { DeskDeal } from "@/lib/desk-hitl/types";

const deal = {
  id: "deal-rfq-002",
  requestId: "rfq#002",
  product: "Sulphuric dioxide",
  quantityMt: 600,
  destination: "Lagos",
  incoterm: "FOB",
  buyerName: "Kayode Daniel",
  buyerPhone: "+2349022834241",
  buyerPrice: 221.4,
  marginPct: 8,
  currency: "USD",
  selectedOfferId: "off-harbour",
  offers: [
    {
      id: "off-harbour",
      supplierName: "Harbour Fertiliser",
      unitPrice: 205,
      currency: "USD",
      incoterm: "FOB Qingdao",
      quantityMt: 600,
      loadPort: "Qingdao",
      destination: "Lagos",
      receivedAt: "",
      notes: "Packing: 25kg bags",
      wechatOpenId: "ovOFi3E3kW8qc8PI_FlNLxwBfOuk",
    },
  ],
} as unknown as DeskDeal;

describe("firmOrderFromDeal", () => {
  it("uses supplier unit price, never buyer indication", () => {
    const po = firmOrderFromDeal(deal);
    assert.ok(po);
    assert.equal(po.unit_price_usd, 205);
    assert.notEqual(po.unit_price_usd, deal.buyerPrice);
    assert.equal(po.order_ref, "PO-0002");
    assert.equal(po.reference, "rfq#002");
    assert.equal(po.supplier.name, "Harbour Fertiliser");
    assert.equal(po.packing, "25kg bags");
    assert.equal(po.document, "purchase_order");
  });

  it("buyer proforma uses indication price and hides the supplier", () => {
    const pi = buyerDocumentFromDeal(deal, "proforma");
    assert.ok(pi);
    assert.equal(pi.unit_price_usd, 221.4);
    assert.equal(pi.supplier.name, "");
    assert.equal(pi.document, "proforma");
  });
});

describe("parseFirmOrder supplier price aliases", () => {
  it("prefers supplierUnitPrice over unit_price_usd", () => {
    const order = parseFirmOrder({
      product: "Urea",
      unit_price_usd: 221.4,
      supplierUnitPrice: 205,
      supplier_name: "Harbour Fertiliser",
    });
    assert.ok(order);
    assert.equal(order.unit_price_usd, 205);
    assert.equal(order.supplier.name, "Harbour Fertiliser");
  });
});
