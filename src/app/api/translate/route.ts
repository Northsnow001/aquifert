import { after } from "next/server";
import { saveTranslations, translateTexts } from "@/lib/i18n/machine";
import { isLang } from "@/lib/i18n/locales";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

const MAX_TEXTS = 200;
const MAX_LENGTH = 4000;
const HOURLY_NEW = 6000;
const HOUR = 3_600_000;

const usage = new Map<string, { count: number; since: number }>();

function budget(userId: string) {
  const now = Date.now();
  let entry = usage.get(userId);
  if (!entry || now - entry.since > HOUR) {
    entry = { count: 0, since: now };
    usage.set(userId, entry);
  }
  return entry;
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { lang?: unknown; texts?: unknown };
  if (!isLang(body.lang) || body.lang === "en") return Response.json({ error: "bad_language" }, { status: 400 });
  const texts = (Array.isArray(body.texts) ? body.texts : [])
    .filter((text): text is string => typeof text === "string" && text.trim().length > 0 && text.length <= MAX_LENGTH)
    .slice(0, MAX_TEXTS);
  if (!texts.length) return Response.json({ translations: {} });

  const entry = budget(user.id);
  const lang = body.lang;
  const { translations, fresh, attempted } = await translateTexts(lang, texts, HOURLY_NEW - entry.count);
  entry.count += attempted;
  if (Object.keys(fresh).length) after(() => saveTranslations(lang, fresh));
  return Response.json({ translations });
}
