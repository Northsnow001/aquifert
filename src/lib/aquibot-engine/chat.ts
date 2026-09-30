import "server-only";
import { effectiveSynonyms, parseStopWords, planLimit, previewQuery, type AquibotConfig } from "@/lib/aquibot";
import type { TelexAccess } from "@/lib/content-types";
import { getHubContent, type HubContent } from "@/lib/hub-content";
import type { Plan, SessionUser } from "@/lib/session-shared";
import { resolveDateRanges, type DateResolution } from "./dates";
import { GeminiError, generateText, streamText, type Turn } from "./gemini";
import { activePrompt, buildSystemPrompt, compressAssistant, rewritePrompt } from "./prompt";
import { citation, retrieve, type RetrievalResult } from "./retrieval";
import {
  appendExchange,
  countQuestion,
  createSession,
  engineStatus,
  getSessionRow,
  indexedTelexCount,
  nextMonthStart,
  questionsUsed,
  sessionMessages,
  writeLog,
  type MessageMeta,
  type MessageRow,
  type SessionRow,
} from "./store";

export const MAX_MESSAGE_CHARS = 4000;

export type Actor = { user: SessionUser; isAdmin: boolean };

export type Usage = { used: number; limit: number; unlimited: boolean; resetsOn: string };

export type ChatEvent =
  | { type: "status"; stage: "rewriting" | "searching" | "writing" }
  | { type: "meta"; meta: MessageMeta }
  | { type: "delta"; text: string }
  | { type: "done"; sessionId: string; title: string; messageId: number | null; content: string; meta: MessageMeta; usage: Usage }
  | { type: "error"; message: string };

export class ChatError extends Error {
  constructor(
    readonly code: "invalid" | "engine_unavailable" | "limit_exceeded" | "not_found",
    message: string,
    readonly status: number,
    readonly usage?: Usage,
  ) {
    super(message);
  }
}

export function accessFor(plan: Plan, isAdmin: boolean): TelexAccess[] {
  if (isAdmin || plan === "enterprise") return ["public", "growth", "enterprise"];
  return plan === "growth" ? ["public", "growth"] : ["public"];
}

export async function usageFor(actor: Actor, config: AquibotConfig): Promise<Usage> {
  const limit = planLimit(config.settings, actor.user.plan);
  const unlimited = actor.isAdmin || limit === 0;
  return { used: await questionsUsed(actor.user.id), limit, unlimited, resetsOn: nextMonthStart() };
}

export type OpenedChat = { config: AquibotConfig; content: HubContent; session: SessionRow | null; history: MessageRow[]; usage: Usage; testMode: boolean; message: string };

/** Validates the request, the engine, the monthly limit and session ownership before anything streams. */
export async function openChat(actor: Actor, input: { message: unknown; sessionId: unknown; testMode: unknown }): Promise<OpenedChat> {
  const message = String(input.message ?? "").replace(/\r\n/g, "\n").trim();
  if (!message) throw new ChatError("invalid", "Type a question first.", 400);
  if (message.length > MAX_MESSAGE_CHARS) throw new ChatError("invalid", `Questions are limited to ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`, 400);

  const status = await engineStatus();
  if (!status.ready) throw new ChatError("engine_unavailable", actor.isAdmin ? `Aquibot is not ready: ${status.problem}` : "Aquibot is being set up. Please try again shortly.", 503);

  const content = await getHubContent();
  const config = content.aquibot;
  const usage = await usageFor(actor, config);
  if (!usage.unlimited && usage.used >= usage.limit) {
    throw new ChatError("limit_exceeded", `You have used all ${usage.limit.toLocaleString()} questions for this month. Your allowance resets on ${usage.resetsOn}.`, 429, usage);
  }

  let session: SessionRow | null = null;
  let history: MessageRow[] = [];
  const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
  if (sessionId) {
    session = await getSessionRow(sessionId);
    if (!session || session.user_id !== actor.user.id) throw new ChatError("not_found", "That conversation no longer exists. Start a new chat.", 404);
    history = await sessionMessages(session.id);
  }
  const testMode = actor.isAdmin && Boolean(input.testMode) && Boolean(config.prompt.test.trim());
  return { config, content, session, history, usage, testMode, message };
}

