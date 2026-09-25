import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getSupabaseService } from "./lib/supabase";
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
import { findUserByUnionId } from "./queries/users";
import type { User } from "@db/schema";

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

    // Prefer Supabase HTTP API — do not require DATABASE_URL / Drizzle here.
    let organization = null;
    let membership = null;
    try {
      const sb = getSupabaseService();
      if (user.organizationId) {
        const { data } = await sb
          .from("organizations")
          .select("*")
          .eq("id", user.organizationId)
          .maybeSingle();
        organization = data ?? null;
      }
      const { data: mem } = await sb
        .from("memberships")
        .select("*")
        .eq("userId", user.id)
        .eq("status", "ACTIVE")
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      membership = mem ?? null;
    } catch {
      // Org lookup is optional for portal entry.
    }

    return {
      user,
      realUser: ctx.user,
      isPersona: Boolean(ctx.user.demoUserId),
      organization,
      membership,
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

      const card = DEMO_PERSONAS.find((p) => p.unionId === input.unionId);
      const roleByKey: Record<string, "ADMIN" | "BUYER" | "SUPPLIER"> = {
        admin: "ADMIN",
        member: "BUYER",
        buyer: "BUYER",
        supplier: "SUPPLIER",
      };
      const portalRole = card ? roleByKey[card.key] : undefined;

      // Prefer switching into a seeded demo user when it exists.
      const demo = await findUserByUnionId(input.unionId);
      if (demo) {
        const { error } = await getSupabaseService()
          .from("users")
          .update({
            demoUserId: demo.id,
            portalRole: demo.portalRole ?? portalRole ?? null,
          })
          .eq("id", ctx.user.id);
        if (error) throw new Error(error.message);
        return { ok: true, persona: { ...demo, portalRole: demo.portalRole ?? portalRole ?? null } };
      }

      // Live signup: demo_* rows are not in the DB. Assign a portal role to this user.
      if (!portalRole) throw new Error("Unknown portal selection.");

      const { data: updated, error } = await getSupabaseService()
        .from("users")
        .update({
          portalRole,
          demoUserId: null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", ctx.user.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      const persona = {
        ...ctx.user,
        ...(updated ?? {}),
        id: Number(updated?.id ?? ctx.user.id),
        name: (updated?.name as string) ?? ctx.user.name ?? card?.label ?? "User",
        portalRole,
        demoUserId: null,
      };

      return { ok: true, persona };
    }),

  clearPersona: authedQuery.mutation(async ({ ctx }) => {
    if (isDemoMode()) {
      clearDemoPersona(ctx.user.unionId);
      return { ok: true };
    }
    const { error } = await getSupabaseService()
      .from("users")
      .update({ demoUserId: null })
      .eq("id", ctx.user.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  }),

  setLanguage: authedQuery
    .input(z.object({ language: z.enum(["EN", "ZH"]) }))
    .mutation(async ({ ctx, input }) => {
      if (isDemoMode()) {
        setDemoLanguage(ctx.user.unionId, input.language);
        return { ok: true };
      }
      const { error } = await getSupabaseService()
        .from("users")
        .update({ language: input.language })
        .eq("id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }),
});
