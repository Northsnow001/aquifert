import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, assertStaff, assertBuyer, logActivity, fmtActor } from "./rbac";
import { scanText, maskText, type ProtectedEntityInput } from "./lib/firewall";
import { crossCheckDocuments } from "./lib/consistency";
import { regenerateClassA, type DocGenContext } from "./lib/docgen";

async function entitiesForOrder(orderId: number): Promise<ProtectedEntityInput[]> {
  const rows = await getDb().query.protectedEntities.findMany({ where: eq(s.protectedEntities.orderId, orderId) });
  return rows.map((r) => ({
    entityName: r.entityName,
    aliases: (r.aliases as string[]) ?? [],
    phones: (r.phones as string[]) ?? [],
    addresses: (r.addresses as string[]) ?? [],
    bankAccounts: (r.bankAccounts as string[]) ?? [],
    contacts: (r.contacts as string[]) ?? [],
  }));
}

async function docGenContextForOrder(orderId: number): Promise<DocGenContext> {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
  if (!order) throw new Error("Trade not found");
  const quote = await db.query.quotes.findFirst({ where: eq(s.quotes.id, order.quoteId) });
  const req = quote ? await db.query.requests.findFirst({ where: eq(s.requests.id, quote.requestId) }) : null;
  const buyer = req ? await db.query.users.findFirst({ where: eq(s.users.id, req.buyerId) }) : null;
  const buyerOrg = buyer?.organizationId
    ? await db.query.organizations.findFirst({ where: eq(s.organizations.id, buyer.organizationId) })
    : null;
  const shipment = await db.query.shipments.findFirst({ where: eq(s.shipments.orderId, orderId) });
  return {
    tradeRef: order.tradeRef ?? order.orderNumber,
    sellContractRef: order.sellContractRef,
    buyerName: buyerOrg?.name ?? buyer?.name ?? "Buyer",
    product: req?.product ?? "FERTILIZER",
    sellSpec: order.sellSpec,
    sellQtyMt: order.sellQtyMt ?? (req ? Number(req.quantity) : null),
    tolerancePct: order.tolerancePct,
    sellPricePerMt: order.sellPricePerMt,
    currency: order.tradeCurrency,
    destination: req?.destination ?? shipment?.destinationPort ?? "As per contract",
    packing: "25kg buyer's-design bags, 40 bags per pallet, palletised in containers",
    containers: shipment?.containerNumber,
  };
}

/**
 * Document gate, default-deny, three states, human clearance on every flag.
 * The engine flags; a human clears; nothing that could reveal a supplier
 * reaches a buyer, ever.
 */
