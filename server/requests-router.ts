import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { assertVerifiedEmail } from "./verify-gate";
import * as s from "@db/schema";
import { effUser, assertStaff, assertBuyer, genNumber, logActivity, notify, fmtActor } from "./rbac";
import { translateToMandarin } from "./ai";

export const requestsRouter = createRouter({
  /** Staff: all request cards with buyer info */
  list: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    return getDb().query.requests.findMany({
      with: { buyer: { with: { organization: true } }, quotes: true },
      orderBy: desc(s.requests.createdAt),
      limit: 200,
    });
  }),

  /** Buyer: my requests */
  mine: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    assertBuyer(me);
    return getDb().query.requests.findMany({
      where: eq(s.requests.buyerId, me.id),
      with: { quotes: true },
      orderBy: desc(s.requests.createdAt),
      limit: 100,
    });
  }),

  create: authedQuery
    .input(
      z.object({
        product: z.enum(["UREA", "DAP", "MOP", "MAP", "NPK"]),
        quantity: z.number().positive().max(100000),
        destination: z.string().min(2),
        deliveryDate: z.coerce.date().optional(),
        incoterms: z.enum(["DDP", "FOB", "CIF"]),
        specialInstructions: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertBuyer(me);
      await assertVerifiedEmail(me.id); // soft gate: Order Desk enquiry requires verified email
      const db = getDb();
      const requestNumber = genNumber("REQ");
      const [{ id }] = await db
        .insert(s.requests)
        .values({
          requestNumber,
          buyerId: me.id,
          product: input.product,
          quantity: input.quantity,
          destination: input.destination,
          deliveryDate: input.deliveryDate ?? null,
          incoterms: input.incoterms,
          specialInstructions: input.specialInstructions ?? null,
          status: "NEW",
          originChannel: "PORTAL",
        })
        .returning({ id: s.requests.id });
      await logActivity(fmtActor(me), `Submitted request ${requestNumber} (${input.quantity}t ${input.product})`, "request", requestNumber, me.id);
      await notify(me.id, "REQUEST_CREATED", "Request received", `Request ${requestNumber} is with our sourcing team, quotes typically land within 24h.`, "/buyer/quotes");
      return { id, requestNumber };
    }),

  archive: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      await getDb().update(s.requests).set({ archived: true }).where(eq(s.requests.id, input.id));
      await logActivity(fmtActor(me), `Archived request #${input.id}`, "request", String(input.id), me.id);
      return { ok: true };
    }),

  /** Quote flow step 1–2: assign suppliers + bilingual AI message */
  sendToSuppliers: authedQuery
    .input(
      z.object({
        requestId: z.number(),
        supplierIds: z.array(z.number()).min(1),
        message: z.string().min(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const req = await db.query.requests.findFirst({ where: eq(s.requests.id, input.requestId) });
      if (!req) throw new Error("Request not found");
      const zhMessage = translateToMandarin(input.message);
      for (const supplierId of input.supplierIds) {
        await db.insert(s.supplierRequests).values({
          requestId: input.requestId,
          supplierId,
          status: "NEW",
          supplierMessage: `${input.message}\n\n${zhMessage}`,
        });
        await notify(supplierId, "NEW_REQUEST", "New sourcing request", `AQUIFERT requests a quote: ${req.quantity}t ${req.product} → ${req.destination}.`, "/supplier/requests");
      }
      await db.update(s.requests).set({ status: "QUOTED" }).where(eq(s.requests.id, input.requestId));
      await logActivity(fmtActor(me), `Sent ${req.requestNumber} to ${input.supplierIds.length} supplier(s)`, "request", req.requestNumber, me.id);
      return { ok: true, zhMessage };
    }),

  /** Supplier assignment inbox rows for a request */
  assignments: authedQuery
    .input(z.object({ requestId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertStaff(await effUser(ctx.user));
      return getDb().query.supplierRequests.findMany({
        where: eq(s.supplierRequests.requestId, input.requestId),
        with: { supplier: { with: { organization: true } } },
      });
    }),
});
