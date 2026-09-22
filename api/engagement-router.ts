import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, logActivity, fmtActor } from "./rbac";

const RESHOW_DAYS = 45;
const MAX_DISMISSALS = 2;

export const engagementRouter = createRouter({
  /**
   * Server-side suppression state. Trigger timing (session count, cumulative
   * Hub time, calculation completion) is evaluated client-side; this decides
   * whether the user may see the prompt at all.
   */
  promptState: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const db = getDb();

    const membership = await db.query.memberships.findFirst({
      where: and(eq(s.memberships.userId, me.id), eq(s.memberships.status, "ACTIVE")),
      orderBy: desc(s.memberships.createdAt),
    });
    if (membership) return { eligible: false as const, reason: "PAID_MEMBER" as const };

    const events = await db.query.engagementPromptEvents.findMany({
      where: eq(s.engagementPromptEvents.userId, me.id),
      orderBy: desc(s.engagementPromptEvents.createdAt),
      limit: 20,
    });
    const dismissals = events.filter((e) => e.event === "DISMISS");
    if (dismissals.length >= MAX_DISMISSALS)
      return { eligible: false as const, reason: "DISMISSED_TWICE" as const };

    const since = new Date(Date.now() - RESHOW_DAYS * 864e5);
    const recent = events.filter((e) => e.createdAt >= since);
    if (recent.length > 0)
      return { eligible: false as const, reason: "SHOWN_RECENTLY" as const };

    return { eligible: true as const, reason: null };
  }),

  recordEvent: authedQuery
    .input(z.object({
      event: z.enum(["VIEW", "DISMISS", "SUBSCRIBE"]),
      tab: z.enum(["NEWSLETTER", "MEMBERSHIP"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      await getDb().insert(s.engagementPromptEvents).values({
        userId: me.id, event: input.event, tab: input.tab ?? null,
      });
      return { ok: true };
    }),

  subscribeNewsletter: authedQuery
    .input(z.object({
      email: z.string().email(),
      frequency: z.enum(["DAILY", "WEEKLY", "MAJOR_MOVES"]),
      marketingOptIn: z.literal(true), // never bundled, must be an explicit tick
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const db = getDb();
      const [{ id }] = await db.insert(s.newsletterSubs).values({
        userId: me.id,
        email: input.email.toLowerCase(),
        frequency: input.frequency,
        marketingOptIn: true,
        consentAt: new Date(),
      }).returning({ id: s.engagementPromptEvents.id });
      await db.insert(s.engagementPromptEvents).values({
        userId: me.id, event: "SUBSCRIBE", tab: "NEWSLETTER",
      });
      await logActivity(fmtActor(me), `Subscribed to newsletter (${input.frequency})`, "newsletter", String(id), me.id);
      return { ok: true };
    }),
});
