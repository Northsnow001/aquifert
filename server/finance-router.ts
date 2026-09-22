import { desc, eq, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertFinance } from "./rbac";

/** FINANCE view, restricted to ADMIN & FINANCE roles */
export const financeRouter = createRouter({
  invoices: authedQuery.query(async ({ ctx }) => {
    assertFinance(await effUser(ctx.user));
    return getDb().query.invoices.findMany({
      with: { order: { with: { quote: { with: { request: { with: { buyer: { with: { organization: true } } } } } } } } },
      orderBy: desc(s.invoices.createdAt),
      limit: 100,
    });
  }),

  billing: authedQuery.query(async ({ ctx }) => {
    assertFinance(await effUser(ctx.user));
    const db = getDb();
    const active = await db.query.memberships.findMany({
      where: eq(s.memberships.status, "ACTIVE"),
      with: { user: { with: { organization: true } } },
    });
    const mrr = active.reduce((acc, m) => acc + (m.billingCycle === "ANNUAL" ? m.price / 12 : m.price), 0);
    const cancelled = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.memberships)
      .where(eq(s.memberships.status, "CANCELLED"));
    const totalEver = active.length + Number(cancelled[0]?.count ?? 0);
    const churn = totalEver > 0 ? Math.round((Number(cancelled[0]?.count ?? 0) / totalEver) * 100) : 0;
    return { activeMembers: active, mrr: Math.round(mrr), churn };
  }),

  /** Margin report, never exposed to non-finance roles */
  margins: authedQuery.query(async ({ ctx }) => {
    assertFinance(await effUser(ctx.user));
    const quotes = await getDb().query.quotes.findMany({
      with: { request: { with: { buyer: { with: { organization: true } } } } },
      orderBy: desc(s.quotes.createdAt),
      limit: 100,
    });
    const accepted = quotes.filter((q) => q.status === "ACCEPTED");
    return {
      quotes,
      summary: {
        totalMarginBooked: accepted.reduce((a, q) => a + q.margin, 0),
        avgMarginPct: accepted.length ? Math.round((accepted.reduce((a, q) => a + q.marginPercentage, 0) / accepted.length) * 100) / 100 : 0,
        pipelineMargin: quotes.filter((q) => ["SENT", "PENDING_APPROVAL"].includes(q.status)).reduce((a, q) => a + q.margin, 0),
      },
    };
  }),
});
