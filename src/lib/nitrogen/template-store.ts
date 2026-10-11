import "server-only";

import { cache } from "react";
import { readDocument, updateDocument } from "@/lib/data/documents";
import { DEFAULT_TEMPLATE, normalizeContent, normalizeDesign, type BriefContent, type BriefDesign, type NitrogenTemplate } from "@/lib/nitrogen/template";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function stamp(value: unknown) {
  return isRecord(value) && typeof value.at === "string" ? { at: value.at, by: typeof value.by === "string" ? value.by : "" } : undefined;
}

function parse(raw: unknown): NitrogenTemplate {
  const value = isRecord(raw) ? raw : {};
  const meta = isRecord(value.meta) ? value.meta : {};
  return { content: normalizeContent(value.content), design: normalizeDesign(value.design), meta: { content: stamp(meta.content), design: stamp(meta.design) } };
}

const read = cache(async () => parse(await readDocument("nitrogen-template")));

/** For the admin editor: throws when storage cannot be read, so an outage is never shown as the defaults. */
export const getNitrogenTemplateForEdit = read;

/** For members' reports: falls back to the launch template rather than failing the page. */
export const getNitrogenTemplate = cache(async (): Promise<NitrogenTemplate> => {
  try {
    return await read();
  } catch (error) {
    console.error("[nitrogen-template] Could not read the saved report template, using the defaults.", error);
    return DEFAULT_TEMPLATE;
  }
});

async function save(part: "content" | "design", value: BriefContent | BriefDesign, by: string) {
  const at = new Date().toISOString();
  await updateDocument("nitrogen-template", (raw) => {
    const current = isRecord(raw) ? raw : {};
    const meta = isRecord(current.meta) ? current.meta : {};
    return { ...current, [part]: value, meta: { ...meta, [part]: { at, by } } };
  });
  return { at, by };
}

/** Saves the content half. When the prompt changes, the one it replaces is kept for one-step undo. */
export async function saveBriefContent(value: unknown, by: string) {
  const next = normalizeContent(value);
  const current = (await read()).content;
  if (next.prompt.trim() !== current.prompt.trim()) next.previousPrompt = current.prompt;
  else next.previousPrompt = current.previousPrompt;
  const meta = await save("content", next, by);
  return { content: next, ...meta };
}

export async function saveBriefDesign(value: unknown, by: string) {
  const next = normalizeDesign(value);
  const meta = await save("design", next, by);
  return { design: next, ...meta };
}
