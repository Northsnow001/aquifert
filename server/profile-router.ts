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
      const demo = await findUserByUnionId(input.unionId);
      if (!demo) throw new Error("Persona not found");
      const { error } = await getSupabaseService()
        .from("users")
        .update({ demoUserId: demo.id, portalRole: demo.portalRole })
        .eq("id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { ok: true, persona: demo };
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
