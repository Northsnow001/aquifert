/**
 * Library admin (desk back office), manual upload, management, versioning,
 * AI generation trigger and the editorial review workflow.
 *
 * Reachable only by staff roles (ADMIN / OPERATIONS / FINANCE / SUPPORT).
 * AI drafts land in `in_review` and NEVER auto-publish unless
 * AI_AUTOPUBLISH=true (default false, per the brief, a human publishes).
 */
import { z } from "zod";
import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";
import type { LibraryBodySection } from "../db/schema";
import { effUser } from "./rbac";
import { LIBRARY_ENABLED, AI_REPORTS_ENABLED, AI_AUTOPUBLISH } from "./library-router";
import {
  AI_MODEL_ID,
  AI_PROMPT_VERSION,
  assembleCorpus,
  generateWeeklyReport,
  validateReport,
  derivedNumbers,
} from "./library-ai";
import { renderReportPdf } from "./lib/library-pdf";

const STAFF = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"];
const uuid = () => crypto.randomUUID();

/** §6.4: on publish, render + store the brand PDF so the Library holds both
 *  a web page and a downloadable file. Best-effort, never blocks a publish,
 *  and never overwrites a staff-attached original file. */
async function attachRenderedPdf(reportId: string) {
  try {
    const db = getDb();
    const report = await db.query.libraryReports.findFirst({
      where: eq(s.libraryReports.id, reportId),
    });
    if (!report || report.filePath) return;
    const sources = await db
      .select()
      .from(s.libraryReportSources)
      .where(eq(s.libraryReportSources.reportId, reportId));
    const pdf = await renderReportPdf(report, sources);
    await db
      .update(s.libraryReports)
      .set({ filePath: pdf.filePath, fileName: pdf.fileName, fileSizeBytes: pdf.fileSizeBytes, fileMime: pdf.fileMime })
      .where(eq(s.libraryReports.id, reportId));
  } catch (err) {
    console.error("[library] PDF artefact render failed for", reportId, err);
  }
}

async function requireStaff(ctxUser: Parameters<typeof effUser>[0]) {
  const me = await effUser(ctxUser);
  if (!me.portalRole || !STAFF.includes(me.portalRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff only" });
  }
  return me;
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || `report-${Date.now()}`
  );
}

async function snapshotVersion(reportId: string, changedBy: number, note: string) {
  const db = getDb();
  const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, reportId) });
  if (!report) return;
  const sources = await db
    .select()
    .from(s.libraryReportSources)
    .where(eq(s.libraryReportSources.reportId, reportId));
  const [maxV] = await db
    .select({ v: sql<number | null>`MAX(${s.libraryReportVersions.version})` })
    .from(s.libraryReportVersions)
    .where(eq(s.libraryReportVersions.reportId, reportId));
  await db.insert(s.libraryReportVersions).values({
    id: uuid(),
    reportId,
    version: (maxV?.v ?? 0) + 1,
    snapshot: { report, sources } as never,
    changedBy,
    changeNote: note,
  });
}

const reportInput = z.object({
  title: z.string().min(3),
  reportType: z.enum(["weekly_market", "special_report", "data_pack", "training", "other"]),
  weekNumber: z.number().int().min(1).max(53).optional(),
  year: z.number().int().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  summary: z.string().min(10),
  body: z
    .array(
      z.object({
        key: z.string(),
        heading: z.string(),
        paragraphs: z.array(z.string()),
        citations: z.array(z.object({ sourceRefId: z.string(), marker: z.number() })).default([]),
      })
    )
    .optional(),
  accessLevel: z.enum(["free", "members", "premium"]),
  tags: z.array(z.string()).default([]),
  authorName: z.string().optional(),
});

