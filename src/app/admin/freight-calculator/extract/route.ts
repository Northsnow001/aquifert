import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { extractWithGemini, geminiKey } from "@/lib/aquibot-engine/gemini";
import { AI_FIXTURE_PROMPT, parseAiFixtures } from "@/lib/freight-desk/parse";
import { logFreightDebug, updateFreightDesk } from "@/lib/freight-desk/store";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return NextResponse.json({ ok: false, message: "Sign in as an admin." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: "Choose a rate sheet to read." }, { status: 400 });
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = Object.values(TYPES).includes(file.type) ? file.type : TYPES[extension];
  if (!mimeType) {
    await logFreightDebug("error", "AI fixture extraction rejected file type", { file: file.name, type: file.type || extension });
    return NextResponse.json({ ok: false, message: "Use a PDF, PNG, JPG or WebP file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Rate sheets can be up to 20 MB." }, { status: 400 });
  if (!geminiKey()) {
    await logFreightDebug("error", "AI fixture extraction skipped: API key missing", { file: file.name });
    return NextResponse.json({ ok: false, message: "Set GEMINI_API_KEY on the server to read rate sheets with AI." }, { status: 400 });
  }

  try {
    const rawText = await extractWithGemini({ data: Buffer.from(await file.arrayBuffer()), mimeType, prompt: AI_FIXTURE_PROMPT, displayName: file.name });
    const rows = parseAiFixtures(rawText, `AI · ${file.name}`.slice(0, 80));
    await updateFreightDesk((desk) => {
      desk.lastExtraction = { fileName: file.name, mimeType, at: new Date().toISOString(), rows, rawText: rawText.slice(0, 200_000) };
    });
    if (!rows.length) {
      await logFreightDebug("warn", "AI fixture extraction found no rows", { file: file.name, mime_type: mimeType });
      return NextResponse.json({ ok: false, message: "Gemini could not read any fixture rows from this file. Try a sharper crop or a higher-contrast image." }, { status: 422 });
    }
    await logFreightDebug("info", "AI fixture extraction complete", { file: file.name, mime_type: mimeType, fixtures: rows.length });
    return NextResponse.json({ ok: true, rows, fileName: file.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini could not read this file.";
    await logFreightDebug("error", "AI fixture extraction failed", { file: file.name, error: message });
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
