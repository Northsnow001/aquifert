"use server";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { traceQuestion, type TraceResult } from "@/lib/aquibot-engine/chat";
import { indexSource, removeSource, type IndexResult } from "@/lib/aquibot-engine/indexer";
import { clearLogs, deleteSessionRow, documentChunks, engineStatus, findChunksByText, type LogKind } from "@/lib/aquibot-engine/store";
import type { Plan } from "@/lib/session-shared";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

const failure = (error: unknown) => ({ ok: false as const, message: error instanceof Error ? error.message : "Something went wrong." });

export async function indexKnowledge(key: string, force: boolean): Promise<IndexResult> {
  await requireAdmin();
  const status = await engineStatus();
  if (!status.ready) return { key, ok: false, state: "not_indexed", chunkCount: 0, message: status.problem ?? "The engine is not ready." };
  return indexSource(String(key), { force: Boolean(force) });
}

export async function removeKnowledge(key: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    await removeSource(String(key));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function knowledgeChunks(key: string): Promise<{ ok: true; chunks: { chunk_index: number; content: string }[] } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    return { ok: true, chunks: await documentChunks(String(key)) };
  } catch (error) {
    return failure(error);
  }
}

export async function traceAquibot(input: { question: string; testMode: boolean; plan: Plan | "admin" }): Promise<{ ok: true; trace: TraceResult } | { ok: false; message: string }> {
  const user = await requireAdmin();
  const question = String(input.question ?? "").trim().slice(0, 4000);
  if (!question) return { ok: false, message: "Type a question to trace." };
  const status = await engineStatus();
  if (!status.ready) return { ok: false, message: status.problem ?? "The engine is not ready." };
  const asAdmin = input.plan === "admin";
  const plan: Plan = asAdmin ? user.plan : (["core", "growth", "enterprise"] as const).find((value) => value === input.plan) ?? "core";
  try {
    return { ok: true, trace: await traceQuestion({ user: { ...user, plan }, isAdmin: asAdmin }, { question, testMode: Boolean(input.testMode) }) };
  } catch (error) {
    return failure(error);
  }
}

export async function searchIndexText(text: string): Promise<{ ok: true; rows: Awaited<ReturnType<typeof findChunksByText>> } | { ok: false; message: string }> {
  await requireAdmin();
  const term = String(text ?? "").trim();
  if (term.length < 2) return { ok: false, message: "Type at least two characters." };
  try {
    return { ok: true, rows: await findChunksByText(term.slice(0, 200)) };
  } catch (error) {
    return failure(error);
  }
}

export async function clearAquibotLogs(kind: LogKind | "all"): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    await clearLogs(kind === "all" ? undefined : kind);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAquibotSession(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    await deleteSessionRow(String(id));
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
