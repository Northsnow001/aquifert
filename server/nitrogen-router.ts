/**
 * Nitrogen Assessment router — no Drizzle.
 * Report text is synthesised in-process; optional Supabase persist for history.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getSupabaseService } from "./lib/supabase";
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

type StoredReport = {
  id: number;
  refNo: string;
  userId: number;
  answers: Record<string, unknown>;
  reportMd: string;
  createdAt: string;
};

/** Per-isolate fallback when nitrogen_reports isn't reachable via Supabase. */
const memByUser = new Map<number, StoredReport[]>();

function memList(userId: number) {
  return memByUser.get(userId) ?? [];
}

function memSave(row: StoredReport) {
  const list = memList(row.userId);
  list.unshift(row);
  memByUser.set(row.userId, list.slice(0, 50));
}

export const nitrogenRouter = createRouter({
  generate: authedQuery
    .input(answersSchema)
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      const refNo = genNumber("NR");
      // Pure in-process synthesis — never touches Drizzle / DATABASE_URL.
      const reportMd = generateNitrogenReport(input as NitrogenAnswers, refNo);
      const answers = input as Record<string, unknown>;
      const memId = Date.now();

      memSave({
        id: memId,
        refNo,
        userId: me.id,
        answers,
        reportMd,
        createdAt: new Date().toISOString(),
      });

      // Optional history persist via Supabase HTTPS only — timed so generate never hangs.
      let persistedId = memId;
      try {
        const result = await Promise.race([
          getSupabaseService()
            .from("nitrogen_reports")
            .insert({ refNo, userId: me.id, answers, reportMd })
            .select("id")
            .single(),
          new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 800),
          ),
        ]);
        if (!result.error && result.data?.id != null) {
          persistedId = Number(result.data.id);
          void logActivity(fmtActor(me), `Generated nitrogen assessment ${refNo}`, "nitrogen_report", String(persistedId), me.id);
        }
      } catch {
        /* memory copy already saved */
      }

      return { id: persistedId, refNo, reportMd };
    }),

  list: authedQuery.query(async ({ ctx }) => {
    const me = await effUser(ctx.user);
    try {
      const { data, error } = await Promise.race([
        getSupabaseService()
          .from("nitrogen_reports")
          .select("id, refNo, answers, createdAt")
          .eq("userId", me.id)
          .order("createdAt", { ascending: false })
          .limit(50),
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 1500),
        ),
      ]);
      if (!error && data?.length) {
        return data.map((r) => ({
          id: Number(r.id),
          refNo: String(r.refNo),
          cropType: String((r.answers as Record<string, unknown>)?.cropType ?? ""),
          destinationCountry: String((r.answers as Record<string, unknown>)?.destinationCountry ?? ""),
          createdAt: r.createdAt ? new Date(String(r.createdAt)) : new Date(),
        }));
      }
    } catch {
      /* use memory */
    }
    return memList(me.id).map((r) => ({
      id: r.id,
      refNo: r.refNo,
      cropType: String(r.answers.cropType ?? ""),
      destinationCountry: String(r.answers.destinationCountry ?? ""),
      createdAt: new Date(r.createdAt),
    }));
  }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await effUser(ctx.user);
      try {
        const { data, error } = await getSupabaseService()
          .from("nitrogen_reports")
          .select("id, refNo, reportMd, createdAt")
          .eq("id", input.id)
          .eq("userId", me.id)
          .maybeSingle();
        if (!error && data) {
          return {
            id: Number(data.id),
            refNo: String(data.refNo),
            reportMd: String(data.reportMd),
            createdAt: data.createdAt ? new Date(String(data.createdAt)) : new Date(),
          };
        }
      } catch {
        /* memory */
      }
      const row = memList(me.id).find((r) => r.id === input.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      return {
        id: row.id,
        refNo: row.refNo,
        reportMd: row.reportMd,
        createdAt: new Date(row.createdAt),
      };
    }),
});
