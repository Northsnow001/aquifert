import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getSupabaseService } from "./lib/supabase";
import { effUser } from "./rbac";
import { findUserByUnionId } from "./queries/users";
import { env } from "./lib/env";

const portalRoleSchema = z.enum(["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT", "BUYER", "SUPPLIER"]);

export const profileRouter = createRouter({
  /** Effective current user + org + membership from Supabase */
  me: authedQuery.query(async ({ ctx }) => {
    const user = await effUser(ctx.user);

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
      isPersona: false,
      organization,
      membership,
    };
  }),

  /** Live portal role selection after signup (stored on public.users). */
  setPortalRole: authedQuery
    .input(z.object({ portalRole: portalRoleSchema }))
    .mutation(async ({ ctx, input }) => {
      const staffRoles = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"] as const;
      const wantsStaff = (staffRoles as readonly string[]).includes(input.portalRole);
      const isOwner =
        Boolean(env.ownerUnionId) && ctx.user.unionId === env.ownerUnionId;
      const isAdminAccount = ctx.user.role === "admin";

      if (wantsStaff && !isOwner && !isAdminAccount) {
        throw new Error("Staff roles can only be assigned by an administrator.");
      }

      const { data, error } = await getSupabaseService()
        .from("users")
        .update({
          portalRole: input.portalRole,
          demoUserId: null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", ctx.user.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      const refreshed = await findUserByUnionId(ctx.user.unionId);
      return {
        ok: true as const,
        portalRole: (data?.portalRole as string) ?? input.portalRole,
        user: refreshed ?? ctx.user,
      };
    }),

  setLanguage: authedQuery
    .input(z.object({ language: z.enum(["EN", "ZH"]) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await getSupabaseService()
        .from("users")
        .update({ language: input.language })
        .eq("id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }),
});
