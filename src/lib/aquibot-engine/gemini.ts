import "server-only";

const BASE = "https://generativelanguage.googleapis.com";
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
export const EXTRACTION_MODEL = "gemini-2.5-flash";
const EMBED_BATCH = 100;
const INLINE_LIMIT = 18 * 1024 * 1024;

export function geminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "GeminiError";
  }
  get rateLimited() {
    return this.status === 429 || /quota|rate limit|resource exhausted/i.test(this.message);
  }
}

function headers(extra: Record<string, string> = {}) {
  const key = geminiKey();
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set.");
  return { "content-type": "application/json", "x-goog-api-key": key, ...extra };
}

async function post<T>(path: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/v1beta/${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GeminiError(error instanceof Error && error.name === "TimeoutError" ? `Gemini did not respond within ${Math.round(timeoutMs / 1000)}s.` : "Could not reach Gemini.");
  }
  const json = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !json) throw new GeminiError(json?.error?.message ?? `Gemini returned HTTP ${response.status}.`, response.status);
  return json;
}

function unit(values: number[]) {
  let sum = 0;
  for (const value of values) sum += value * value;
  const norm = Math.sqrt(sum) || 1;
  return values.map((value) => value / norm);
}

type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function embed(texts: string[], taskType: EmbedTask, title?: string) {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const json = await post<{ embeddings?: { values: number[] }[] }>(
      `models/${EMBEDDING_MODEL}:batchEmbedContents`,
      {
        requests: batch.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
          ...(title && taskType === "RETRIEVAL_DOCUMENT" ? { title } : {}),
        })),
      },
      60_000,
    );
    const vectors = json.embeddings ?? [];
    if (vectors.length !== batch.length) throw new GeminiError(`Gemini returned ${vectors.length} embeddings for ${batch.length} chunks.`);
    out.push(...vectors.map((vector) => unit(vector.values)));
  }
  return out;
}

export const embedDocuments = (texts: string[], title?: string) => embed(texts, "RETRIEVAL_DOCUMENT", title);
export const embedQueries = (texts: string[]) => embed(texts, "RETRIEVAL_QUERY");

export type Turn = { role: "user" | "model"; text: string };

type GenerateOptions = {
  model: string;
  system?: string;
  turns: Turn[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Turns thinking off on Flash models, for short utility calls such as query rewriting. */
  fast?: boolean;
};

type Candidate = { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string };
type GenerateResponse = { candidates?: Candidate[]; promptFeedback?: { blockReason?: string }; usageMetadata?: Record<string, number> };

function generationBody(options: GenerateOptions) {
  const skipThinking = options.fast && /flash/i.test(options.model);
  return {
    ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
    contents: options.turns.filter((turn) => turn.text.trim()).map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      ...(skipThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };
}

function candidateText(json: GenerateResponse) {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

export async function generateText(options: GenerateOptions) {
  const json = await post<GenerateResponse>(`models/${encodeURIComponent(options.model)}:generateContent`, generationBody(options), options.timeoutMs ?? 60_000, options.signal);
  if (json.promptFeedback?.blockReason) throw new GeminiError(`Gemini blocked the request (${json.promptFeedback.blockReason}).`);
  return { text: candidateText(json).trim(), usage: json.usageMetadata ?? {} };
}

/** Streams answer text from `streamGenerateContent` (server-sent events). */
export async function* streamText(options: GenerateOptions): AsyncGenerator<{ text: string; usage?: Record<string, number> }> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  let response: Response;
  try {
    response = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(options.model)}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(generationBody(options)),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new GeminiError("Could not reach Gemini.");
  }
  if (!response.ok || !response.body) {
    const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new GeminiError(json?.error?.message ?? `Gemini returned HTTP ${response.status}.`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
      const data = event
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
      if (!data) continue;
      const json = JSON.parse(data) as GenerateResponse & { error?: { message?: string } };
      if (json.error) throw new GeminiError(json.error.message ?? "Gemini stream error.");
      const text = candidateText(json);
      if (text || json.usageMetadata) yield { text, usage: json.usageMetadata };
    }
  }
}

type UploadedFile = { name: string; uri: string; state?: string; mimeType?: string };

async function uploadFile(data: Buffer, mimeType: string, displayName: string): Promise<UploadedFile> {
  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: headers({
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(data.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
    }),
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 120) } }),
    signal: AbortSignal.timeout(60_000),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) throw new GeminiError(`Gemini file upload could not start (HTTP ${start.status}).`, start.status);

  const finish = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: new Uint8Array(data),
    signal: AbortSignal.timeout(300_000),
  });
  const json = (await finish.json().catch(() => null)) as { file?: UploadedFile } | null;
  let file = json?.file;
  if (!finish.ok || !file) throw new GeminiError(`Gemini file upload failed (HTTP ${finish.status}).`, finish.status);

  for (let attempt = 0; file.state === "PROCESSING" && attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll: Response = await fetch(`${BASE}/v1beta/${file.name}`, { headers: headers(), signal: AbortSignal.timeout(30_000) });
    const latest = (await poll.json().catch(() => null)) as UploadedFile | null;
    if (latest) file = latest;
  }
  if (file.state === "FAILED") throw new GeminiError("Gemini could not process the uploaded file.");
  return file;
}

async function deleteFile(name: string) {
  await fetch(`${BASE}/v1beta/${name}`, { method: "DELETE", headers: headers(), signal: AbortSignal.timeout(30_000) }).catch(() => undefined);
}

/** Reads a PDF or image with Gemini using an extraction rule. Large files go through the Files API. */
export async function extractWithGemini(input: { data: Buffer; mimeType: string; prompt: string; displayName: string }) {
  let uploaded: UploadedFile | null = null;
  try {
    const filePart =
      input.data.length > INLINE_LIMIT
        ? ((uploaded = await uploadFile(input.data, input.mimeType, input.displayName)), { file_data: { mime_type: input.mimeType, file_uri: uploaded.uri } })
        : { inline_data: { mime_type: input.mimeType, data: input.data.toString("base64") } };
    const json = await post<GenerateResponse>(
      `models/${EXTRACTION_MODEL}:generateContent`,
      {
        contents: [{ role: "user", parts: [filePart, { text: input.prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 65_536, thinkingConfig: { thinkingBudget: 0 } },
      },
      300_000,
    );
    const text = candidateText(json).trim();
    if (!text) throw new GeminiError(json.promptFeedback?.blockReason ? `Gemini blocked the file (${json.promptFeedback.blockReason}).` : "Gemini returned no text for this file.");
    return text;
  } finally {
    if (uploaded) await deleteFile(uploaded.name);
  }
}