export const docgateRouter = createRouter({
  /* ---------------- Protected-entity set management ---------------- */

  listEntities: authedQuery.input(z.object({ orderId: z.number() })).query(async ({ ctx, input }) => {
    assertStaff(await effUser(ctx.user));
    return getDb().query.protectedEntities.findMany({ where: eq(s.protectedEntities.orderId, input.orderId) });
  }),

  addEntity: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        entityName: z.string().min(2),
        role: z.enum(["CONTRACTING_SELLER", "MAINLAND_ENTITY", "EXPORT_OF_RECORD", "CONTACT", "BANK", "OTHER"]),
        aliases: z.array(z.string()).optional(),
        phones: z.array(z.string()).optional(),
        addresses: z.array(z.string()).optional(),
        bankAccounts: z.array(z.string()).optional(),
        contacts: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const [{ id }] = await getDb().insert(s.protectedEntities).values(input).returning({ id: s.protectedEntities.id });
      await logActivity(fmtActor(me), `Added protected entity "${input.entityName}" to trade #${input.orderId}`, "order", String(input.orderId), me.id);
      return { id };
    }),

  removeEntity: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    await getDb().delete(s.protectedEntities).where(eq(s.protectedEntities.id, input.id));
    return { ok: true };
  }),

  /** Dry-run the firewall on arbitrary text against a trade's set. */
  scanPreview: authedQuery
    .input(z.object({ orderId: z.number(), text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      assertStaff(await effUser(ctx.user));
      const entities = await entitiesForOrder(input.orderId);
      return { findings: scanText(input.text, entities), entityCount: entities.length };
    }),

  /* ---------------- Ingestion + 3-state gate ---------------- */

  /** Staff gate queue: every document with its gate state and findings. */
  queue: authedQuery.query(async ({ ctx }) => {
    assertStaff(await effUser(ctx.user));
    const db = getDb();
    const docs = await db.select().from(s.documents).orderBy(desc(s.documents.createdAt));
    return Promise.all(
      docs.map(async (d) => {
        const order = await db.query.orders.findFirst({ where: eq(s.orders.id, d.orderId) });
        return { ...d, orderNumber: order?.orderNumber ?? "N/A", tradeRef: order?.tradeRef ?? null };
      }),
    );
  }),

  /**
   * Ingest a raw supplier document (text body, OCR-extracted upstream).
   * On upload the body is screened against the whole protected-entity set,
   * incl. non-Latin scripts and internal annotations. Default: BLOCKED.
   */
  ingest: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        type: z.enum(["INVOICE", "PACKING_LIST", "BOL", "CERTIFICATE", "CUSTOMS", "SDS"]),
        name: z.string().min(1),
        text: z.string().min(1),
        docClass: z.enum(["A", "B", "C"]).default("A"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      assertStaff(me);
      const db = getDb();
      const entities = await entitiesForOrder(input.orderId);
      const findings = scanText(input.text, entities);
      const gateState = findings.length > 0 ? "RESOLVE_THEN_PASS" : "BLOCKED";
      const fixAction =
        findings.length === 0
          ? null
          : input.docClass === "A"
            ? "REGENERATE"
            : input.docClass === "B"
              ? "SWITCH_BL"
              : "REISSUE_COO";
      const [{ id }] = await db
        .insert(s.documents)
        .values({
          orderId: input.orderId,
          type: input.type,
          name: input.name,
          rawText: input.text,
          docClass: input.docClass,
          gateState,
          scanFindings: findings,
          fixAction,
          uploadedBy: me.id,
        })
        .returning({ id: s.documents.id });
      await logActivity(
        fmtActor(me),
        `Ingested ${input.name} for trade #${input.orderId}, gate: ${gateState}${findings.length ? ` (${findings.length} leak findings)` : ""}`,
        "document",
        String(id),
        me.id,
      );
      return { id, gateState, findings };
    }),

  /**
   * Apply the known fix for a flagged document.
   *  - Class A: regenerate clean on Aquifert letterhead from trade data.
   *  - Class B: switch-B/L body, Aquifert named as shipper, annotations stripped.
   *  - Class C: substitute/masked version (flag persists for source re-issue).
   * After the fix the document is re-scanned; clean → PASS (still needs human clearance).
   */
  applyFix: authedQuery.input(z.object({ documentId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const doc = await db.query.documents.findFirst({ where: eq(s.documents.id, input.documentId) });
    if (!doc) throw new Error("Document not found");
    const entities = await entitiesForOrder(doc.orderId);

    let cleanText: string;
    let fixAction = doc.fixAction ?? "REGENERATE";
    if (doc.docClass === "A") {
      cleanText = regenerateClassA(doc.type as Parameters<typeof regenerateClassA>[0], await docGenContextForOrder(doc.orderId));
      fixAction = "REGENERATE";
    } else if (doc.docClass === "B") {
      const c = await docGenContextForOrder(doc.orderId);
      cleanText =
        maskText(doc.rawText ?? "", entities) +
        `\n\n[SWITCH BILL OF LADING, issued under Letter of Indemnity]\nShipper: AQUIFERT LIMITED, London\nTrade: ${c.tradeRef}\nAll internal routing annotations removed.`;
      fixAction = "SWITCH_BL";
    } else {
      cleanText = maskText(doc.rawText ?? "", entities);
      fixAction = doc.fixAction === "REISSUE_COO" ? "REISSUE_COO" : "SUBSTITUTE";
    }

    const residual = scanText(cleanText, entities);
    const gateState = residual.length > 0 ? (doc.docClass === "C" ? "HARD_NO_GO" : "RESOLVE_THEN_PASS") : "PASS";
    await db
      .update(s.documents)
      .set({ cleanText, scanFindings: residual, gateState, fixAction, buyerReleasable: false, clearedBy: null, clearedAt: null })
      .where(eq(s.documents.id, doc.id));
    await logActivity(fmtActor(me), `Applied fix ${fixAction} to ${doc.name}, gate now ${gateState}`, "document", String(doc.id), me.id);
    return { gateState, residualFindings: residual };
  }),

  /**
   * Human clearance, the only path to buyer release.
   * Requires gateState=PASS (clean scan already confirmed by the engine).
   */
  clear: authedQuery.input(z.object({ documentId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const doc = await db.query.documents.findFirst({ where: eq(s.documents.id, input.documentId) });
    if (!doc) throw new Error("Document not found");
    if (doc.gateState !== "PASS") throw new Error("Default-deny: only PASS documents can be cleared for buyer release");
    await db
      .update(s.documents)
      .set({ buyerReleasable: true, clearedBy: me.id, clearedAt: new Date() })
      .where(eq(s.documents.id, doc.id));
    await logActivity(fmtActor(me), `CLEARED ${doc.name} for buyer release (trade #${doc.orderId})`, "document", String(doc.id), me.id);
    return { ok: true };
  }),

  hardBlock: authedQuery.input(z.object({ documentId: z.number(), reason: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    await db
      .update(s.documents)
      .set({ gateState: "HARD_NO_GO", buyerReleasable: false })
      .where(eq(s.documents.id, input.documentId));
    await logActivity(fmtActor(me), `HARD NO-GO on document #${input.documentId}${input.reason ? `: ${input.reason}` : ""}`, "document", String(input.documentId), me.id);
    return { ok: true };
  }),

  /* ---------------- Cross-document consistency ---------------- */

  runConsistencyCheck: authedQuery.input(z.object({ orderId: z.number() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertStaff(me);
    const db = getDb();
    const docs = await db.query.documents.findMany({ where: eq(s.documents.orderId, input.orderId) });
    const forCheck = docs
      .map((d) => ({ id: d.id, name: d.name ?? `Document #${d.id}`, text: d.cleanText ?? d.rawText ?? "" }))
      .filter((d) => d.text.length > 0);
    const flags = crossCheckDocuments(forCheck);
    if (flags.length > 0) {
      await logActivity(
        fmtActor(me),
        `Consistency check on trade #${input.orderId}: ${flags.length} mismatch flag(s), ${flags.map((f) => f.field).join(", ")}`,
        "order",
        String(input.orderId),
        me.id,
      );
    }
    return { flags, documentsChecked: forCheck.length };
  }),

  /* ---------------- Buyer side: only cleared documents exist ---------------- */

  buyerDocuments: authedQuery.input(z.object({ orderId: z.number() })).query(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    assertBuyer(me);
    const db = getDb();
    const docs = await db.query.documents.findMany({
      where: eq(s.documents.orderId, input.orderId),
      orderBy: desc(s.documents.createdAt),
    });
    // Default-deny: buyers only ever see human-cleared, PASS documents.
    return docs
      .filter((d) => d.buyerReleasable && d.gateState === "PASS")
      .map((d) => ({ id: d.id, type: d.type, name: d.name, cleanText: d.cleanText, clearedAt: d.clearedAt }));
  }),
});
