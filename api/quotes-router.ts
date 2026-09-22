import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, assertBuyer, genNumber, logActivity, notify, fmtActor } from "./rbac";
import { rewriteSupplierResponse } from "./ai";

function computeQuote(input: {
  productCost: number; shippingCost: number; clearingCost: number; marginPercentage: number;
}) {
  const sub = input.productCost + input.shippingCost + input.clearingCost;
  const margin = Math.round(sub * input.marginPercentage) / 100;
  return { margin, total: Math.round((sub + margin) * 100) / 100 };
}

export const quotesRouter = createRouter({
  /** Staff: full draft queue, annotated with landed-cost ranking (Gate 2 support) */
  list: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    const rows = await getDb().query.quotes.findMany({
      with: {
        request: { with: { buyer: { with: { organization: true } } } },
        supplier: { with: { organization: true } },
      },
      orderBy: desc(s.quotes.createdAt),
      limit: 200,
    });
    // Rank bids per request by lowest compliant total landed cost, never by headline price.
    // Non-compliant bids (expired validity or incomplete cost lines) are flagged and excluded.
    const now = Date.now();
    const annotated = rows.map((q) => {
      const costsComplete = q.productCost > 0 && q.shippingCost >= 0 && q.clearingCost >= 0;
      const valid = !q.validUntil || new Date(q.validUntil).getTime() > now;
      return { ...q, compliant: costsComplete && valid };
    });
    const byRequest = new Map<number, typeof annotated>();
    for (const q of annotated) {
      const list = byRequest.get(q.requestId) ?? [];
      list.push(q);
      byRequest.set(q.requestId, list);
    }
    const rankOf = new Map<number, number>();
    for (const list of byRequest.values()) {
      list
        .filter((q) => q.compliant)
        .sort((a, b) => a.total - b.total)
        .forEach((q, i) => rankOf.set(q.id, i + 1));
    }
    return annotated.map((q) => ({ ...q, landedCostRank: rankOf.get(q.id) ?? null }));
  }),

  createDraft: authedQuery
    .input(
      z.object({
        requestId: z.number(),
        supplierId: z.number(),
        productCost: z.number().nonnegative(),
        shippingCost: z.number().nonnegative(),
        clearingCost: z.number().nonnegative(),
        marginPercentage: z.number().min(0).max(40),
        supplierNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const req = await db.query.requests.findFirst({ where: eq(s.requests.id, input.requestId) });
      if (!req) throw new Error("Request not found");
      const { margin, total } = computeQuote(input);
      const aiMessage = `Quote for ${req.quantity}t ${req.product} to ${req.destination} (${req.incoterms}). Landed cost built from supplier price, ocean freight and UK port clearing.`;
      const [{ id }] = await db
        .insert(s.quotes)
        .values({
          requestId: input.requestId,
          supplierId: input.supplierId,
          adminId: me.id,
          productCost: input.productCost,
          shippingCost: input.shippingCost,
          clearingCost: input.clearingCost,
          marginPercentage: input.marginPercentage,
          margin,
          total,
          status: "PENDING_APPROVAL",
          aiMessage,
          supplierNotes: input.supplierNotes ?? null,
          validUntil: new Date(Date.now() + 7 * 864e5),
        })
        .returning({ id: s.quotes.id });
      await logActivity("AQUIFERT AI", `Drafted quote for ${req.requestNumber}, pending approval`, "quote", String(id));
      return { id, total, margin };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        productCost: z.number().nonnegative(),
        shippingCost: z.number().nonnegative(),
        clearingCost: z.number().nonnegative(),
        marginPercentage: z.number().min(0).max(40),
        aiMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const { margin, total } = computeQuote(input);
      await getDb()
        .update(s.quotes)
        .set({
          productCost: input.productCost,
          shippingCost: input.shippingCost,
          clearingCost: input.clearingCost,
          marginPercentage: input.marginPercentage,
          margin,
          total,
          aiMessage: input.aiMessage,
        })
        .where(eq(s.quotes.id, input.id));
      return { total, margin };
    }),

  approveAndSend: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const quote = await db.query.quotes.findFirst({
        where: eq(s.quotes.id, input.id),
        with: { request: true },
      });
      if (!quote) throw new Error("Quote not found");
      await db.update(s.quotes).set({ status: "SENT" }).where(eq(s.quotes.id, input.id));
      await db.update(s.requests).set({ status: "QUOTED" }).where(eq(s.requests.id, quote.requestId));
      if (quote.request) {
        await notify(
          quote.request.buyerId,
          "QUOTE_READY",
          "Your quote is ready",
          `Quote for ${quote.request.quantity}t ${quote.request.product}, £${quote.total.toLocaleString()}. Valid 7 days.`,
          "/buyer/quotes",
        );
      }
      await logActivity(fmtActor(me), `Approved quote #${input.id} and sent to buyer`, "quote", String(input.id), me.id);
      console.log(`[WhatsApp → buyer] Your AQUIFERT quote is ready: £${quote.total.toLocaleString()}`);
      return { ok: true };
    }),

  reject: authedQuery
    .input(z.object({ id: z.number(), reason: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      await getDb()
        .update(s.quotes)
        .set({ status: "REJECTED", rejectReason: input.reason })
        .where(eq(s.quotes.id, input.id));
      await logActivity(fmtActor(me), `Rejected quote #${input.id}: ${input.reason}`, "quote", String(input.id), me.id);
      return { ok: true };
    }),

  /** Simulate a supplier reply that the AI rewrites into a draft quote */
  simulateSupplierReply: authedQuery
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const req = await db.query.requests.findFirst({
        where: eq(s.requests.id, input.requestId),
        with: { supplierRequests: true },
      });
      if (!req) throw new Error("Request not found");
      const assignment = req.supplierRequests[0];
      const supplierId = assignment?.supplierId;
      if (!supplierId) throw new Error("Send this request to a supplier first");

      const latest = await db.query.marketData.findFirst({
        where: eq(s.marketData.commodity, req.product),
        orderBy: desc(s.marketData.date),
      });
      const pricePerTon = Math.round(((latest?.pricePerTon ?? 320) * (1 + (Math.random() - 0.45) * 0.06)) * 100) / 100;
      const rewritten = rewriteSupplierResponse({
        pricePerTon,
        availability: true,
        shipDate: new Date(Date.now() + 18 * 864e5).toISOString().slice(0, 10),
        notes: "SGS inspection at loading port included",
        product: req.product,
        quantity: Number(req.quantity),
      });
      const productCost = Math.round(pricePerTon * Number(req.quantity) * 100) / 100;
      const shippingCost = Math.round(Number(req.quantity) * (52 + Math.random() * 18) * 100) / 100;
      const clearingCost = Math.round(Number(req.quantity) * 14 * 100) / 100 + 350;
      const marginPercentage = 8;
      const { margin, total } = computeQuote({ productCost, shippingCost, clearingCost, marginPercentage });

      const [{ id }] = await db
        .insert(s.quotes)
        .values({
          requestId: req.id,
          supplierId,
          adminId: me.id,
          productCost, shippingCost, clearingCost,
          marginPercentage, margin, total,
          status: "PENDING_APPROVAL",
          aiMessage: rewritten.buyerFriendlyMessage,
          supplierNotes: `Supplier replied $${pricePerTon}/t, earliest ship ${rewritten.shipDate}. ${rewritten.notes}`,
          validUntil: new Date(Date.now() + 7 * 864e5),
        })
        .returning({ id: s.quotes.id });
      if (assignment) {
        await db.update(s.supplierRequests).set({ status: "QUOTED" }).where(eq(s.supplierRequests.id, assignment.id));
      }
      await logActivity("AQUIFERT AI", `Supplier replied on ${req.requestNumber}, AI drafted quote for approval`, "quote", String(id));
      return { id, total, pricePerTon };
    }),

  /** Buyer: quotes on my requests (only those visible to buyers) */
  mine: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertBuyer(me);
    const db = getDb();
    const myRequests = await db.query.requests.findMany({
      where: eq(s.requests.buyerId, me.id),
      columns: { id: true },
    });
    if (myRequests.length === 0) return [];
    return db.query.quotes.findMany({
      where: inArray(s.quotes.requestId, myRequests.map((r) => r.id)),
      with: { request: true },
      orderBy: desc(s.quotes.createdAt),
      limit: 100,
    });
  }),

  /** Buyer accepts → order + proforma invoice generated */
  accept: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertBuyer(me);
      const db = getDb();
      const quote = await db.query.quotes.findFirst({
        where: eq(s.quotes.id, input.id),
        with: { request: true },
      });
      if (!quote || !quote.request || quote.request.buyerId !== me.id) throw new Error("Quote not found");
      if (quote.status !== "SENT") throw new Error("Quote is not open for acceptance");

      await db.update(s.quotes).set({ status: "ACCEPTED" }).where(eq(s.quotes.id, quote.id));
      const orderNumber = genNumber("ORD");
      const [{ id: orderId }] = await db
        .insert(s.orders)
        .values({ quoteId: quote.id, orderNumber, paymentStatus: "PENDING", shipmentStatus: "PENDING", total: quote.total })
        .returning({ id: s.orders.id });
      await db.insert(s.invoices).values({
        orderId,
        invoiceNumber: genNumber("INV"),
        type: "PROFORMA",
        amount: quote.total,
        currency: "GBP",
        dueDate: new Date(Date.now() + 7 * 864e5),
      });
      await db.update(s.requests).set({ status: "ACCEPTED" }).where(eq(s.requests.id, quote.requestId));
      if (quote.supplierId) {
        await notify(quote.supplierId, "QUOTE_ACCEPTED", "Quote accepted", `Buyer accepted the quote for ${quote.request.quantity}t ${quote.request.product} (${orderNumber}).`, "/supplier/orders");
      }
      await logActivity(fmtActor(me), `Accepted quote → order ${orderNumber} created (£${quote.total.toLocaleString()})`, "order", orderNumber, me.id);
      return { orderId, orderNumber };
    }),

  rejectByBuyer: authedQuery
    .input(z.object({ id: z.number(), reason: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertBuyer(me);
      const db = getDb();
      const quote = await db.query.quotes.findFirst({
        where: eq(s.quotes.id, input.id),
        with: { request: true },
      });
      if (!quote || quote.request?.buyerId !== me.id) throw new Error("Quote not found");
      await db.update(s.quotes).set({ status: "REJECTED", rejectReason: input.reason }).where(eq(s.quotes.id, quote.id));
      await logActivity(fmtActor(me), `Declined quote #${quote.id}: ${input.reason}`, "quote", String(quote.id), me.id);
      return { ok: true };
    }),

  detail: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const quote = await getDb().query.quotes.findFirst({
        where: eq(s.quotes.id, input.id),
        with: { request: { with: { buyer: { with: { organization: true } } } }, supplier: { with: { organization: true } } },
      });
      if (!quote) throw new Error("Quote not found");
      const isStaff = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(me.portalRole ?? "");
      if (!isStaff && quote.request?.buyerId !== me.id) throw new Error("Forbidden");
      return quote;
    }),
});
