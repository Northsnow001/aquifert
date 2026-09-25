/**
 * Library (member-facing), weekly market reports and research.
 *
 * Access model (Section 1):
 *  - every signed-in user sees the full list, including locked reports
 *    (title, week, summary, access badge are ALWAYS visible)
 *  - free     → any signed-in user
 *  - members  → any ACTIVE paid tier
 *  - premium  → SCALE tier (top tier)
 *  - staff roles read everything
 * Enforcement is server-side on every read and every download; locked
 * bodies are never sent to the browser, and files are served only through
 * short-lived HMAC-signed URLs.
 */
import { z } from "zod";
import crypto from "node:crypto";
import { and, desc, asc, eq, gte, sql, like, or } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import * as s from "../db/schema";
import { effUser } from "./rbac";
import { env } from "./lib/env";

export const LIBRARY_ENABLED = () => process.env.LIBRARY_ENABLED !== "false";
export const AI_REPORTS_ENABLED = () => process.env.AI_REPORTS_ENABLED !== "false";
export const AI_AUTOPUBLISH = () => process.env.AI_AUTOPUBLISH === "true";

const STAFF = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"];

/** 1 = free, 2 = members, 3 = premium */
export async function userAccessRank(userId: number, portalRole: string | null): Promise<number> {
  if (portalRole && STAFF.includes(portalRole)) return 3;
  const db = getDb();
  const m = await db.query.memberships.findFirst({
    where: and(eq(s.memberships.userId, userId), eq(s.memberships.status, "ACTIVE")),
    orderBy: desc(s.memberships.createdAt),
  });
  if (!m) return 1;
  return m.tier === "SCALE" ? 3 : 2;
}
const LEVEL_RANK = { free: 1, members: 2, premium: 3 } as const;

const uuid = () => crypto.randomUUID();

