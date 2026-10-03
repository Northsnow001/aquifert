"use server";

import { revalidatePath } from "next/cache";
import { shortDay } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { deleteNitrogenReport, nitrogenReportsThisMonth, saveNitrogenReport } from "@/lib/aq-modules/members";
import type { NitrogenReport } from "@/lib/aq-modules/member-types";
import { limitFor } from "@/lib/aq-modules/types";
import { activePorts, getFreightDesk, nextReset } from "@/lib/freight-desk/store";
import {
  ADDITIVES,
  CROPS,
  EMPTY_ANSWERS,
  generateNitrogenReport,
  METHODS,
  PACKAGING,
  PRIORITIES,
  SOILS,
  SOURCES,
  stepProblem,
  WINDOWS,
  type NitrogenAnswers,
} from "@/lib/nitrogen/engine";
import { resolvePort } from "@/lib/ports";

type Failure = { ok: false; message: string };

const text = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const option = (value: unknown, options: string[]) => (options.includes(String(value)) ? String(value) : "");
const options = (value: unknown, allowed: string[]) => (Array.isArray(value) ? allowed.filter((item) => value.includes(item)) : []);

function clean(input: Partial<NitrogenAnswers>): NitrogenAnswers {
  const priority = PRIORITIES.find((item) => item.value === input.priority)?.value ?? EMPTY_ANSWERS.priority;
  const additives = options(input.additives, ADDITIVES);
  return {
    destinationCountry: text(input.destinationCountry, 80),
    destinationPort: text(input.destinationPort, 80),
    preferredOrigin: text(input.preferredOrigin, 80),
    deliveryWindow: option(input.deliveryWindow, WINDOWS),
    packaging: option(input.packaging, PACKAGING),
    nitrogenSources: options(input.nitrogenSources, SOURCES),
    annualVolume: text(input.annualVolume, 20),
    warehouseCapacity: text(input.warehouseCapacity, 20),
    cropType: option(input.cropType, CROPS),
    areaHectares: text(input.areaHectares, 20),
    soilTexture: option(input.soilTexture, SOILS),
    applicationMethod: option(input.applicationMethod, METHODS),
    priority,
    additives: additives.includes("None") && additives.length > 1 ? additives.filter((item) => item !== "None") : additives,
    siteNotes: String(input.siteNotes ?? "").trim().slice(0, 1000),
  };
}

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function refNumber(now: Date) {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, "");
  const tail = Array.from({ length: 4 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join("");
  return `NR-${stamp}-${tail}`;
}

const saveProblem = (error: unknown) =>
  error instanceof Error && /table is missing/.test(error.message)
    ? "Saving reports needs the latest database update. Ask the desk to run it."
    : "The report could not be saved just now. Try again in a moment.";

export async function generateReport(input: Partial<NitrogenAnswers>): Promise<{ ok: true; id: string } | Failure> {
  const answers = clean(input ?? {});
  for (const step of [0, 1, 2]) {
    const problem = stepProblem(step, answers);
    if (problem) return { ok: false, message: problem };
  }
  if (!PRIORITIES.some((item) => item.value === answers.priority)) return { ok: false, message: "Choose what matters most this season." };
  if (answers.destinationPort) {
    const port = resolvePort(`${answers.destinationPort}, ${answers.destinationCountry}`, activePorts(await getFreightDesk()));
    if (!port) return { ok: false, message: "Choose the destination port from the list, or leave it as not sure yet." };
    answers.destinationPort = port.name;
  }

  const { user, admin, modules } = await getHubAccess();
  const limit = admin ? 0 : limitFor(modules.limits.nitrogenReports, user.plan);
  try {
    if (limit > 0 && (await nitrogenReportsThisMonth(user)) >= limit) {
      return {
        ok: false,
        message: `You have used all ${limit} nitrogen reports on your plan this month. Your allowance resets on ${shortDay(nextReset())}, or upgrade on the Membership page for more.`,
      };
    }
    const now = new Date();
    const refNo = refNumber(now);
    const row: NitrogenReport = {
      id: `nr-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      refNo,
      at: now.toISOString(),
      userId: user.id,
      email: user.email.trim().toLowerCase(),
      answers,
      reportMd: generateNitrogenReport(answers, refNo, now),
    };
    await saveNitrogenReport(row, admin ? 0 : limitFor(modules.limits.savedReports, user.plan));
    revalidatePath("/hub/nitrogen-report");
    return { ok: true, id: row.id };
  } catch (error) {
    return { ok: false, message: saveProblem(error) };
  }
}

export async function deleteReport(id: string): Promise<{ ok: true } | Failure> {
  const { user } = await getHubAccess();
  try {
    const removed = await deleteNitrogenReport(user, String(id));
    if (!removed) return { ok: false, message: "That report is no longer in your account." };
    revalidatePath("/hub/nitrogen-report");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && /table is missing/.test(error.message) ? "Deleting reports needs the latest database update. Ask the desk to run it." : "The report could not be deleted just now. Try again.",
    };
  }
}
