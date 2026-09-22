import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertBuyer, assertFinance, logActivity, notify, fmtActor } from "./rbac";

function buildSchedule(amount: number, ratePct: number, termDays: number) {
  const interest = (amount * (ratePct / 100) * (termDays / 365));
  const total = amount + interest;
  const instalments = termDays === 30 ? 1 : termDays === 60 ? 2 : 3;
  const per = Math.round((total / instalments) * 100) / 100;
  return Array.from({ length: instalments }, (_, i) => ({
    due: new Date(Date.now() + ((termDays / instalments) * (i + 1)) * 864e5).toISOString().slice(0, 10),
    amount: per,
    paid: false,
  }));
}

export const financingRouter = createRouter({
  /** Buyer: my applications + credit summary */
  mine: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertBuyer(me);
    const db = getDb();
    const apps = await db.query.financingApplications.findMany({
      where: eq(s.financingApplications.buyerId, me.id),
      with: { order: true },
      orderBy: desc(s.financingApplications.createdAt),
      limit: 50,
    });
    const active = apps.find((a) => a.status === "ACTIVE" || a.status === "APPROVED");
    const membership = await db.query.memberships.findFirst({
      where: eq(s.memberships.userId, me.id),
      orderBy: desc(s.memberships.createdAt),
    });
    const tierLimit = membership?.tier === "SCALE" ? 200000 : membership?.tier === "HARVEST" ? 50000 : 0;
    const used = apps.filter((a) => a.status === "ACTIVE").reduce((acc, a) => acc + a.amount, 0);
    return {
      applications: apps,
      credit: {
        limit: active?.creditLimit ?? tierLimit,
        used,
        available: Math.max(0, (active?.creditLimit ?? tierLimit) - used),
        interestRate: active?.interestRate ?? 4.9,
        eligible: (membership?.tier === "HARVEST" || membership?.tier === "SCALE") && membership?.status === "ACTIVE",
        tier: membership?.tier ?? null,
      },
    };
  }),

  /** Buyer: orders eligible for financing (no existing app) */
  eligibleOrders: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertBuyer(me);
    const db = getDb();
    const orders = await db.query.orders.findMany({
      with: { quote: { with: { request: true } } },
      orderBy: desc(s.orders.createdAt),
      limit: 100,
    });
    const apps = await db.query.financingApplications.findMany({
      where: eq(s.financingApplications.buyerId, me.id),
    });
    const applied = new Set(apps.map((a) => a.orderId));
    return orders.filter((o) => o.quote?.request?.buyerId === me.id && !applied.has(o.id));
  }),

  submitApplication: authedQuery
    .input(z.object({
      orderId: z.number(),
      amount: z.number().positive(),
      term: z.union([z.literal(30), z.literal(60), z.literal(90)]),
      signature: z.string().min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertBuyer(me);
      const db = getDb();
      const order = await db.query.orders.findFirst({
        where: eq(s.orders.id, input.orderId),
        with: { quote: { with: { request: true } } },
      });
      if (!order || order.quote?.request?.buyerId !== me.id) throw new Error("Order not found");
      if (input.amount > order.total * 0.85) throw new Error("Maximum 85% of invoice value");
      const [{ id }] = await db
        .insert(s.financingApplications)
        .values({
          buyerId: me.id,
          orderId: input.orderId,
          amount: input.amount,
          term: input.term,
          status: "PENDING",
          signature: input.signature,
          signedAt: new Date(),
        })
        .returning({ id: s.financingApplications.id });
      await logActivity(fmtActor(me), `Applied for £${input.amount.toLocaleString()} invoice financing (${order.orderNumber})`, "financing", String(id), me.id);
      return { id };
    }),

  /** Finance: approval queue */
  queue: authedQuery.query(async ({ ctx }) => {
    assertFinance(await effUser(ctx.user));
    return getDb().query.financingApplications.findMany({
      with: { buyer: { with: { organization: true } }, order: true },
      orderBy: desc(s.financingApplications.createdAt),
      limit: 100,
    });
  }),

  approve: authedQuery
    .input(z.object({
      id: z.number(),
      creditLimit: z.number().positive(),
      interestRate: z.number().min(0).max(25),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertFinance(me);
      const db = getDb();
      const app = await db.query.financingApplications.findFirst({ where: eq(s.financingApplications.id, input.id) });
      if (!app) throw new Error("Application not found");
      const schedule = buildSchedule(app.amount, input.interestRate, app.term);
      await db
        .update(s.financingApplications)
        .set({ status: "ACTIVE", creditLimit: input.creditLimit, interestRate: input.interestRate, repaymentSchedule: schedule })
        .where(eq(s.financingApplications.id, input.id));
      await notify(app.buyerId, "FINANCING", "Financing approved", `£${app.amount.toLocaleString()} approved at ${input.interestRate}%, funds released against your invoice.`, "/buyer/financing");
      await logActivity(fmtActor(me), `Approved financing application (£${app.amount.toLocaleString()} @ ${input.interestRate}%)`, "financing", String(input.id), me.id);
      return { ok: true, schedule };
    }),

  reject: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertFinance(me);
      const app = await getDb().query.financingApplications.findFirst({ where: eq(s.financingApplications.id, input.id) });
      if (!app) throw new Error("Application not found");
      await getDb().update(s.financingApplications).set({ status: "REJECTED" }).where(eq(s.financingApplications.id, input.id));
      await notify(app.buyerId, "FINANCING", "Financing update", "Your financing application was not approved this time, contact your account manager for options.", "/buyer/financing");
      await logActivity(fmtActor(me), `Rejected financing application #${input.id}`, "financing", String(input.id), me.id);
      return { ok: true };
    }),
});
