import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";

const stageEvent = (stage: number, note: string | undefined, actor: string) => ({
  stage,
  note: note ?? null,
  actor,
  at: new Date().toISOString(),
});

/** Trade desk, back-to-back trade model, 14-stage lifecycle, dual margin. */
export const tradeRouter = createRouter({
  /** All trades with spine fields + buyer org name. */
  list: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    const db = getDb();
    const rows = await db.select().from(s.orders).orderBy(asc(s.orders.id));
    const withDetail = await Promise.all(
      rows.map(async (o) => {
        const quote = await db.query.quotes.findFirst({ where: eq(s.quotes.id, o.quoteId) });
        const req = quote ? await db.query.requests.findFirst({ where: eq(s.requests.id, quote.requestId) }) : null;
        const buyer = req ? await db.query.users.findFirst({ where: eq(s.users.id, req.buyerId) }) : null;
        const buyerOrg = buyer?.organizationId
          ? await db.query.organizations.findFirst({ where: eq(s.organizations.id, buyer.organizationId) })
          : null;
        return { ...o, request: req ?? null, buyerName: buyer?.name ?? "N/A", buyerOrg: buyerOrg ?? null };
      }),
    );
    return withDetail;
  }),

  /** Advance a trade along the 14-stage lifecycle (human action). */
  advanceStage: authedQuery
    .input(z.object({ orderId: z.number(), stage: z.number().min(1).max(14), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const order = await db.query.orders.findFirst({ where: eq(s.orders.id, input.orderId) });
      if (!order) throw new Error("Trade not found");
      const history = [...((order.stageHistory as unknown[]) ?? []), stageEvent(input.stage, input.note, fmtActor(me))];
      await db.update(s.orders).set({ tradeStage: input.stage, stageHistory: history }).where(eq(s.orders.id, input.orderId));
      await logActivity(fmtActor(me), `Advanced trade ${order.tradeRef ?? order.orderNumber} to stage ${input.stage}/14`, "order", String(order.id), me.id);
      return { ok: true, stage: input.stage };
    }),

  /** Back-to-back contract buffers: spec buffer + quantity tolerance. */
  setBuffers: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        buySpec: z.string().optional(),
        sellSpec: z.string().optional(),
        buyQtyMt: z.number().optional(),
        sellQtyMt: z.number().optional(),
        tolerancePct: z.number().optional(),
        buyContractRef: z.string().optional(),
        sellContractRef: z.string().optional(),
        inspectionBasis: z.enum(["SELLER_CERT", "THIRD_PARTY"]).optional(),
        documentaryInstructions: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const { orderId, ...fields } = input;
      await db.update(s.orders).set(fields).where(eq(s.orders.id, orderId));
      await logActivity(fmtActor(me), `Updated back-to-back buffers on trade #${orderId}`, "order", String(orderId), me.id);
      return { ok: true };
    }),

  /** Dual margin architecture toggle: AQ_ZERO (transparent, flat fee) vs TRADITIONAL (margin trade). */
  setDealType: authedQuery
    .input(z.object({ orderId: z.number(), dealType: z.enum(["AQ_ZERO", "TRADITIONAL"]) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      await db.update(s.orders).set({ dealType: input.dealType }).where(eq(s.orders.id, input.orderId));
      await logActivity(fmtActor(me), `Set trade #${input.orderId} deal type to ${input.dealType}`, "order", String(input.orderId), me.id);
      return { ok: true };
    }),

  /**
   * Freight-forwarder bidding, forwarder identities are ALWAYS masked behind
   * aliases ("Forwarder A", "Forwarder B"…); staff compare bids on price and
   * transit only, and award without the buyer ever seeing who carries the box.
   */
  freightBids: authedQuery.input(z.object({ orderId: z.number() })).query(async ({ ctx, input }) => {
    assertStaff(await effUser(ctx.user));
    const db = getDb();
    return db.query.freightBids.findMany({ where: eq(s.freightBids.orderId, input.orderId), orderBy: asc(s.freightBids.pricePerContainer) });
  }),

  addFreightBid: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        pricePerContainer: z.number().positive(),
        currency: z.string().max(8).optional(),
        transitDays: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const existing = await db.query.freightBids.findMany({ where: eq(s.freightBids.orderId, input.orderId) });
      const alias = `Forwarder ${String.fromCharCode(65 + existing.length)}`; // masked identity, never the real name
      const [{ id }] = await db
        .insert(s.freightBids)
        .values({ orderId: input.orderId, forwarderAlias: alias, pricePerContainer: input.pricePerContainer, currency: input.currency ?? "USD", transitDays: input.transitDays ?? null })
        .returning({ id: s.freightBids.id });
      await logActivity(fmtActor(me), `Freight bid received for trade #${input.orderId}, ${alias} (identity masked)`, "order", String(input.orderId), me.id);
      return { id, alias };
    }),

  awardFreightBid: authedQuery.input(z.object({ bidId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const bid = await db.query.freightBids.findFirst({ where: eq(s.freightBids.id, input.bidId) });
    if (!bid) throw new Error("Bid not found");
    const others = await db.query.freightBids.findMany({ where: eq(s.freightBids.orderId, bid.orderId) });
    for (const o of others) {
      await db.update(s.freightBids).set({ status: o.id === bid.id ? "WON" : o.status === "OPEN" ? "LOST" : o.status }).where(eq(s.freightBids.id, o.id));
    }
    await logActivity(fmtActor(me), `Awarded freight on trade #${bid.orderId} to ${bid.forwarderAlias} (masked)`, "order", String(bid.orderId), me.id);
    return { ok: true };
  }),

  /** Per-buyer default margin %, the profit margin varies for each buyer. */
  setBuyerMarginProfile: authedQuery
    .input(z.object({ organizationId: z.number(), marginProfilePct: z.number().min(0).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, input.organizationId) });
      if (!org || org.type !== "BUYER") throw new Error("Buyer organisation not found");
      await db.update(s.organizations).set({ marginProfilePct: input.marginProfilePct }).where(eq(s.organizations.id, input.organizationId));
      await logActivity(fmtActor(me), `Set margin profile for ${org.name} to ${input.marginProfilePct}%`, "organization", String(org.id), me.id);
      return { ok: true };
    }),
});
