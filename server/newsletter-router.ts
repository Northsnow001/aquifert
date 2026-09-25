/**
 * Newsletter stubs — free plan shows LockedTeaser via FORBIDDEN.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { effUser } from "./rbac";

function locked(): never {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "The paid newsletter is part of the AQ Analytics plan.",
  });
}

export const newsletterRouter = createRouter({
  archive: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    locked();
  }),
  issue: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx }) => {
      await effUser(ctx.user);
      locked();
    }),
  setOptOut: authedQuery
    .input(z.object({ optOut: z.boolean() }))
    .mutation(async () => ({ ok: true })),
  adminList: authedQuery.query(async ({ ctx }) => {
    await effUser(ctx.user);
    return [] as unknown[];
  }),
  adminSave: authedQuery
    .input(z.object({
      id: z.number().optional(),
      subject: z.string(),
      body: z.string(),
    }))
    .mutation(async () => ({ ok: true, id: 0 })),
  adminSend: authedQuery
    .input(z.object({ id: z.number(), to: z.enum(["preview", "all"]) }))
    .mutation(async () => ({ ok: true, sent: 0 })),
  adminSchedule: authedQuery
    .input(z.object({ id: z.number(), scheduledAt: z.string() }))
    .mutation(async () => ({ ok: true })),
});
