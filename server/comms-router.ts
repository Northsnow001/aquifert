import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, genNumber, logActivity, notify, fmtActor } from "./rbac";
import { summarizeWhatsAppMessage, translateToMandarin } from "./ai";

type ChatMessage = { from: string; text: string; at: string };

export const commsRouter = createRouter({
  inbox: authedQuery
    .input(
      z
        .object({
          source: z.enum(["WHATSAPP", "WECHAT", "EMAIL", "PORTAL"]).optional(),
          status: z.enum(["PENDING", "PROCESSED", "SPAM", "CLARIFICATION"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      assertStaff(await effUser(ctx.user));
      const rows = await getDb().query.conversations.findMany({
        orderBy: desc(s.conversations.createdAt),
        limit: 100,
      });
      return rows.filter(
        (r) =>
          (!input?.source || r.source === input.source) &&
          (!input?.status || r.status === input.status),
      );
    }),

  /** Simulate the AI (re-)summarising a conversation */
  summarize: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const conv = await db.query.conversations.findFirst({ where: eq(s.conversations.id, input.id) });
      if (!conv) throw new Error("Conversation not found");
      const messages = (conv.messages as ChatMessage[]) ?? [];
      const buyerText = messages.filter((m) => m.from === "buyer").map((m) => m.text).join(" ");
      const result = summarizeWhatsAppMessage(buyerText || conv.summary || "");
      const summary = `${result.quantity ?? "?"}t ${result.product ?? "?"} → ${result.destination ?? "?"}. Buyer requested pricing and delivery window.`;
      await db
        .update(s.conversations)
        .set({
          extracted: {
            product: result.product,
            quantity: result.quantity,
            destination: result.destination,
            deliveryDate: result.deliveryDate,
            specialInstructions: result.specialInstructions,
          },
          aiConfidence: result.confidence,
          summary,
        })
        .where(eq(s.conversations.id, input.id));
      await logActivity("AQUIFERT AI", `Summarised ${conv.source.toLowerCase()} inquiry from ${conv.buyerName}`, "conversation", String(input.id));
      return { extracted: result, confidence: result.confidence, summary };
    }),

  /** Convert an inquiry into a formal Request Card */
  createRequestCard: authedQuery
    .input(z.object({ conversationId: z.number(), buyerId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const conv = await db.query.conversations.findFirst({
        where: eq(s.conversations.id, input.conversationId),
      });
      if (!conv) throw new Error("Conversation not found");
      const ext = (conv.extracted as Record<string, unknown>) ?? {};
      let buyerId = input.buyerId;
      if (!buyerId) {
        const byName = await db.query.users.findFirst({
          where: eq(s.users.name, conv.buyerName ?? ""),
        });
        buyerId = byName?.id;
      }
      if (!buyerId) {
        const anyBuyer = await db.query.users.findFirst({ where: eq(s.users.portalRole, "BUYER") });
        buyerId = anyBuyer?.id;
      }
      if (!buyerId) throw new Error("No buyer available to attach this request to");

      const requestNumber = genNumber("REQ");
      const [{ id }] = await db
        .insert(s.requests)
        .values({
          requestNumber,
          buyerId,
          product: ((ext.product as string)?.toUpperCase() as s.Request["product"]) || "UREA",
          quantity: Number(ext.quantity ?? 50),
          destination: (ext.destination as string) || "Felixstowe, UK",
          deliveryDate: ext.deliveryDate ? new Date(ext.deliveryDate as string) : null,
          incoterms: "CIF",
          specialInstructions: (ext.specialInstructions as string) ?? null,
          status: "NEW",
          originChannel: conv.source === "WECHAT" ? "WHATSAPP" : conv.source,
        })
        .returning({ id: s.requests.id });
      await db
        .update(s.conversations)
        .set({ status: "PROCESSED", requestId: id })
        .where(eq(s.conversations.id, input.conversationId));
      await logActivity(fmtActor(me), `Created Request Card ${requestNumber} from ${conv.source.toLowerCase()} inquiry`, "request", requestNumber, me.id);
      return { id, requestNumber };
    }),

  markSpam: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      await getDb().update(s.conversations).set({ status: "SPAM" }).where(eq(s.conversations.id, input.id));
      await logActivity(fmtActor(me), `Marked conversation #${input.id} as spam`, "conversation", String(input.id), me.id);
      return { ok: true };
    }),

  requestClarification: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const conv = await db.query.conversations.findFirst({ where: eq(s.conversations.id, input.id) });
      if (!conv) throw new Error("Conversation not found");
      const messages = (conv.messages as ChatMessage[]) ?? [];
      messages.push({
        from: "ai",
        text: "Thanks for your inquiry, could you confirm the product grade, exact tonnage and required delivery window so we can firm up pricing?",
        at: new Date().toISOString(),
      });
      await db
        .update(s.conversations)
        .set({ status: "CLARIFICATION", messages })
        .where(eq(s.conversations.id, input.id));
      await logActivity("AQUIFERT AI", `Requested clarification from ${conv.buyerName}`, "conversation", String(input.id));
      return { ok: true };
    }),

  /** Demo: fabricate a fresh inbound inquiry so staff can see the flow */
  simulateInbound: authedQuery.mutation(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const samples = [
      { name: "George Pattison", src: "WHATSAPP" as const, text: "Hi, need a price for 120 tons of UREA to Southampton, UK. Delivery within 5 weeks please." },
      { name: "Megan Hughes", src: "EMAIL" as const, text: "Please quote 60 tons DAP delivered to Belfast, UK. DDP terms if possible." },
      { name: "Robert Sinclair", src: "WHATSAPP" as const, text: "Looking for 200 tons of MOP to Teesport, UK in about 6 weeks. Best price?" },
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)];
    const extracted = summarizeWhatsAppMessage(sample.text);
    const [{ id }] = await db
      .insert(s.conversations)
      .values({
        buyerName: sample.name,
        source: sample.src,
        participants: [sample.name, "AQUIFERT AI"],
        messages: [
          { from: "buyer", text: sample.text, at: new Date().toISOString() },
          { from: "ai", text: "Thanks! I'm checking live supplier availability and freight rates, the team will confirm shortly.", at: new Date().toISOString() },
        ],
        extracted: {
          product: extracted.product,
          quantity: extracted.quantity,
          destination: extracted.destination,
          deliveryDate: extracted.deliveryDate,
          specialInstructions: extracted.specialInstructions,
        },
        summary: `${extracted.quantity}t ${extracted.product} → ${extracted.destination}. Buyer requested pricing and delivery window.`,
        aiConfidence: extracted.confidence,
        status: "PENDING",
      })
      .returning({ id: s.conversations.id });
    await logActivity("AQUIFERT AI", `New ${sample.src.toLowerCase()} inquiry from ${sample.name}`, "conversation", String(id));
    void translateToMandarin;
    void notify;
    return { id };
  }),
});
