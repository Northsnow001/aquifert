import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { assertVerifiedEmail } from "./verify-gate";
import * as s from "@db/schema";
import { effUser, assertBuyer, logActivity, notify, fmtActor } from "./rbac";
import { MEMBERSHIP_PLANS } from "@contracts/constants";

export const membershipRouter = createRouter({
  current: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    return (
      (await getDb().query.memberships.findFirst({
        where: and(eq(s.memberships.userId, me.id), eq(s.memberships.status, "ACTIVE")),
        orderBy: desc(s.memberships.createdAt),
      })) ?? null
    );
  }),

  /** Simulated Stripe Checkout success → instant activation */
  subscribe: authedQuery
    .input(z.object({
      tier: z.enum(["SPROUT", "HARVEST", "SCALE"]),
      billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertBuyer(me);
      await assertVerifiedEmail(me.id); // soft gate: starting a paid plan requires verified email
      const plan = MEMBERSHIP_PLANS.find((p) => p.tier === input.tier)!;
      const db = getDb();
      // expire any existing membership
      await db
        .update(s.memberships)
        .set({ status: "CANCELLED", autoRenew: false })
        .where(and(eq(s.memberships.userId, me.id), eq(s.memberships.status, "ACTIVE")));
      const price = input.billingCycle === "ANNUAL" ? plan.annual : plan.monthly;
      const [{ id }] = await db
        .insert(s.memberships)
        .values({
          userId: me.id,
          tier: input.tier,
          status: "ACTIVE",
          monthlyTonnageLimit: plan.tonnageLimit,
          currentMonthTonnage: 0,
          price,
          billingCycle: input.billingCycle,
          startDate: new Date(),
          endDate: new Date(Date.now() + (input.billingCycle === "ANNUAL" ? 365 : 30) * 864e5),
          autoRenew: true,
        })
        .returning({ id: s.memberships.id });
      await notify(me.id, "MEMBERSHIP", `Welcome to ${plan.name}`, `Your ${plan.name} membership is now active, cost-to-cost pricing unlocked.`, "/buyer");
      await logActivity(fmtActor(me), `Activated ${plan.name} membership (${input.billingCycle.toLowerCase()})`, "membership", String(id), me.id);
      console.log(`[Stripe webhook] checkout.session.completed → membership ${id} active`);
      return { id, tier: input.tier };
    }),

  cancel: authedQuery.mutation(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertBuyer(me);
    await getDb()
      .update(s.memberships)
      .set({ status: "CANCELLED", autoRenew: false })
      .where(and(eq(s.memberships.userId, me.id), eq(s.memberships.status, "ACTIVE")));
    return { ok: true };
  }),
});