export const libraryAdminRouter = createRouter({
  /** Every report in every status + any running/failed generations. */
  list: authedQuery
    .input(
      z.object({
        status: z.string().optional(),
        reportType: z.string().optional(),
        accessLevel: z.string().optional(),
        origin: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!LIBRARY_ENABLED()) return { items: [], generations: [] };
      const me = await requireStaff(ctx.user);
      void me;
      const db = getDb();
      const conds = [];
      if (input.status) conds.push(eq(s.libraryReports.status, input.status as never));
      if (input.reportType) conds.push(eq(s.libraryReports.reportType, input.reportType as never));
      if (input.accessLevel) conds.push(eq(s.libraryReports.accessLevel, input.accessLevel as never));
      if (input.origin) conds.push(eq(s.libraryReports.origin, input.origin as never));
      const items = await db
        .select()
        .from(s.libraryReports)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(s.libraryReports.createdAt))
        .limit(200);
      const generations = await db
        .select()
        .from(s.libraryGenerationLog)
        .orderBy(desc(s.libraryGenerationLog.startedAt))
        .limit(5);
      return { items, generations };
    }),

  get: authedQuery.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const me = await requireStaff(ctx.user);
    void me;
    const db = getDb();
    const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
    const sources = await db
      .select()
      .from(s.libraryReportSources)
      .where(eq(s.libraryReportSources.reportId, input.id));
    const versions = await db
      .select({
        id: s.libraryReportVersions.id,
        version: s.libraryReportVersions.version,
        changedBy: s.libraryReportVersions.changedBy,
        changeNote: s.libraryReportVersions.changeNote,
        createdAt: s.libraryReportVersions.createdAt,
      })
      .from(s.libraryReportVersions)
      .where(eq(s.libraryReportVersions.reportId, input.id))
      .orderBy(desc(s.libraryReportVersions.version));
    return { report, sources, versions };
  }),

  /** Manual upload / create by hand (Section 4.2). */
  create: authedQuery.input(reportInput).mutation(async ({ ctx, input }) => {
    if (!LIBRARY_ENABLED()) throw new TRPCError({ code: "FORBIDDEN", message: "Library is disabled" });
    const me = await requireStaff(ctx.user);
    const db = getDb();
    const id = uuid();
    await db.insert(s.libraryReports).values({
      id,
      title: input.title,
      slug: `${slugify(input.title)}-${id.slice(0, 8)}`,
      reportType: input.reportType,
      weekNumber: input.weekNumber ?? null,
      year: input.year ?? null,
      periodStart: input.periodStart ? new Date(input.periodStart) : null,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
      summary: input.summary,
      body: (input.body as LibraryBodySection[]) ?? [],
      accessLevel: input.accessLevel,
      origin: "manual_upload",
      status: "draft",
      authorName: input.authorName || "Aquifert Desk",
      tags: input.tags,
      createdBy: me.id,
    });
    return { id };
  }),

  /** Edit. Editing a PUBLISHED report snapshots the current version first. */
  update: authedQuery
    .input(reportInput.partial().extend({ id: z.string(), changeNote: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      const db = getDb();
      const existing = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      await snapshotVersion(input.id, me.id, input.changeNote ?? "Edit before update");
      const { id, changeNote, ...fields } = input;
      void changeNote;
      await db
        .update(s.libraryReports)
        .set({
          ...(fields.title ? { title: fields.title } : {}),
          ...(fields.reportType ? { reportType: fields.reportType } : {}),
          ...(fields.weekNumber !== undefined ? { weekNumber: fields.weekNumber } : {}),
          ...(fields.year !== undefined ? { year: fields.year } : {}),
          ...(fields.periodStart !== undefined ? { periodStart: fields.periodStart ? new Date(fields.periodStart) : null } : {}),
          ...(fields.periodEnd !== undefined ? { periodEnd: fields.periodEnd ? new Date(fields.periodEnd) : null } : {}),
          ...(fields.summary ? { summary: fields.summary } : {}),
          ...(fields.body ? { body: fields.body as LibraryBodySection[] } : {}),
          ...(fields.accessLevel ? { accessLevel: fields.accessLevel } : {}),
          ...(fields.tags ? { tags: fields.tags } : {}),
          ...(fields.authorName ? { authorName: fields.authorName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(s.libraryReports.id, id));
      return { ok: true };
    }),

  attachFile: authedQuery
    .input(
      z.object({
        id: z.string(),
        fileName: z.string(),
        fileSizeBytes: z.number(),
        fileMime: z.string(),
        storagePath: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      void me;
      const db = getDb();
      await db
        .update(s.libraryReports)
        .set({
          filePath: input.storagePath,
          fileName: input.fileName,
          fileSizeBytes: input.fileSizeBytes,
          fileMime: input.fileMime,
          updatedAt: new Date(),
        })
        .where(eq(s.libraryReports.id, input.id));
      return { ok: true };
    }),

  /** Publish now / schedule / archive. Publishing an AI draft requires all
   *  blocking validation flags resolved and records the reviewer. */
  publish: authedQuery
    .input(z.object({ id: z.string(), scheduledFor: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      const db = getDb();
      const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      const flags = (report.validationFlags ?? []) as s.LibraryValidationFlag[];
      const unresolvedBlocking = flags.filter((f) => f.blocking && !f.resolved);
      if (unresolvedBlocking.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${unresolvedBlocking.length} blocking validation flag(s) must be resolved before publishing`,
        });
      }
      if (input.scheduledFor) {
        await db
          .update(s.libraryReports)
          .set({ status: "approved", scheduledFor: new Date(input.scheduledFor), updatedAt: new Date() })
          .where(eq(s.libraryReports.id, input.id));
        return { ok: true, scheduled: true };
      }
      await db
        .update(s.libraryReports)
        .set({
          status: "published",
          publishedAt: new Date(),
          aiReviewedBy: report.origin === "ai_generated" ? me.id : report.aiReviewedBy,
          aiReviewedAt: report.origin === "ai_generated" ? new Date() : report.aiReviewedAt,
          updatedAt: new Date(),
        })
        .where(eq(s.libraryReports.id, input.id));
      await attachRenderedPdf(input.id);
      return { ok: true, scheduled: false };
    }),

  archive: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const me = await requireStaff(ctx.user);
    void me;
    await getDb()
      .update(s.libraryReports)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(s.libraryReports.id, input.id));
    return { ok: true };
  }),

  bulk: authedQuery
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        action: z.enum(["publish", "archive"]),
        accessLevel: z.enum(["free", "members", "premium"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      const db = getDb();
      for (const id of input.ids) {
        if (input.accessLevel) {
          await db.update(s.libraryReports).set({ accessLevel: input.accessLevel, updatedAt: new Date() }).where(eq(s.libraryReports.id, id));
        }
        if (input.action === "archive") {
          await db.update(s.libraryReports).set({ status: "archived", updatedAt: new Date() }).where(eq(s.libraryReports.id, id));
        } else {
          const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, id) });
          const flags = (report?.validationFlags ?? []) as s.LibraryValidationFlag[];
          if (flags.some((f) => f.blocking && !f.resolved)) continue; // skip, never force
          await db
            .update(s.libraryReports)
            .set({
              status: "published",
              publishedAt: new Date(),
              aiReviewedBy: report?.origin === "ai_generated" ? me.id : report?.aiReviewedBy,
              aiReviewedAt: report?.origin === "ai_generated" ? new Date() : report?.aiReviewedAt,
              updatedAt: new Date(),
            })
            .where(eq(s.libraryReports.id, id));
          await attachRenderedPdf(id);
        }
      }
      return { ok: true };
    }),

  /** Version history rollback. */
  rollback: authedQuery
    .input(z.object({ id: z.string(), versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      const db = getDb();
      const version = await db.query.libraryReportVersions.findFirst({
        where: and(eq(s.libraryReportVersions.id, input.versionId), eq(s.libraryReportVersions.reportId, input.id)),
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      await snapshotVersion(input.id, me.id, `Rollback to v${version.version}`);
      const snap = version.snapshot as { report: Record<string, unknown>; sources: Record<string, unknown>[] };
      const r = snap.report;
      await db
        .update(s.libraryReports)
        .set({
          title: r.title as string,
          summary: r.summary as string,
          body: r.body as never,
          accessLevel: r.accessLevel as never,
          tags: r.tags as never,
          status: "draft", // rolled-back content returns to draft for review
          updatedAt: new Date(),
        })
        .where(eq(s.libraryReports.id, input.id));
      return { ok: true };
    }),

  /* ---------------- AI generation + review ---------------- */

  /** Manual trigger with a chosen date range (Section 5.1). */
  generate: authedQuery
    .input(z.object({ periodStart: z.string(), periodEnd: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!LIBRARY_ENABLED() || !AI_REPORTS_ENABLED()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "AI report generation is disabled" });
      }
      const me = await requireStaff(ctx.user);
      const db = getDb();
      const started = Date.now();
      const logId = uuid();
      const periodStart = new Date(input.periodStart);
      const periodEnd = new Date(input.periodEnd);
      if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd <= periodStart) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date range" });
      }

      try {
        const corpus = await assembleCorpus(periodStart, periodEnd);
        await db.insert(s.libraryGenerationLog).values({
          id: logId,
          status: "running",
          triggerType: "manual",
          model: AI_MODEL_ID,
          promptVersion: AI_PROMPT_VERSION,
          corpusIds: corpus.map((c) => c.refId),
        });
        const gen = generateWeeklyReport(corpus, periodStart, periodEnd);
        if (!gen) {
          await db
            .update(s.libraryGenerationLog)
            .set({ status: "failed", error: "Corpus too small to support a report, nothing published", finishedAt: new Date(), latencyMs: Date.now() - started })
            .where(eq(s.libraryGenerationLog.id, logId));
          return { ok: false, reason: "Corpus too small to support a report. Nothing was created." };
        }
        const flags = validateReport(gen, corpus, derivedNumbers(corpus, periodStart, periodEnd));
        const reportId = uuid();
        const autoPublish = AI_AUTOPUBLISH() && !flags.some((f) => f.blocking);
        await db.insert(s.libraryReports).values({
          id: reportId,
          title: gen.title,
          slug: `${gen.year}-w${String(gen.weekNumber).padStart(2, "0")}-${reportId.slice(0, 8)}`,
          reportType: "weekly_market",
          weekNumber: gen.weekNumber,
          year: gen.year,
          periodStart,
          periodEnd,
          summary: gen.summary,
          body: gen.sections,
          accessLevel: "members", // reviewer confirms before publish
          origin: "ai_generated",
          status: autoPublish ? "published" : "in_review", // default: a human publishes
          publishedAt: autoPublish ? new Date() : null,
          aiModel: AI_MODEL_ID,
          aiPromptVersion: AI_PROMPT_VERSION,
          validationFlags: flags,
          tags: gen.tags,
          createdBy: me.id,
        });
        for (const src of gen.sources) {
          await db.insert(s.libraryReportSources).values({ ...src, reportId });
        }
        await db
          .update(s.libraryGenerationLog)
          .set({
            status: "success",
            reportId,
            validationResult: flags,
            tokenCounts: { corpusItems: corpus.length, sections: gen.sections.length },
            latencyMs: Date.now() - started,
            finishedAt: new Date(),
          })
          .where(eq(s.libraryGenerationLog.id, logId));
        return { ok: true, reportId, flags };
      } catch (e) {
        await db
          .update(s.libraryGenerationLog)
          .set({ status: "failed", error: e instanceof Error ? e.message : "Unknown error", finishedAt: new Date(), latencyMs: Date.now() - started })
          .where(eq(s.libraryGenerationLog.id, logId));
        throw e;
      }
    }),

  /** Per-section edit during review. */
  updateSection: authedQuery
    .input(z.object({ id: z.string(), sectionKey: z.string(), paragraphs: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      const db = getDb();
      const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      const body = (report.body ?? []).map((sec) =>
        sec.key === input.sectionKey ? { ...sec, paragraphs: input.paragraphs } : sec
      );
      await db.update(s.libraryReports).set({ body, updatedAt: new Date() }).where(eq(s.libraryReports.id, input.id));
      return { ok: true };
    }),

  /** Regenerate one section only from the same corpus window. */
  regenerateSection: authedQuery
    .input(z.object({ id: z.string(), sectionKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      void me;
      if (!AI_REPORTS_ENABLED()) throw new TRPCError({ code: "FORBIDDEN", message: "AI reports disabled" });
      const db = getDb();
      const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
      if (!report?.periodStart || !report.periodEnd) throw new TRPCError({ code: "NOT_FOUND", message: "Report window unknown" });
      const corpus = await assembleCorpus(report.periodStart, report.periodEnd);
      const gen = generateWeeklyReport(corpus, report.periodStart, report.periodEnd);
      if (!gen) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Corpus no longer supports regeneration" });
      const fresh = gen.sections.find((x) => x.key === input.sectionKey);
      if (!fresh) throw new TRPCError({ code: "NOT_FOUND", message: "Section not produced from the corpus" });
      const body = (report.body ?? []).map((sec) => (sec.key === input.sectionKey ? fresh : sec));
      await db.update(s.libraryReports).set({ body, updatedAt: new Date() }).where(eq(s.libraryReports.id, input.id));
      return { ok: true };
    }),

  /** Resolve a single validation flag during review. */
  resolveFlag: authedQuery
    .input(z.object({ id: z.string(), index: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await requireStaff(ctx.user);
      void me;
      const db = getDb();
      const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      const flags = (report.validationFlags ?? []).map((f, i) => (i === input.index ? { ...f, resolved: true } : f));
      await db.update(s.libraryReports).set({ validationFlags: flags, updatedAt: new Date() }).where(eq(s.libraryReports.id, input.id));
      return { ok: true };
    }),

  discard: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const me = await requireStaff(ctx.user);
    const db = getDb();
    const report = await db.query.libraryReports.findFirst({ where: eq(s.libraryReports.id, input.id) });
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
    await snapshotVersion(input.id, me.id, "Discarded draft");
    await db.update(s.libraryReports).set({ status: "archived", updatedAt: new Date() }).where(eq(s.libraryReports.id, input.id));
    return { ok: true };
  }),
});
