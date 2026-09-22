import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";
import { scanText, type ProtectedEntityInput } from "./lib/firewall";

type ChatMessage = { from: string; text: string; at: string };

async function entitiesForOrder(orderId: number | null | undefined): Promise<ProtectedEntityInput[]> {
  if (!orderId) return [];
  const rows = await getDb().query.protectedEntities.findMany({ where: eq(s.protectedEntities.orderId, orderId) });
  return rows.map((r) => ({
    entityName: r.entityName,
    aliases: (r.aliases as string[]) ?? [],
    phones: (r.phones as string[]) ?? [],
    addresses: (r.addresses as string[]) ?? [],
    bankAccounts: (r.bankAccounts as string[]) ?? [],
    contacts: (r.contacts as string[]) ?? [],
  }));
}

async function tradeContext(orderId: number) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
  if (!order) throw new Error("Trade not found");
  const quote = await db.query.quotes.findFirst({ where: eq(s.quotes.id, order.quoteId) });
  const request = quote ? await db.query.requests.findFirst({ where: eq(s.requests.id, quote.requestId) }) : null;
  const buyer = request ? await db.query.users.findFirst({ where: eq(s.users.id, request.buyerId) }) : null;
  const buyerOrg = buyer?.organizationId
    ? await db.query.organizations.findFirst({ where: eq(s.organizations.id, buyer.organizationId) })
    : null;
  return { order, quote, request, buyer, buyerOrg };
}

/**
 * AI communication agent, orchestrates early-stage trade discovery while a
 * human holds every commitment point (spine Stages 4, 5, 7) and, per the
 * trading rules, the per-buyer profit margin is ALWAYS a final human-review
 * step before anything reaches the buyer.
 */
