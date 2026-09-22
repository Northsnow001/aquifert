import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser } from "./rbac";
import { DEMO_PERSONAS } from "@contracts/constants";
import {
  clearDemoPersona,
  demoMembershipFor,
  demoOrganizationFor,
  isDemoMode,
  setDemoLanguage,
  setDemoPersona,
} from "./demo/mode";

export const profileRouter = createRouter({
  /** Effective current user (persona-aware) + org + membership */
  me: authedQuery.query(async ({ ctx }) => {
    const user = await effUser(ctx.user);

    if (isDemoMode()) {
      return {
        user,
        realUser: ctx.user,
        isPersona: Boolean(ctx.user.demoUserId),
        organization: demoOrganizationFor(user),
        membership: demoMembershipFor(user),
      };
    }

    const db = getDb();
    const org = user.organizationId
      ? await db.query.organizations.findFirst({ where: eq(s.organizations.id, user.organizationId) })
      : null;
    const membership = await db.query.memberships.findFirst({
      where: and(eq(s.memberships.userId, user.id), eq(s.memberships.status, "ACTIVE")),
      orderBy: desc(s.memberships.createdAt),
    });
    return {
      user,
      realUser: ctx.user,
      isPersona: Boolean(ctx.user.demoUserId),
      organization: org ?? null,
      membership: membership ?? null,
    };
  }),

  personas: authedQuery.query(() => DEMO_PERSONAS),

  selectPersona: authedQuery
    .input(z.object({ unionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (isDemoMode()) {
        const persona = setDemoPersona(ctx.user.unionId, input.unionId);
        if (!persona) throw new Error("Persona not found");
        return { ok: true, persona };
      }
      const db = getDb();
      const demo = await db.query.users.findFirst({ where: eq(s.users.unionId, input.unionId) });
      if (!demo) throw new Error("Persona not found");
      await db
        .update(s.users)
        .set({ demoUserId: demo.id, portalRole: demo.portalRole })
        .where(eq(s.users.id, ctx.user.id));
      return { ok: true, persona: demo };
    }),

  clearPersona: authedQuery.mutation(async ({ ctx }) => {
    if (isDemoMode()) {
      clearDemoPersona(ctx.user.unionId);
      return { ok: true };
    }
    await getDb()
      .update(s.users)
      .set({ demoUserId: null })
      .where(eq(s.users.id, ctx.user.id));
    return { ok: true };
  }),

  setLanguage: authedQuery
    .input(z.object({ language: z.enum(["EN", "ZH"]) }))
    .mutation(async ({ ctx, input }) => {
      if (isDemoMode()) {
        setDemoLanguage(ctx.user.unionId, input.language);
        return { ok: true };
      }
      const user = await effUser(ctx.user);
      await getDb().update(s.users).set({ language: input.language }).where(eq(s.users.id, user.id));
      return { ok: true };
    }),
});
