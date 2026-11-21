import "server-only";

import {
  getTradeRfqDesk,
  getTradeRfqRecord,
  listTradeSuppliers,
  logTradeMessage,
  markSupplierLastRfq,
  patchTradeRfq,
  saveSupplierChatState,
  upsertRfqAsk,
} from "@/lib/trade/store";
import { sendWechatTemplate, sendWechatText } from "@/lib/wechat/send";

function asText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function qtyLabel(value: unknown) {
  const raw = asText(value);
  if (!raw) return "";
  const n = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return n ? `${n[1]}MT` : raw;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rfqAskCopy(rfq: Record<string, unknown>) {
  const code = asText(rfq.code);
  const product = asText(rfq.product_label);
  const quantity = qtyLabel(rfq.quantity_mt);
  const packing = asText(rfq.packing);
  const incoterm = asText(rfq.incoterm);
  const dest = asText(rfq.destination_port) || asText(rfq.destination_country);
  const shipping = asText(rfq.shipment_window);
  const price = [incoterm, dest].filter(Boolean).join(" ");
  const text = [
    `Aquifert enquiry ${code}`,
    product ? `Product: ${product}` : "",
    quantity ? `Quantity: ${quantity}` : "",
    packing ? `Packing: ${packing}` : "",
    dest ? `Destination: ${dest}` : "",
    shipping ? `Timing: ${shipping}` : "",
    incoterm ? `Incoterm: ${incoterm}` : "",
    "Please reply with this RFQ No., then product, USD/MT, Incoterms, qty, packing, load port, validity — or NO OFFER.",
    "",
    `Aquifert 询盘 ${code}`,
    "请回复该询盘编号，以及产品、美元/吨、贸易术语、数量、包装、装货港、有效期，或回复无报价。",
  ]
    .filter((line, index, rows) => line !== "" || rows[index - 1] !== "")
    .join("\n");
  return {
    tradeId: code,
    product,
    quantity,
    packing,
    price: price || "-",
    shipping,
    text,
  };
}

export async function fanOutBuyerRfq(rfqId: string, input?: { resendFailed?: boolean }) {
  const rfq = await getTradeRfqRecord(rfqId);
  if (!rfq) throw new Error("Buyer request not found.");
  const copy = rfqAskCopy(rfq);
  const existing = (await getTradeRfqDesk(rfqId).catch(() => null))?.asks ?? [];
  const prior = Object.fromEntries(existing.map((ask) => [ask.supplierId, ask]));
  const suppliers = await listTradeSuppliers();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const mill of suppliers) {
    const prev = prior[mill.id];
    const openid = mill.wechatOpenid?.trim() || "";
    if (!openid) {
      await upsertRfqAsk({ rfqId, supplierId: mill.id, status: "skipped", error: "No WeChat ID" });
      skipped += 1;
      continue;
    }
    if (prev?.status === "quoted" || prev?.status === "no_offer") continue;
    if (prev?.status === "sent" && !input?.resendFailed) continue;
    if (input?.resendFailed && prev && prev.status !== "failed") continue;

    const template = await sendWechatTemplate(openid, copy);
    let ok = template.ok;
    let error = template.ok ? "" : template.error;
    if (!ok) {
      const text = await sendWechatText(openid, copy.text);
      ok = text.ok;
      error = [error, text.ok ? "" : text.error].filter(Boolean).join(" · ");
    }
    await logTradeMessage({
      direction: "out",
      channel: "wechat",
      supplierId: mill.id,
      rfqId,
      toAddress: openid,
      body: copy.text,
      payload: { event: "rfq_fanout", agent: "wechat-rfq-fanout", error: ok ? undefined : error, tradeId: copy.tradeId },
    });
    await upsertRfqAsk({
      rfqId,
      supplierId: mill.id,
      status: ok ? "sent" : "failed",
      error: ok ? "" : error,
      extras: { tradeId: copy.tradeId },
    });
    if (ok) {
      sent += 1;
      await saveSupplierChatState(mill.id, {
        stage: "awaiting_previous_quote",
        quoteType: "previous",
        rfqId: copy.tradeId,
        missingFields: [],
        followUpCount: 0,
        captured: {},
      }).catch(() => undefined);
      await markSupplierLastRfq(mill.id, copy.tradeId).catch(() => undefined);
    } else failed += 1;
    await sleep(80);
  }
  if (sent > 0 || asText(rfq.status) === "open") {
    await patchTradeRfq(rfqId, { status: "rfq_sent" });
  }
  return { sent, failed, skipped, total: suppliers.length, code: copy.tradeId };
}