export const agentRouter = createRouter({
  /** Approval queue, every pending/decided agent draft. */
  queue: authedQuery
    .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SENT"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertStaff(await effUser(ctx.user));
      const db = getDb();
      const drafts = await db.select().from(s.agentDrafts).orderBy(desc(s.agentDrafts.createdAt)).limit(100);
      const filtered = drafts.filter((d) => !input?.status || d.status === input.status);
      return Promise.all(
        filtered.map(async (d) => {
          let buyerName: string | null = null;
          let tradeRef: string | null = null;
          if (d.orderId) {
            const { order, buyer, buyerOrg } = await tradeContext(d.orderId);
            buyerName = buyerOrg?.name ?? buyer?.name ?? null;
            tradeRef = order.tradeRef ?? order.orderNumber;
          }
          return { ...d, buyerName, tradeRef };
        }),
      );
    }),

  /** Stage 4 gate, firm offer with short validity (48h). Human must release. */
  draftFirmOffer: authedQuery.input(z.object({ requestId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const req = await db.query.requests.findFirst({ where: eq(s.requests.id, input.requestId) });
    if (!req) throw new Error("Request not found");
    const validUntil = new Date(Date.now() + 48 * 36e5);
    const draftText = [
      `FIRM OFFER, valid 48 hours (expires ${validUntil.toUTCString()})`,
      ``,
      `Product: ${req.product}, specification as discussed`,
      `Quantity: ${req.quantity} MT`,
      `Destination: ${req.destination} (${req.incoterms})`,
      req.deliveryDate ? `Shipment window: ${req.deliveryDate.toISOString().slice(0, 10)}` : `Shipment window: prompt`,
      `Packing: 25kg buyer's-design bags on pallets, in containers`,
      `Inspection: seller's certificate final; buyer holds the option of an independent inspector at buyer's cost.`,
      `Payment terms: to be proposed, our standard is 30% T/T prepayment, 70% against scanned shipping documents.`,
    ].join("\n");
    const [{ id }] = await db
      .insert(s.agentDrafts)
      .values({
        kind: "FIRM_OFFER",
        requestId: req.id,
        title: `Firm offer, ${req.quantity} MT ${req.product} → ${req.destination}`,
        draftText,
        payload: { validUntil: validUntil.toISOString(), requestNumber: req.requestNumber, stage: 4 },
      })
      .returning({ id: s.agentDrafts.id });
    await logActivity("AQUIFERT AI", `Drafted firm offer for ${req.requestNumber}, awaiting human release (Stage 4 gate)`, "request", req.requestNumber);
    return { id };
  }),

  /** Stage 5 gate, trade recap email. Human must approve before issue. */
  draftRecap: authedQuery.input(z.object({ orderId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const { order, request, buyerOrg, buyer } = await tradeContext(input.orderId);
    const db = getDb();
    const draftText = [
      `TRADE RECAP, please confirm by return`,
      ``,
      `Dear ${buyerOrg?.name ?? buyer?.name ?? "Buyer"},`,
      ``,
      `Further to our exchange, we confirm the following terms:`,
      `· Product: ${request?.product ?? ""}, ${order.sellSpec ?? "spec as agreed"}`,
      `· Quantity: ${order.sellQtyMt ?? request?.quantity ?? ""} MT${order.tolerancePct ? ` ±${order.tolerancePct}% at seller's option` : ""}`,
      `· Destination: ${request?.destination ?? ""}`,
      `· Packing: 25kg buyer's-design bags on pallets, in containers`,
      `· Inspection: ${order.inspectionBasis === "THIRD_PARTY" ? "independent third-party inspection at loading" : "seller's certificate, buyer holding the option of independent inspection"}`,
      `· Payment: 30% T/T prepayment, 70% within 3 working days of scanned shipping documents`,
      `· Contract: to follow on Aquifert General Terms & Conditions`,
    ].join("\n");
    const [{ id }] = await db
      .insert(s.agentDrafts)
      .values({
        kind: "RECAP",
        orderId: order.id,
        title: `Trade recap, ${order.tradeRef ?? order.orderNumber}`,
        draftText,
        payload: { stage: 5, tradeRef: order.tradeRef },
      })
      .returning({ id: s.agentDrafts.id });
    await logActivity("AQUIFERT AI", `Drafted recap for ${order.tradeRef ?? order.orderNumber}, awaiting human approval (Stage 5 gate)`, "order", String(order.id));
    return { id };
  }),

  /** Stage 7 gate, back-to-back contract execution summary. Human signs off. */
  draftContract: authedQuery.input(z.object({ orderId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const { order, request, buyerOrg, buyer } = await tradeContext(input.orderId);
    const db = getDb();
    const draftText = [
      `CONTRACT EXECUTION, Deal B summary (Aquifert → ${buyerOrg?.name ?? buyer?.name ?? "Buyer"})`,
      ``,
      `Sell-side contract ${order.sellContractRef ?? "(to be issued)"} on Aquifert General Terms & Conditions:`,
      `· Product/spec: ${request?.product ?? ""}, ${order.sellSpec ?? "as agreed"} (buy-side ${order.buySpec ?? "tighter"}, buffer intact)`,
      `· Quantity: ${order.sellQtyMt ?? ""} MT ±${order.tolerancePct ?? 0}% (buy-side firm ${order.buyQtyMt ?? ""} MT)`,
      `· Key terms carried across from the buy-side; supplier contract never disclosed.`,
    ].join("\n");
    const [{ id }] = await db
      .insert(s.agentDrafts)
      .values({
        kind: "CONTRACT",
        orderId: order.id,
        title: `Contract execution, ${order.tradeRef ?? order.orderNumber}`,
        draftText,
        payload: { stage: 7, tradeRef: order.tradeRef },
      })
      .returning({ id: s.agentDrafts.id });
    await logActivity("AQUIFERT AI", `Drafted contract summary for ${order.tradeRef ?? order.orderNumber}, awaiting human sign-off (Stage 7 gate)`, "order", String(order.id));
    return { id };
  }),

  /**
   * THE MARGIN GATE, the profit margin varies per buyer and is always the
   * final human-review step inside the AI communication channel. The agent
   * assembles the inputs (buy-side FOB, freight read, buyer margin profile,
   * market context) and proposes a sell price; NOTHING is sent to the buyer
   * until a human approves. The buyer-facing text carries the sell price
   * only, never the buy side.
   */
  proposeMargin: authedQuery.input(z.object({ orderId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const { order, quote, request, buyerOrg, buyer } = await tradeContext(input.orderId);
    if (!request || !quote) throw new Error("Trade context incomplete");

    const qty = Number(order.sellQtyMt ?? request.quantity ?? 0) || 1;
    const buyPerMt = Number(order.buyPricePerMt ?? quote.productCost / qty);
    const freightPerMt = Number(order.freightPerMt ?? (quote.shippingCost + quote.clearingCost) / qty);
    const profilePct = Number(buyerOrg?.marginProfilePct ?? 0);
    const pct = profilePct > 0 ? profilePct : 8; // fallback when no buyer profile set
    const isZero = order.dealType === "AQ_ZERO";
    const marginPerMt = isZero ? 0 : Math.round(((buyPerMt + freightPerMt) * (pct / 100)) * 100) / 100;
    const sellPerMt = Math.round((buyPerMt + freightPerMt + marginPerMt) * 100) / 100;

    const buyerName = buyerOrg?.name ?? buyer?.name ?? "the buyer";
    const draftText = isZero
      ? [
          `PRICING, ${request.product} → ${request.destination} (AQ ZERO · cost-to-cost)`,
          ``,
          `Dear ${buyerName},`,
          ``,
          `Your transparent landed cost for ${qty} MT ${request.product}:`,
          `· Product (true cost): ${order.tradeCurrency} ${buyPerMt.toFixed(2)} / MT`,
          `· Ocean freight & clearing: ${order.tradeCurrency} ${freightPerMt.toFixed(2)} / MT`,
          `· Aquifert margin: ${order.tradeCurrency} 0.00, membership replaces margin`,
          `· All-in: ${order.tradeCurrency} ${sellPerMt.toFixed(2)} / MT`,
          ``,
          `Valid 48 hours from issue.`,
        ].join("\n")
      : [
          `FIRM PRICE, ${request.product} → ${request.destination}`,
          ``,
          `Dear ${buyerName},`,
          ``,
          `We are pleased to offer ${qty} MT ${request.product} at ${order.tradeCurrency} ${sellPerMt.toFixed(2)} / MT ${request.incoterms} ${request.destination}.`,
          `Packing: 25kg buyer's-design bags on pallets. Inspection as agreed.`,
          `This offer is valid for 48 hours from issue.`,
        ].join("\n");

    const [{ id }] = await db
      .insert(s.agentDrafts)
      .values({
        kind: "MARGIN_REVIEW",
        orderId: order.id,
        requestId: request.id,
        title: `Margin review, ${buyerName} · ${order.tradeRef ?? order.orderNumber}`,
        draftText,
        payload: {
          stage: 8,
          dealType: order.dealType,
          buyerOrgId: buyerOrg?.id ?? null,
          buyerMarginProfilePct: profilePct,
          appliedPct: isZero ? 0 : pct,
          inputs: {
            buyPricePerMt: buyPerMt,
            freightPerMt,
            quantityMt: qty,
            marginPerMt,
            sellPricePerMt: sellPerMt,
            currency: order.tradeCurrency,
          },
          rationale: {
            fobRead: `Buy side at ${order.tradeCurrency} ${buyPerMt.toFixed(2)}/MT`,
            freightRead: `Freight + clearing at ${order.tradeCurrency} ${freightPerMt.toFixed(2)}/MT, the freight read is what reveals the real room`,
            buyerTrackRecord: profilePct > 0 ? `${buyerName} margin profile: ${profilePct}%` : "No margin profile set for this buyer, default 8% proposed",
            marketRead: "Market intel: see Insights broadcast for current trend",
            judgment: "Margin is a human judgment, engine assembles inputs, a human decides.",
          },
        },
      })
      .returning({ id: s.agentDrafts.id });
    await logActivity("AQUIFERT AI", `Proposed margin for ${buyerName} (${isZero ? "AQ ZERO £0" : `${pct}% → ${order.tradeCurrency} ${marginPerMt}/MT`}), HUMAN REVIEW REQUIRED before sending`, "order", String(order.id));
    return { id, sellPerMt, marginPerMt };
  }),

  /**
   * Human approval, the only way anything leaves the building.
   * Buyer-facing text is re-screened against the protected-entity set before
   * release; a leak here refuses the send even after approval.
   */
  approve: authedQuery
    .input(z.object({ draftId: z.number(), editedText: z.string().optional(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const draft = await db.query.agentDrafts.findFirst({ where: eq(s.agentDrafts.id, input.draftId) });
      if (!draft) throw new Error("Draft not found");
      if (draft.status !== "PENDING") throw new Error("Draft already decided");

      const finalText = input.editedText ?? draft.draftText;
      const leaks = scanText(finalText, await entitiesForOrder(draft.orderId));
      if (leaks.length > 0) {
        throw new Error(`Identity firewall: draft contains ${leaks.length} protected term(s) (${leaks[0].match}). Edit before release.`);
      }

      // Persist margin decisions onto the trade
      if (draft.kind === "MARGIN_REVIEW" && draft.orderId) {
        const inputs = (draft.payload as { inputs?: { marginPerMt?: number; sellPricePerMt?: number } })?.inputs ?? {};
        await db
          .update(s.orders)
          .set({ marginPerMt: inputs.marginPerMt ?? 0, sellPricePerMt: inputs.sellPricePerMt ?? null, tradeStage: 8 })
          .where(eq(s.orders.id, draft.orderId));
      }

      // Deliver into the linked conversation when present
      if (draft.conversationId) {
        const conv = await db.query.conversations.findFirst({ where: eq(s.conversations.id, draft.conversationId) });
        if (conv) {
          const messages = [...((conv.messages as ChatMessage[]) ?? []), { from: "ai", text: finalText, at: new Date().toISOString() }];
          await db.update(s.conversations).set({ messages }).where(eq(s.conversations.id, conv.id));
        }
      }

      await db
        .update(s.agentDrafts)
        .set({ status: "SENT", draftText: finalText, decidedBy: me.id, decidedAt: new Date(), decisionNote: input.note ?? null })
        .where(eq(s.agentDrafts.id, draft.id));
      await logActivity(fmtActor(me), `APPROVED & SENT ${draft.kind} draft "${draft.title}"${draft.kind === "MARGIN_REVIEW" ? ", margin released to buyer" : ""}`, "agent_draft", String(draft.id), me.id);
      return { ok: true };
    }),

  reject: authedQuery
    .input(z.object({ draftId: z.number(), note: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const draft = await db.query.agentDrafts.findFirst({ where: eq(s.agentDrafts.id, input.draftId) });
      if (!draft) throw new Error("Draft not found");
      if (draft.status !== "PENDING") throw new Error("Draft already decided");
      await db
        .update(s.agentDrafts)
        .set({ status: "REJECTED", decidedBy: me.id, decidedAt: new Date(), decisionNote: input.note })
        .where(eq(s.agentDrafts.id, draft.id));
      await logActivity(fmtActor(me), `REJECTED ${draft.kind} draft "${draft.title}": ${input.note}`, "agent_draft", String(draft.id), me.id);
      return { ok: true };
    }),
});
