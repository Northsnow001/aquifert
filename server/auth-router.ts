import * as cookie from "cookie";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { isSupabaseAuthConfigured } from "./lib/supabase";
import { establishAppSessionFromSupabase } from "./lib/supabase-auth";

export const authRouter = createRouter({
  /** Public: whether the frontend should use Supabase Auth UI flows. */
  config: publicQuery.query(() => ({
    supabaseAuth: isSupabaseAuthConfigured(),
  })),

  me: authedQuery.query((opts) => opts.ctx.user),

  /**
   * After browser Supabase sign-in / sign-up, exchange the access token for
   * our httpOnly app session cookie and sync the `users` row.
   */
  establishSession: publicQuery
    .input(
      z.object({
        accessToken: z.string().min(20),
        profile: z
          .object({
            name: z.string().min(1).optional(),
            company: z.string().optional(),
            country: z.string().optional(),
            phone: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!isSupabaseAuthConfigured()) {
        throw new Error("Supabase Auth is not configured on the server.");
      }
      if (!process.env.DATABASE_URL && !process.env.APP_SECRET) {
        // fall through to establish which throws clearer messages
      }
      try {
        const { user } = await establishAppSessionFromSupabase({
          accessToken: input.accessToken,
          reqHeaders: ctx.req.headers,
          resHeaders: ctx.resHeaders,
          profile: input.profile,
        });
        return {
          ok: true as const,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            portalRole: user.portalRole,
          },
        };
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Session setup failed.";
        // Never dump raw SQL / Drizzle wrappers to the login UI.
        const message = raw.startsWith("Failed query:")
          ? "Could not sync your account to the app database. Check DATABASE_URL and that public.users exists."
          : raw;
        throw new Error(message);
      }
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