function friendly(error: unknown, isAdmin: boolean) {
  if (error instanceof GeminiError && error.rateLimited) return "Aquibot is busy right now. Please try again in a minute.";
  if (isAdmin && error instanceof Error) return `Aquibot could not answer: ${error.message}`;
  return "I'm having trouble connecting right now. Please try again shortly.";
}

type Prepared = {
  rewritten: string;
  synonymQuery: string;
  resolution: DateResolution;
  retrieval: RetrievalResult;
  system: string;
  rewriteMs: number;
};

async function prepare(
  opened: Pick<OpenedChat, "config" | "content" | "testMode" | "message"> & { history: { role: "user" | "assistant"; content: string }[] },
  actor: Actor,
  now: number,
  onStage: (stage: "rewriting" | "searching") => void,
): Promise<Prepared> {
  const { config, content, message, history } = opened;
  const { settings } = config;

  let rewritten = message;
  let rewriteMs = 0;
  const window = history.slice(-Math.max(0, settings.contextWindow));
  if (window.length > 0) {
    onStage("rewriting");
    const started = Date.now();
    try {
      const result = await generateText({
        model: settings.rewriteModel,
        turns: [{ role: "user", text: rewritePrompt(window, message, now, settings.contextWindow) }],
        temperature: 0,
        maxOutputTokens: 256,
        timeoutMs: 15_000,
        fast: true,
      });
      const line = result.text.split("\n").find((value) => value.trim())?.trim() ?? "";
      if (line && line.length <= 600) rewritten = line.replace(/^["']|["']$/g, "");
    } catch (error) {
      await writeLog("connection", "warn", `Query rewrite skipped: ${error instanceof Error ? error.message : "unknown error"}`, { model: settings.rewriteModel });
    }
    rewriteMs = Date.now() - started;
  }

  let resolution = resolveDateRanges(message, settings.dateGraceDays, now);
  if (resolution.ranges.length === 0 && rewritten !== message) resolution = resolveDateRanges(rewritten, settings.dateGraceDays, now);

  const stopWords = parseStopWords(config.stopWords).words;
  const synonymQuery = previewQuery(rewritten, effectiveSynonyms(config.synonyms).entries, stopWords).rewritten;

  onStage("searching");
  const retrieval = await retrieve({
    query: rewritten,
    synonymQuery,
    stopWords,
    resolution,
    settings,
    followUp: history.length > 0,
    access: accessFor(actor.user.plan, actor.isAdmin),
    now,
  });

  const system = buildSystemPrompt({
    config,
    content,
    testMode: opened.testMode,
    plan: actor.user.plan,
    isAdmin: actor.isAdmin,
    now,
    resolution,
    retrieval,
    indexedTelex: await indexedTelexCount(),
  });

  return { rewritten, synonymQuery, resolution, retrieval, system, rewriteMs };
}

function sourcesOf(retrieval: RetrievalResult) {
  const seen = new Set<string>();
  const sources: NonNullable<MessageMeta["sources"]> = [];
  let privateSources = 0;
  const privateSeen = new Set<string>();
  for (const candidate of retrieval.candidates) {
    if (!candidate.selected) continue;
    if (candidate.visibility === "private") {
      if (!privateSeen.has(candidate.documentId)) privateSources += 1;
      privateSeen.add(candidate.documentId);
      continue;
    }
    if (seen.has(candidate.documentId)) continue;
    seen.add(candidate.documentId);
    sources.push({ title: candidate.title, sourceType: candidate.sourceType, publishedAt: candidate.publishedAt });
  }
  return { sources: sources.slice(0, 8), privateSources };
}

export async function* runChat(actor: Actor, opened: OpenedChat, signal: AbortSignal): AsyncGenerator<ChatEvent> {
  const started = Date.now();
  const now = started;
  const { settings } = opened.config;
  const history = opened.history.map((row) => ({ role: row.role, content: row.content }));

  let prepared: Prepared;
  try {
    yield { type: "status", stage: history.length && settings.contextWindow > 0 ? "rewriting" : "searching" };
    prepared = await prepare({ ...opened, history }, actor, now, () => undefined);
  } catch (error) {
    await writeLog(error instanceof GeminiError ? "connection" : "chat", "error", `Retrieval failed: ${error instanceof Error ? error.message : "unknown error"}`, { user: actor.user.email });
    yield { type: "error", message: friendly(error, actor.isAdmin) };
    return;
  }

  const { sources, privateSources } = sourcesOf(prepared.retrieval);
  const meta: MessageMeta = {
    rewrittenQuery: prepared.rewritten !== opened.message ? prepared.rewritten : undefined,
    intent: prepared.retrieval.intent,
    dateRanges: prepared.resolution.ranges.map((range) => ({ start: range.start, end: range.end, kind: range.kind, phrase: range.phrase })),
    dateFallback: prepared.resolution.ranges.length ? prepared.retrieval.dateFallback : undefined,
    sources,
    privateSources,
    model: settings.answerModel,
  };
  yield { type: "meta", meta };
  yield { type: "status", stage: "writing" };

  const turns: Turn[] = [
    ...history.slice(-Math.max(0, settings.chatHistoryWindow)).map((turn) => ({
      role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
      text: turn.role === "assistant" ? compressAssistant(turn.content) : turn.content,
    })),
    { role: "user", text: opened.message },
  ];

  const generateStarted = Date.now();
  let answer = "";
  let tokenUsage: Record<string, number> | undefined;
  let failure: unknown = null;
  try {
    for await (const piece of streamText({ model: settings.answerModel, system: prepared.system, turns, temperature: 0.7, signal })) {
      if (piece.text) {
        answer += piece.text;
        yield { type: "delta", text: piece.text };
      }
      if (piece.usage) tokenUsage = piece.usage;
    }
  } catch (error) {
    if (!signal.aborted) failure = error;
  }

  const stopped = signal.aborted;
  if (failure && !answer) {
    await writeLog(failure instanceof GeminiError ? "connection" : "chat", "error", `Answer failed: ${failure instanceof Error ? failure.message : "unknown error"}`, {
      user: actor.user.email,
      model: settings.answerModel,
    });
    yield { type: "error", message: friendly(failure, actor.isAdmin) };
    return;
  }
  if (!answer.trim()) {
    if (!stopped) yield { type: "error", message: "Aquibot returned an empty answer. Try rephrasing the question." };
    return;
  }

  meta.timings = {
    rewriteMs: prepared.rewriteMs,
    embedMs: prepared.retrieval.timings.embedMs,
    searchMs: prepared.retrieval.timings.searchMs,
    generateMs: Date.now() - generateStarted,
    totalMs: Date.now() - started,
  };
  if (tokenUsage) meta.usage = tokenUsage;
  if (stopped) meta.stopped = true;
  if (failure) meta.error = failure instanceof Error ? failure.message : "Answer interrupted";

  try {
    const session =
      opened.session ??
      (await createSession({
        userId: actor.user.id,
        email: actor.user.email,
        name: actor.user.name,
        plan: actor.user.plan,
        title: opened.message.replace(/\s+/g, " ").slice(0, 60),
        testMode: opened.testMode,
      }));
    const messageId = await appendExchange(session, { content: opened.message }, { content: answer, meta });
    const used = await countQuestion(actor.user.id);
    yield { type: "done", sessionId: session.id, title: session.title, messageId, content: answer, meta, usage: { ...opened.usage, used } };
  } catch (error) {
    await writeLog("chat", "error", `Saving the conversation failed: ${error instanceof Error ? error.message : "unknown error"}`, { user: actor.user.email });
    yield { type: "error", message: "The answer could not be saved. Copy it before leaving the page." };
  }
}

/** Runs the retrieval half of a turn without generating, for the admin debug trace. */
export async function traceQuestion(actor: Actor, input: { question: string; testMode: boolean }) {
  const content = await getHubContent();
  const config = content.aquibot;
  const now = Date.now();
  const stopWords = parseStopWords(config.stopWords).words;
  const preview = previewQuery(input.question, effectiveSynonyms(config.synonyms).entries, stopWords);
  const prepared = await prepare({ config, content, testMode: input.testMode, message: input.question, history: [] }, actor, now, () => undefined);
  return {
    question: input.question,
    promptSource: activePrompt(config, input.testMode).source,
    replaced: preview.replaced,
    synonymQuery: prepared.synonymQuery,
    ranges: prepared.resolution.ranges,
    graceDays: prepared.resolution.graceDays,
    retrieval: {
      ...prepared.retrieval,
      candidates: prepared.retrieval.candidates.map((candidate) => ({ ...candidate, citation: citation(candidate) })),
    },
    system: prepared.system,
  };
}

export type TraceResult = Awaited<ReturnType<typeof traceQuestion>>;