function signFileToken(reportId: string, userId: number, exp: number): string {
  return crypto
    .createHmac("sha256", env.appSecret || "aquifert-dev-secret")
    .update(`library-file:${reportId}:${userId}:${exp}`)
    .digest("hex");
}
export function verifyFileToken(reportId: string, userId: number, exp: number, sig: string): boolean {
  if (Date.now() > exp) return false;
  const expected = signFileToken(reportId, userId, exp);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function canRead(rank: number, level: "free" | "members" | "premium"): boolean {
  return rank >= LEVEL_RANK[level];
}

async function logAccess(reportId: string, userId: number, action: "viewed" | "downloaded" | "blocked_by_tier" | "upgrade_clicked") {
  await getDb().insert(s.libraryAccessLog).values({ id: uuid(), reportId, userId, action });
}

const cardSelect = {
  id: s.libraryReports.id,
  slug: s.libraryReports.slug,
  title: s.libraryReports.title,
  reportType: s.libraryReports.reportType,
  weekNumber: s.libraryReports.weekNumber,
  year: s.libraryReports.year,
  periodStart: s.libraryReports.periodStart,
  periodEnd: s.libraryReports.periodEnd,
  summary: s.libraryReports.summary,
  accessLevel: s.libraryReports.accessLevel,
  origin: s.libraryReports.origin,
  authorName: s.libraryReports.authorName,
  publishedAt: s.libraryReports.publishedAt,
  tags: s.libraryReports.tags,
  viewCount: s.libraryReports.viewCount,
  downloadCount: s.libraryReports.downloadCount,
  fileMime: s.libraryReports.fileMime,
};

export const libraryRouter = createRouter({
  flags: authedQuery.query(() => ({
    libraryEnabled: LIBRARY_ENABLED(),
    aiReportsEnabled: AI_REPORTS_ENABLED(),
  })),

  /** Index page list, published reports only, locked ones included. */
  list: authedQuery
    .input(
      z.object({
        search: z.string().optional(),
        reportType: z.string().optional(),
        year: z.number().optional(),
        week: z.number().optional(),
        tag: z.string().optional(),
        sort: z.enum(["newest", "oldest", "most_read"]).default("newest"),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!LIBRARY_ENABLED()) return { items: [], total: 0, featured: null, page: 1, pages: 0 };
      const db = getDb();
      const me = await effUser(ctx.user);
      const rank = await userAccessRank(me.id, me.portalRole);

      const conds = [eq(s.libraryReports.status, "published")];
      if (input.reportType) conds.push(eq(s.libraryReports.reportType, input.reportType as never));
      if (input.year) conds.push(eq(s.libraryReports.year, input.year));
      if (input.week) conds.push(eq(s.libraryReports.weekNumber, input.week));
      if (input.search) {
        const q = `%${input.search}%`;
        conds.push(
          or(like(s.libraryReports.title, q), like(s.libraryReports.summary, q), like(s.libraryReports.tags, q))!
        );
      }
      const where = and(...conds);
      const order =
        input.sort === "oldest"
          ? asc(s.libraryReports.publishedAt)
          : input.sort === "most_read"
            ? desc(s.libraryReports.viewCount)
            : desc(s.libraryReports.publishedAt);

      const rows = await db.select(cardSelect).from(s.libraryReports).where(where).orderBy(order);
      const tagged = input.tag
        ? rows.filter((r) => (r.tags as string[]).some((t) => t.toLowerCase().includes(input.tag!.toLowerCase())))
        : rows;

      const featured =
        input.page === 1 && input.sort === "newest" && !input.search && !input.tag
          ? (tagged.find((r) => r.reportType === "weekly_market") ?? null)
          : null;
      const rest = featured ? tagged.filter((r) => r.id !== featured.id) : tagged;

      const PAGE = 10;
      const pages = Math.max(1, Math.ceil(rest.length / PAGE));
      const items = rest.slice((input.page - 1) * PAGE, input.page * PAGE);
      const decorate = (r: typeof rows[number]) => ({
        ...r,
        locked: !canRead(rank, r.accessLevel),
        hasFile: !!r.fileMime,
      });
      return {
        featured: featured ? decorate(featured) : null,
        items: items.map(decorate),
        total: tagged.length,
        page: input.page,
        pages,
      };
    }),

  /** Unopened recent weeklies, badge on the Library menu item. */
  unreadCount: authedQuery.query(async ({ ctx }) => {
    if (!LIBRARY_ENABLED()) return { count: 0 };
    try {
      const me = await effUser(ctx.user);
      const since = new Date(Date.now() - 30 * 864e5);
      const recent = await Promise.race([
        getDb()
          .select({ id: s.libraryReports.id })
          .from(s.libraryReports)
          .where(
            and(
              eq(s.libraryReports.status, "published"),
              eq(s.libraryReports.reportType, "weekly_market"),
              gte(s.libraryReports.publishedAt, since)
            )
          ),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1200)),
      ]);
      if (!recent || recent.length === 0) return { count: 0 };
      const seen = await getDb()
        .select({ reportId: s.libraryAccessLog.reportId })
        .from(s.libraryAccessLog)
        .where(and(eq(s.libraryAccessLog.userId, me.id), eq(s.libraryAccessLog.action, "viewed")));
      const seenIds = new Set(seen.map((x) => x.reportId));
      return { count: recent.filter((r) => !seenIds.has(r.id)).length };
    } catch {
      return { count: 0 };
    }
  }),

  /** Reading page. Locked reports return header + summary + FIRST
   *  paragraph only, the full body never leaves the server. */
  bySlug: authedQuery.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    if (!LIBRARY_ENABLED()) throw new TRPCError({ code: "NOT_FOUND", message: "Library is disabled" });
    const db = getDb();
    const me = await effUser(ctx.user);
    const rank = await userAccessRank(me.id, me.portalRole);
    const report = await db.query.libraryReports.findFirst({
      where: and(eq(s.libraryReports.slug, input.slug), eq(s.libraryReports.status, "published")),
    });
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });

    const locked = !canRead(rank, report.accessLevel);
    await logAccess(report.id, me.id, locked ? "blocked_by_tier" : "viewed");
    if (!locked) {
      await db
        .update(s.libraryReports)
        .set({ viewCount: sql`${s.libraryReports.viewCount} + 1` })
        .where(eq(s.libraryReports.id, report.id));
    }

    const sources = await db
      .select()
      .from(s.libraryReportSources)
      .where(eq(s.libraryReportSources.reportId, report.id));

    const base = {
      id: report.id,
      slug: report.slug,
      title: report.title,
      reportType: report.reportType,
      weekNumber: report.weekNumber,
      year: report.year,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      summary: report.summary,
      accessLevel: report.accessLevel,
      origin: report.origin,
      authorName: report.authorName,
      publishedAt: report.publishedAt,
      tags: report.tags,
      locked,
      hasFile: !!report.fileMime && !locked,
      aiLabel: report.origin === "ai_generated" ? "AI-drafted · desk-reviewed" : null,
    };

    if (locked) {
      const firstPara = report.body?.[0]?.paragraphs?.[0] ?? null;
      return { ...base, previewParagraph: firstPara, body: null, sources: [] };
    }
    return { ...base, previewParagraph: null, body: report.body ?? [], sources };
  }),

  /** Prev/next week navigation for the reading page. */
  neighbours: authedQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const report = await db.query.libraryReports.findFirst({
      where: and(eq(s.libraryReports.slug, input.slug), eq(s.libraryReports.status, "published")),
    });
    if (!report || !report.publishedAt) return { prev: null, next: null };
    const all = await db
      .select({ slug: s.libraryReports.slug, title: s.libraryReports.title, publishedAt: s.libraryReports.publishedAt })
      .from(s.libraryReports)
      .where(and(eq(s.libraryReports.status, "published"), eq(s.libraryReports.reportType, report.reportType)))
      .orderBy(asc(s.libraryReports.publishedAt));
    const idx = all.findIndex((r) => r.slug === input.slug);
    return {
      prev: idx > 0 ? { slug: all[idx - 1].slug, title: all[idx - 1].title } : null,
      next: idx >= 0 && idx < all.length - 1 ? { slug: all[idx + 1].slug, title: all[idx + 1].title } : null,
    };
  }),

  /** Signed, expiring download URL. Access re-checked server-side. */
  downloadUrl: authedQuery.input(z.object({ reportId: z.string() })).mutation(async ({ ctx, input }) => {
    if (!LIBRARY_ENABLED()) throw new TRPCError({ code: "NOT_FOUND", message: "Library is disabled" });
    const db = getDb();
    const me = await effUser(ctx.user);
    const rank = await userAccessRank(me.id, me.portalRole);
    const report = await db.query.libraryReports.findFirst({
      where: and(eq(s.libraryReports.id, input.reportId), eq(s.libraryReports.status, "published")),
    });
    if (!report || !report.filePath) throw new TRPCError({ code: "NOT_FOUND", message: "File not available" });
    if (!canRead(rank, report.accessLevel)) {
      await logAccess(report.id, me.id, "blocked_by_tier");
      throw new TRPCError({ code: "FORBIDDEN", message: "This report requires a higher membership tier" });
    }
    await logAccess(report.id, me.id, "downloaded");
    await db
      .update(s.libraryReports)
      .set({ downloadCount: sql`${s.libraryReports.downloadCount} + 1` })
      .where(eq(s.libraryReports.id, report.id));
    const exp = Date.now() + 5 * 60_000;
    const sig = signFileToken(report.id, me.id, exp);
    return { url: `/api/library/file/${report.id}?uid=${me.id}&exp=${exp}&sig=${sig}` };
  }),

  logUpgradeClick: authedQuery.input(z.object({ reportId: z.string() })).mutation(async ({ ctx, input }) => {
    const me = await effUser(ctx.user);
    await logAccess(input.reportId, me.id, "upgrade_clicked");
    return { ok: true };
  }),
});
