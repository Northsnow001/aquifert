import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertSupplier, logActivity, fmtActor } from "./rbac";
import { rewriteSupplierResponse } from "./ai";

export const supplierRouter = createRouter({
  dashboard: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertSupplier(me);
    const db = getDb();
    const incoming = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.supplierRequests)
      .where(eq(s.supplierRequests.supplierId, me.id));
    const answered = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.supplierRequests)
      .where(eq(s.supplierRequests.supplierId, me.id));
    const myQuotes = await db.query.quotes.findMany({
      where: eq(s.quotes.supplierId, me.id),
      with: { request: true, order: true },
    });
    const accepted = myQuotes.filter((q) => q.status === "ACCEPTED");
    const monthStart = new Date();
    monthStart.setDate(1);
    const earningsMonth = accepted
      .filter((q) => q.order && new Date(q.order.createdAt) >= monthStart && q.order.paymentStatus === "PAID")
      .reduce((acc, q) => acc + q.productCost, 0);
    const responseRate = incoming[0]?.count ? Math.min(100, Math.round((myQuotes.length / Number(incoming[0].count)) * 100)) : 100;
    return {
      incomingRequests: Number(incoming[0]?.count ?? 0),
      activeOrders: accepted.length,
      earningsThisMonth: earningsMonth,
      responseRate,
      totalAnswered: Number(answered[0]?.count ?? 0),
    };
  }),

  inbox: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertSupplier(me);
    return getDb().query.supplierRequests.findMany({
      where: eq(s.supplierRequests.supplierId, me.id),
      with: { request: true },
      orderBy: desc(s.supplierRequests.createdAt),
      limit: 100,
    });
  }),

  submitQuote: authedQuery
    .input(z.object({
      supplierRequestId: z.number(),
      pricePerTon: z.number().positive(),
      currency: z.enum(["USD", "GBP"]).default("USD"),
      available: z.boolean(),
      earliestShipDate: z.coerce.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertSupplier(me);
      const db = getDb();
      const assignment = await db.query.supplierRequests.findFirst({
        where: eq(s.supplierRequests.id, input.supplierRequestId),
        with: { request: true },
      });
      if (!assignment || assignment.supplierId !== me.id) throw new Error("Assignment not found");
      const req = assignment.request!;
      const rewritten = rewriteSupplierResponse({
        pricePerTon: input.pricePerTon,
        availability: input.available,
        shipDate: input.earliestShipDate?.toISOString().slice(0, 10),
        notes: input.notes,
        product: req.product,
        quantity: Number(req.quantity),
      });
      const fx = input.currency === "GBP" ? 1 : 0.79; // USD→GBP示意汇率
      const productCost = Math.round(input.pricePerTon * Number(req.quantity) * fx * 100) / 100;
      const shippingCost = Math.round(Number(req.quantity) * 55 * 100) / 100;
      const clearingCost = Math.round(Number(req.quantity) * 14 * 100) / 100 + 350;
      const marginPercentage = 8;
      const sub = productCost + shippingCost + clearingCost;
      const margin = Math.round(sub * marginPercentage) / 100;
      const [{ id }] = await db
        .insert(s.quotes)
        .values({
          requestId: req.id,
          supplierId: me.id,
          productCost, shippingCost, clearingCost,
          marginPercentage, margin,
          total: sub + margin,
          status: "PENDING_APPROVAL",
          aiMessage: rewritten.buyerFriendlyMessage,
          supplierNotes: `Supplier ${me.name} quoted ${input.currency} ${input.pricePerTon}/t. ${input.notes ?? ""}`.trim(),
          validUntil: new Date(Date.now() + 7 * 864e5),
        })
        .returning({ id: s.quotes.id });
      await db.update(s.supplierRequests).set({ status: "QUOTED" }).where(eq(s.supplierRequests.id, input.supplierRequestId));
      await logActivity("AQUIFERT AI", `Supplier replied on ${req.requestNumber}, AI drafted quote for approval`, "quote", String(id));
      return { id, message: rewritten.buyerFriendlyMessage };
    }),

  orders: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertSupplier(me);
    const quotes = await getDb().query.quotes.findMany({
      where: eq(s.quotes.supplierId, me.id),
      with: { request: { with: { buyer: { with: { organization: true } } } }, order: { with: { shipment: true } } },
      orderBy: desc(s.quotes.createdAt),
      limit: 100,
    });
    return quotes.filter((q) => q.status === "ACCEPTED" && q.order);
  }),

  earnings: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertSupplier(me);
    const db = getDb();
    const quotes = await db.query.quotes.findMany({
      where: eq(s.quotes.supplierId, me.id),
      with: { order: { with: { shipment: true } } },
      orderBy: desc(s.quotes.createdAt),
      limit: 100,
    });
    const txns = quotes
      .filter((q) => q.order)
      .map((q) => ({
        date: q.order!.createdAt,
        orderNumber: q.order!.orderNumber,
        amount: q.productCost,
        status: q.order!.paymentStatus === "PAID"
          ? (q.order!.shipment && q.order!.shipment.status !== "DELIVERED" ? "HELD" : "PAID")
          : "PENDING",
      }));
    const monthStart = new Date();
    monthStart.setDate(1);
    return {
      transactions: txns,
      thisMonth: txns.filter((t) => new Date(t.date) >= monthStart && t.status !== "PENDING").reduce((a, t) => a + t.amount, 0),
      pending: txns.filter((t) => t.status === "PENDING").reduce((a, t) => a + t.amount, 0),
      lifetime: txns.reduce((a, t) => a + t.amount, 0),
    };
  }),

  profile: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertSupplier(me);
    const db = getDb();
    const org = me.organizationId
      ? await db.query.organizations.findFirst({ where: eq(s.organizations.id, me.organizationId) })
      : null;
    const catalog = await db.query.supplierProducts.findMany({
      where: eq(s.supplierProducts.supplierId, me.id),
    });
    return { user: me, organization: org ?? null, catalog };
  }),

  updateProfile: authedQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      orgName: z.string().optional(),
      address: z.string().optional(),
      contactPerson: z.string().optional(),
      wechatId: z.string().optional(),
      bankDetails: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertSupplier(me);
      const db = getDb();
      await db.update(s.users).set({ name: input.name, phone: input.phone ?? null }).where(eq(s.users.id, me.id));
      if (me.organizationId) {
        await db.update(s.organizations).set({
          name: input.orgName ?? undefined,
          address: input.address ?? undefined,
          contactPerson: input.contactPerson ?? undefined,
          wechatId: input.wechatId ?? undefined,
          bankDetails: input.bankDetails ?? undefined,
        }).where(eq(s.organizations.id, me.organizationId));
      }
      await logActivity(fmtActor(me), "Updated supplier profile", "supplier", String(me.id), me.id);
      return { ok: true };
    }),
});
