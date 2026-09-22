import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { effUser, logActivity, fmtActor, genNumber } from "./rbac";
import { generateNitrogenReport, type NitrogenAnswers } from "./nitrogen-ai";

const answersSchema = z.object({
  destinationCountry: z.string().min(1, "Destination country is required"),
  destinationPort: z.string().default(""),
  preferredOrigin: z.string().default(""),
  deliveryWindow: z.string().min(1, "Delivery window is required"),
  packaging: z.string().min(1, "Packaging is required"),
  nitrogenSources: z.array(z.string()).min(1, "Select at least one nitrogen source"),
  annualVolume: z.string().min(1, "Annual volume is required"),
  warehouseCapacity: z.string().default(""),
  cropType: z.string().min(1, "Crop type is required"),
  areaHectares: z.string().min(1, "Area is required"),
  soilTexture: z.string().min(1, "Soil texture is required"),
  applicationMethod: z.string().min(1, "Application method is required"),
  priority: z.enum(["COST", "BALANCED", "EFFICIENCY"]),
  additives: z.array(z.string()).default([]),
  siteNotes: z.string().max(2000).default(""),
});

export const nitrogenRouter = createRouter({
  generate: authedQuery
    .input(answersSchema)
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const refNo = genNumber("NR");
      const reportMd = generateNitrogenReport(input as NitrogenAnswers, refNo);
      const [{ id }] = await getDb().insert(s.nitrogenReports).values({
        refNo,
        userId: me.id,
        answers: input as Record<string, unknown>,
        reportMd,
      }).returning({ id: s.nitrogenReports.id });
      await logActivity(fmtActor(me), `Generated nitrogen assessment ${refNo}`, "nitrogen_report", String(id), me.id);
      return { id: Number(id), refNo, reportMd };
    }),

  list: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    const rows = await getDb().query.nitrogenReports.findMany({
      where: eq(s.nitrogenReports.userId, me.id),
      orderBy: desc(s.nitrogenReports.createdAt),
      limit: 50,
    });
    return rows.map((r) => ({
      id: Number(r.id),
      refNo: r.refNo,
      cropType: (r.answers as Record<string, unknown>).cropType as string ?? "",
      destinationCountry: (r.answers as Record<string, unknown>).destinationCountry as string ?? "",
      createdAt: r.createdAt,
    }));
  }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const row = await getDb().query.nitrogenReports.findFirst({
        where: and(eq(s.nitrogenReports.id, input.id), eq(s.nitrogenReports.userId, me.id)),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      return { id: Number(row.id), refNo: row.refNo, reportMd: row.reportMd, createdAt: row.createdAt };
    }),
});
