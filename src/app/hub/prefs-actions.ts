"use server";

import { savePrefs } from "@/lib/aq-modules/members";
import { PERSONAS, TELEX_PRODUCTS, type Persona, type TelexProduct } from "@/lib/aq-modules/types";
import { getSession } from "@/lib/session";

type Result = { ok: true } | { ok: false; message: string };

async function withUser<T>(run: (user: NonNullable<Awaited<ReturnType<typeof getSession>>>) => Promise<T>): Promise<T | { ok: false; message: string }> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Your session has ended. Sign in again." };
  return run(user);
}

const saveFailed = (error: unknown): Result => ({ ok: false, message: error instanceof Error && /table is missing/.test(error.message) ? "Saving preferences needs the latest database update. Ask the desk to run it." : "Could not save. Try again." });

export async function savePersona(persona: Persona): Promise<Result> {
  if (!PERSONAS.some((item) => item.key === persona)) return { ok: false, message: "Choose a persona." };
  return withUser(async (user) => {
    try {
      await savePrefs(user, { persona });
      return { ok: true as const };
    } catch (error) {
      return saveFailed(error);
    }
  });
}

export async function saveTelexDefault(products: TelexProduct[]): Promise<Result> {
  const clean = products.filter((item) => (TELEX_PRODUCTS as readonly string[]).includes(item));
  return withUser(async (user) => {
    try {
      await savePrefs(user, { telexProducts: clean });
      return { ok: true as const };
    } catch (error) {
      return saveFailed(error);
    }
  });
}

export async function saveSignalWindow(days: number): Promise<Result> {
  if (![7, 30, 60, 90, 180].includes(days)) return { ok: false, message: "Choose a window." };
  return withUser(async (user) => {
    try {
      await savePrefs(user, { signalWindow: days });
      return { ok: true as const };
    } catch (error) {
      return saveFailed(error);
    }
  });
}
