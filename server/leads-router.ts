import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";
import { eq } from "drizzle-orm";
import { logActivity, notify } from "./rbac";

/** Hot = buying role + meaningful volume + near-term timeline. */
function scoreLead(role: string | undefined, volume: string | undefined, timeline: string | undefined) {
  let pts = 0;
  if (role && ["Trader", "Buyer / Procurement", "Producer", "Distributor"].includes(role)) pts += 2;
  else if (role === "Executive") pts += 1;
  if (volume && !["Under 1,000 MT", "N/A"].includes(volume)) pts += 2;
  else if (volume === "Under 1,000 MT") pts += 1;
  if (timeline === "Immediately") pts += 2;
  else if (timeline === "Within 1 month") pts += 1;
  if (pts >= 5) return "HOT" as const;
  if (pts >= 2) return "WARM" as const;
  return "COLD" as const;
}

export const leadsRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        intent: z.string().min(1),
        source: z.string().min(1),
        products: z.array(z.string()).min(1),
        regions: z.array(z.string()).min(1),
        goals: z.array(z.string()).min(1),
        fullName: z.string().min(2),
        email: z.string().email(),
        company: z.string().min(1),
        country: z.string().min(1),
        role: z.string().optional(),
        annualVolume: z.string().optional(),
        timeline: z.string().optional(),
        phone: z.string().optional(),
        termsAccepted: z.literal(true),
        marketingOptIn: z.boolean(),
        consentPolicyVersion: z.string(),
        consentAt: z.string(),
        cookieConsent: z.object({
          analytics: z.boolean(),
          marketing: z.boolean(),
          version: z.string(),
        }),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        referrer: z.string().optional(),
        landingPage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const score = scoreLead(input.role, input.annualVolume, input.timeline);
      const ip =
        ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.req.headers.get("x-real-ip") ??
        null;
      const r = await db
        .insert(s.leads)
        .values({
          ...input,
          consentAt: new Date(input.consentAt),
          consentIp: ip,
          score,
        })
        .returning({ id: s.leads.id });

      if (score === "HOT") {
        // Alert the trading desk (admins), hot leads only.
        const admins = await db.select().from(s.users).where(eq(s.users.role, "admin"));
        for (const a of admins) {
          await notify(
            Number(a.id),
            "LEAD_HOT",
            "Hot lead captured",
            `${input.fullName} (${input.company}, ${input.country}), ${input.role ?? "role n/a"}, ${input.annualVolume ?? "volume n/a"}, timeline: ${input.timeline ?? "n/a"}. Email: ${input.email}`,
          );
        }
        await logActivity("system", "LEAD_HOT", "lead", String(Number(r[0].id)));
      }
      return { id: Number(r[0].id), score };
    }),

  /** Public contact-page message (no account needed). Always notifies the desk. */
  contact: publicQuery
    .input(
      z.object({
        channel: z.enum(["whatsapp", "book_call", "message", "callback"]),
        name: z.string().min(2),
        email: z.string().email(),
        company: z.string().optional(),
        message: z.string().min(4).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const r = await db.insert(s.contactMessages).values({
        channel: input.channel,
        name: input.name,
        email: input.email,
        company: input.company || null,
        message: input.message,
      }).returning({ id: s.contactMessages.id });
      const label = { whatsapp: "WhatsApp", book_call: "Call booking", message: "Message", callback: "Callback request" }[input.channel];
      const admins = await db.select().from(s.users).where(eq(s.users.role, "admin"));
      for (const a of admins) {
        await notify(Number(a.id), "CONTACT_MESSAGE", `Contact page: ${label}`, `${input.name} (${input.email}${input.company ? ", " + input.company : ""}): ${input.message.slice(0, 300)}`);
      }
      await logActivity("system", `CONTACT_${input.channel.toUpperCase()}`, "contact_message", String(Number(r[0].id)));
      return { id: Number(r[0].id) };
    }),
});
