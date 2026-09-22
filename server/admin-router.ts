import { z } from "zod";
import { desc, eq, gte, inArray, ne, and, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, logActivity, fmtActor } from "./rbac";
import { nanoid } from "nanoid";

export const adminRouter = createRouter({
  /** Command Center stat cards */
  stats: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    const db = getDb();

    const activeReq = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.requests)
      .where(and(inArray(s.requests.status, ["NEW", "QUOTED", "ACCEPTED", "PAID", "SHIPPED", "IN_TRANSIT", "DELIVERED"]), eq(s.requests.archived, false)));
    const pendingQuotes = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.quotes)
      .where(eq(s.quotes.status, "PENDING_APPROVAL"));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const revenue = await db
      .select({ total: sql<number>`coalesce(sum(total),0)` })
      .from(s.orders)
      .where(gte(s.orders.createdAt, monthStart));
    const activeShipments = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.shipments)
      .where(ne(s.shipments.status, "DELIVERED"));
    const newThisWeek = await db
      .select({ count: sql<number>`count(*)` })
      .from(s.requests)
      .where(gte(s.requests.createdAt, new Date(Date.now() - 7 * 864e5)));

    return {
      activeRequests: Number(activeReq[0]?.count ?? 0),
      newRequestsThisWeek: Number(newThisWeek[0]?.count ?? 0),
      pendingQuotes: Number(pendingQuotes[0]?.count ?? 0),
      revenueThisMonth: Number(revenue[0]?.total ?? 0),
      activeShipments: Number(activeShipments[0]?.count ?? 0),
    };
  }),

  activity: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    return getDb().query.activities.findMany({
      orderBy: desc(s.activities.createdAt),
      limit: 20,
    });
  }),

  users: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    return getDb().query.users.findMany({
      with: { organization: true },
      orderBy: desc(s.users.createdAt),
    });
  }),

  addUser: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        portalRole: z.enum(["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT", "BUYER", "SUPPLIER"]),
        organizationId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const [{ id }] = await db
        .insert(s.users)
        .values({
          unionId: `manual_${nanoid(8)}`,
          name: input.name,
          email: input.email,
          portalRole: input.portalRole,
          role: ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(input.portalRole) ? "admin" : "user",
          organizationId: input.organizationId ?? null,
        })
        .returning({ id: s.users.id });
      await logActivity(fmtActor(me), `Added user ${input.name} (${input.portalRole})`, "user", String(id), me.id);
      return { id };
    }),

  organizations: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    return getDb().query.organizations.findMany({ orderBy: desc(s.organizations.createdAt) });
  }),

  /** All staff-visible users for dropdowns (suppliers list etc.) */
  directory: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    const db = getDb();
    const suppliers = await db.query.users.findMany({
      where: eq(s.users.portalRole, "SUPPLIER"),
      with: { organization: true },
    });
    const buyers = await db.query.users.findMany({
      where: eq(s.users.portalRole, "BUYER"),
      with: { organization: true },
    });
    return { suppliers, buyers };
  }),
});
