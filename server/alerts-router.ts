/**
 * Alerts stubs — free plan shows LockedTeaser via FORBIDDEN.
 * Sample-friendly once Analytics is unlocked; no Drizzle.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { effUser } from "./rbac";

function locked(): never {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Tailored alerts are part of the AQ Analytics plan.",
  });
}

export const alertsRouter = createRouter({
  myRules: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    locked();
  }),
  prefs: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return {
      userId: 0,
      timezone: "Europe/London",
      briefTime: "07:00",
      briefEnabled: true,
      whatsappNumber: null as string | null,
      newsletterOptOut: false,
    };
  }),
  feed: authedQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      return { items: [] as unknown[] };
    }),
  saveRule: authedQuery
    .input(z.object({
      subjectType: z.string(),
      subjectKey: z.string(),
      triggerType: z.string(),
      thresholdPct: z.string().optional(),
      delivery: z.string(),
      channels: z.array(z.string()),
    }))
    .mutation(async () => locked()),
  deleteRule: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async () => locked()),
  savePrefs: authedQuery
    .input(z.object({
      timezone: z.string().optional(),
      briefTime: z.string().optional(),
      briefEnabled: z.boolean().optional(),
      whatsappNumber: z.string().nullable().optional(),
    }))
    .mutation(async () => ({ ok: true })),
  briefPreview: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    locked();
  }),
});
