"use server";

import { revalidatePath } from "next/cache";
import { shortDay } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { deleteNitrogenReport, nitrogenReportsThisMonth, saveNitrogenReport } from "@/lib/aq-modules/members";
import type { NitrogenReport } from "@/lib/aq-modules/member-types";
import { limitFor } from "@/lib/aq-modules/types";
import { activePorts, getFreightDesk, nextReset } from "@/lib/freight-desk/store";
import { briefMarkdown, briefProblem, buildBrief, PACKING, PRODUCTS, SHIPMENT_TYPES, upcomingMonths, type NitrogenAnswers } from "@/lib/nitrogen/engine";
import { resolvePort } from "@/lib/ports";
import { findZeroRegistration } from "@/lib/zero-interest";

type Failure = { ok: false; message: string };

const text = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const option = (value: unknown, options: string[]) => (options.includes(String(value)) ? String(value) : "");
const options = (value: unknown, allowed: string[]) => (Array.isArray(value) ? allowed.filter((item) => value.includes(item)) : []);

function clean(input: Partial<NitrogenAnswers>): NitrogenAnswers {
  return {
    destinationCountry: text(input.destinationCountry, 80),
    destinationPort: text(input.destinationPort, 80),
    preferredOrigin: text(input.preferredOrigin, 80),
    products: options(input.products, PRODUCTS),
    annualTonnage: text(input.annualTonnage, 20),
    arrivalMonths: options(input.arrivalMonths, upcomingMonths()),
    shipmentType: option(input.shipmentType, SHIPMENT_TYPES),
    packing: option(input.packing, PACKING),
    warehouseCapacity: text(input.warehouseCapacity, 20),
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
  const problem = briefProblem(answers);
  if (problem) return { ok: false, message: problem };
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
    const company = (await findZeroRegistration(user).catch(() => null))?.company?.trim();
    const preparedFor = company || user.name.trim();
    const refNo = refNumber(now);
    const row: NitrogenReport = {
      id: `nr-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      refNo,
      at: now.toISOString(),
      userId: user.id,
      email: user.email.trim().toLowerCase(),
      preparedFor,
      answers,
      reportMd: briefMarkdown(buildBrief(answers, { refNo, partner: preparedFor, date: now })),
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
