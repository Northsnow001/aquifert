import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser } from "./rbac";
import { isDemoMode } from "./demo/mode";

const SIM_POOL = [
  { type: "PRICE_ALERT", title: "Urea price movement", message: "Urea (UK) moved 1.8% in the last session.", actionUrl: "/buyer/insights" },
  { type: "QUOTE_READY", title: "Quote update", message: "A supplier revised pricing on one of your requests.", actionUrl: "/buyer/quotes" },
  { type: "DELIVERY", title: "Tracking update", message: "A vessel on your route passed a new milestone.", actionUrl: "/buyer/orders" },
  { type: "PAYMENT_DUE", title: "Payment reminder", message: "An open proforma invoice is approaching its due date.", actionUrl: "/buyer/quotes" },
] as const;

export const notificationsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    if (isDemoMode()) return [];
    const me = await effUser(ctx.user);
    return getDb().query.notifications.findMany({
      where: eq(s.notifications.userId, me.id),
      orderBy: desc(s.notifications.createdAt),
      limit: 30,
    });
  }),

  unreadCount: authedQuery.query(async ({ ctx }) => {
    if (isDemoMode()) return 0;
    const me = await effUser(ctx.user);
    const rows = await getDb()
      .select({ count: sql<number>`count(*)` })
      .from(s.notifications)
      .where(and(eq(s.notifications.userId, me.id), eq(s.notifications.read, false)));
    return Number(rows[0]?.count ?? 0);
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (isDemoMode()) return { ok: true };
      const me = await effUser(ctx.user);
      await getDb()
        .update(s.notifications)
        .set({ read: true })
        .where(and(eq(s.notifications.id, input.id), eq(s.notifications.userId, me.id)));
      return { ok: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    if (isDemoMode()) return { ok: true };
    const me = await effUser(ctx.user);
    await getDb()
      .update(s.notifications)
      .set({ read: true })
      .where(eq(s.notifications.userId, me.id));
    return { ok: true };
  }),

  /** Demo real-time feed: occasionally push a fresh notification */
  poll: authedQuery.mutation(async ({ ctx }) => {
    if (isDemoMode()) return { created: false };
    const me = await effUser(ctx.user);
    if (Math.random() < 0.5) return { created: false };
    const n = SIM_POOL[Math.floor(Math.random() * SIM_POOL.length)];
    const [{ id }] = await getDb().insert(s.notifications).values({
      userId: me.id, type: n.type, title: n.title, message: n.message, actionUrl: n.actionUrl,
    }).returning({ id: s.notifications.id });
    return { created: true, id };
  }),
});
