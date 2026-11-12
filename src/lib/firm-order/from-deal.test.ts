import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buyerDocumentFromDeal, firmOrderFromDeal, salesContractDraftFromDeal, salesContractFromPi, supplierDocumentFromDeal } from "@/lib/firm-order/from-deal";
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

  it("buyer firm offer uses indication price and hides the supplier", () => {
    const offer = buyerDocumentFromDeal(deal, "firm_offer");
    assert.ok(offer);
    assert.equal(offer.unit_price_usd, 221.4);
    assert.equal(offer.supplier.name, "");
    assert.equal(offer.document, "firm_offer");
    assert.equal(offer.order_ref, "FO-0002");
  });

  it("buyer proforma uses indication price and hides the supplier", () => {
    const pi = buyerDocumentFromDeal(deal, "proforma");
    assert.ok(pi);
    assert.equal(pi.unit_price_usd, 221.4);
    assert.equal(pi.supplier.name, "");
    assert.equal(pi.document, "proforma");
  });

  it("sales contract from PI keeps buyer price and hides supplier", () => {
    const pi = buyerDocumentFromDeal(deal, "proforma");
    assert.ok(pi);
    pi.supplier.name = "Harbour Fertiliser";
    const contract = salesContractFromPi(pi);
    assert.equal(contract.document, "sales_contract");
    assert.equal(contract.unit_price_usd, 221.4);
    assert.equal(contract.supplier.name, "");
    assert.notEqual(contract.order_ref, pi.order_ref);
  });

  it("desk sales contract preview prefers Matt’s saved draft", () => {
    const pi = buyerDocumentFromDeal(deal, "proforma");
    assert.ok(pi);
    const fromPi = salesContractDraftFromDeal({ ...deal, pi: { status: "sent", updatedAt: "", sentAt: null, sentTo: null, order: pi } });
    assert.equal(fromPi?.document, "sales_contract");
    assert.equal(fromPi?.unit_price_usd, 221.4);
    const edited = { ...salesContractFromPi(pi), packing: "jumbo", unit_price_usd: 500 };
    const fromDraft = salesContractDraftFromDeal({
      ...deal,
      pi: { status: "sent", updatedAt: "", sentAt: null, sentTo: null, order: pi },
      salesContract: { status: "review", updatedAt: "", sentAt: null, sentTo: null, order: edited },
    });
    assert.equal(fromDraft?.packing, "jumbo");
    assert.equal(fromDraft?.unit_price_usd, 500);
    assert.equal(fromDraft?.supplier.name, "");
  });

  it("supplier pack stays on offer cost", () => {
    const pack = supplierDocumentFromDeal(deal, "purchase_contract");
    assert.ok(pack);
    assert.equal(pack.unit_price_usd, 205);
    assert.equal(pack.supplier.name, "Harbour Fertiliser");
  });

  it("WhatsApp execution terms fill packing, origin, payment and window on buyer and supplier docs", () => {
    const locked = {
      ...deal,
      execution: {
        packing: "25kg bags in jumbo",
        origin: "China",
        destinationPort: "Manzanillo",
        incoterm: "CFR",
        shipmentWindow: "January 2026",
        paymentTerms: "BL + 90",
        inspection: "SGS at load",
        documentation: "COA, COO",
        specification: "KH2PO4 99%",
        urgency: "30-60 Days",
        notes: "Private label ok",
        confirmedAt: "2026-11-12T00:00:00.000Z",
      },
    } as DeskDeal;
    const offer = buyerDocumentFromDeal(locked, "firm_offer");
    assert.ok(offer);
    assert.equal(offer.packing, "25kg bags in jumbo");
    assert.equal(offer.origin, "China");
    assert.equal(offer.discharge_port, "Manzanillo");
    assert.equal(offer.incoterm, "CFR");
    assert.equal(offer.shipping, "January 2026");
    assert.equal(offer.payment_terms, "BL + 90");
    assert.equal(offer.form_grade, "KH2PO4 99%");
    assert.match(offer.documents, /SGS/);
    const po = firmOrderFromDeal(locked);
    assert.ok(po);
    assert.equal(po.packing, "25kg bags in jumbo");
    assert.equal(po.unit_price_usd, 205);
    assert.equal(po.payment_terms, "BL + 90");
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
