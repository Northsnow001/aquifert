import "server-only";
import { createHash } from "crypto";
import { after } from "next/server";
import type { ExtractionRules } from "@/lib/aquibot";
import { formatTelexDay, isFileListed, telexHeadline, type LibraryDocument, type TelexAccess, type TelexItem } from "@/lib/content-types";
import { readLibraryFile } from "@/lib/data/files";
import { getHubContent, type HubContent } from "@/lib/hub-content";
import { chunkText, WEEKLY_FILE } from "./chunking";
import { weekRange } from "./dates";
import { embedDocuments, extractWithGemini, GeminiError } from "./gemini";
import { docxText, htmlText, pptxText, xlsxText } from "./office";
import { weekFromTitle } from "./query";
import { deleteDocument, engineStatus, listDocuments, replaceChunks, saveDocument, writeLog, type DocumentRow, type DocumentStatus } from "./store";

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "json", "xml", "yaml", "yml", "log", "ini"]);
const IMAGE_MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const OFFICE = new Set(["xlsx", "docx", "pptx"]);
const MAX_CHUNKS: Record<string, number> = { pdf: 200, image: 40, text: 90, csv: 90, html: 100, xlsx: 100, docx: 150, pptx: 100, telex: 60 };

export type SourceKind = "telex" | "file";

export type KnowledgeSource = {
  key: string;
  sourceType: SourceKind;
  sourceId: string;
  title: string;
  /** ISO timestamp used for date filtering and recency. */
  publishedAt: string | null;
  access: TelexAccess;
  visibility: "public" | "private";
  fileType: string | null;
  fingerprint: string;
  unsupported: string | null;
  editHref: string;
};

export type KnowledgeState = "not_indexed" | "indexed" | "outdated" | "error" | "unsupported";

export type KnowledgeRow = KnowledgeSource & {
  state: KnowledgeState;
  chunkCount: number;
  charCount: number;
  indexedAt: string | null;
  error: string | null;
  /** When the index row last changed, for retry backoff. */
  updatedAt: string | null;
};

const hash = (value: string) => createHash("sha1").update(value).digest("hex");

function extension(file: Pick<LibraryDocument, "storedName">) {
  return (file.storedName?.split(".").pop() ?? "").toLowerCase();
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Content date for a file: the report week in its title, otherwise the day it was last uploaded. */
function fileDate(file: LibraryDocument) {
  const week = weekFromTitle(`${file.title} ${file.filename} ${file.storedName ?? ""}`);
  const range = week ? weekRange(week.year, week.week) : null;
  if (range) return new Date(range.start).toISOString();
  const match = file.updated.match(/(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  return month ? new Date(Date.UTC(Number(match[3]), month - 1, Number(match[1]))).toISOString() : null;
}

function telexDate(item: TelexItem) {
  const stamp = item.publishedAt.length === 16 ? `${item.publishedAt}:00Z` : `${item.publishedAt.slice(0, 10)}T00:00:00Z`;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function telexText(item: TelexItem) {
  const lines = [telexHeadline(item), `Published: ${formatTelexDay(item.publishedAt)}`];
  if (item.tags.length) lines.push(`Tags: ${item.tags.join(", ")}`);
  if (item.documents?.length) lines.push(`Attached documents: ${item.documents.map((doc) => doc.title).join("; ")}`);
  return `${lines.join("\n")}\n\n${item.paragraphs.join("\n\n")}`;
}

function unsupportedReason(ext: string) {
  if (ext === "pdf" || ext in IMAGE_MIME || TEXT_EXTENSIONS.has(ext) || OFFICE.has(ext) || ext === "csv" || ext === "html" || ext === "htm") return null;
  if (["doc", "xls", "ppt"].includes(ext)) return `Legacy .${ext} files can't be read. Save it as .${ext}x or PDF and upload again.`;
  if (ext === "zip") return "ZIP archives can't be indexed. Upload the files inside instead.";
  return `.${ext || "?"} files can't be indexed.`;
}

function ruleFor(ext: string, rules: ExtractionRules) {
  if (ext === "pdf") return rules.pdf;
  if (ext in IMAGE_MIME) return rules.image;
  return "";
}

export function knowledgeSources(content: HubContent): KnowledgeSource[] {
  const telex: KnowledgeSource[] = content.telex
    .filter((item) => item.status === "published")
    .map((item) => ({
      key: `telex:${item.id}`,
      sourceType: "telex",
      sourceId: item.id,
      title: telexHeadline(item),
      publishedAt: telexDate(item),
      access: item.access,
      visibility: "public",
      fileType: null,
      fingerprint: hash(`${telexText(item)}|${item.access}`),
      unsupported: null,
      editHref: `/admin/telex/${item.id}`,
    }));

  const files: KnowledgeSource[] = content.libraryDocuments
    .filter((file) => file.storedName)
    .map((file) => {
      const ext = extension(file);
      const visibility = isFileListed(file, content.collections) ? "public" : "private";
      return {
        key: `file:${file.id}`,
        sourceType: "file",
        sourceId: file.id,
        title: file.title,
        publishedAt: fileDate(file),
        access: file.access,
        visibility,
        fileType: ext.toUpperCase() || file.type,
        fingerprint: hash(`${file.storedName}|${file.size}|${file.title}|${file.access}|${visibility}|${file.updated}|${ruleFor(ext, content.aquibot.extraction)}`),
        unsupported: unsupportedReason(ext),
        editHref: `/admin/library/${file.id}`,
      };
    });

  return [...telex, ...files];
}

export async function knowledgeInventory(given?: HubContent) {
  const sources = knowledgeSources(given ?? (await getHubContent()));
  const documents = await listDocuments();
  const byId = new Map(documents.map((row) => [row.id, row]));
  const rows: KnowledgeRow[] = sources.map((source) => {
    const doc = byId.get(source.key);
    let state: KnowledgeState = "not_indexed";
    if (source.unsupported) state = "unsupported";
    else if (doc?.status === "error") state = "error";
    else if (doc?.status === "indexed") state = doc.fingerprint === source.fingerprint ? "indexed" : "outdated";
    return {
      ...source,
      state,
      chunkCount: doc?.chunk_count ?? 0,
      charCount: doc?.char_count ?? 0,
      indexedAt: doc?.indexed_at ?? null,
      error: source.unsupported ?? (doc?.status === "error" ? doc.error : null),
      updatedAt: doc?.updated_at ?? null,
    };
  });
  const keys = new Set(sources.map((source) => source.key));
  const orphans = documents.filter((row) => !keys.has(row.id));
  return { rows, orphans };
}

async function readFileText(file: LibraryDocument, ext: string, rules: ExtractionRules) {
  if (!file.storedName) throw new Error("This file has no upload.");
  const data = await readLibraryFile(file);
  if (!data) throw new Error("The uploaded file is missing from storage. Upload it again.");
  if (ext === "pdf") return { text: await extractWithGemini({ data, mimeType: "application/pdf", prompt: rules.pdf, displayName: file.title }), maxChunks: MAX_CHUNKS.pdf };
  if (ext in IMAGE_MIME) return { text: await extractWithGemini({ data, mimeType: IMAGE_MIME[ext], prompt: rules.image, displayName: file.title }), maxChunks: MAX_CHUNKS.image };
  if (ext === "xlsx") return { text: xlsxText(data), maxChunks: MAX_CHUNKS.xlsx };
  if (ext === "docx") return { text: docxText(data), maxChunks: MAX_CHUNKS.docx };
  if (ext === "pptx") return { text: pptxText(data), maxChunks: MAX_CHUNKS.pptx };
  if (ext === "html" || ext === "htm") return { text: htmlText(data.toString("utf8")), maxChunks: MAX_CHUNKS.html };
  if (ext === "csv") return { text: data.toString("utf8").split(/\r?\n/).slice(0, 2000).join("\n"), maxChunks: MAX_CHUNKS.csv };
  return { text: data.toString("utf8"), maxChunks: MAX_CHUNKS.text };
}

export type IndexResult = { key: string; ok: boolean; state: KnowledgeState; chunkCount: number; message: string };

function documentBase(source: KnowledgeSource): Omit<DocumentRow, "updated_at" | "status" | "chunk_count" | "char_count" | "error" | "indexed_at"> {
  return {
    id: source.key,
    source_type: source.sourceType,
    source_id: source.sourceId,
    title: source.title,
    visibility: source.visibility,
    access: source.access,
    fingerprint: source.fingerprint,
    published_at: source.publishedAt,
  };
}

async function markDocument(source: KnowledgeSource, status: DocumentStatus, error: string | null) {
  await saveDocument({ ...documentBase(source), status, chunk_count: 0, char_count: 0, error, indexed_at: null });
}

/** Indexes one telex or file. Skips unchanged content unless `force` is set. */
export async function indexSource(key: string, options: { force?: boolean; content?: HubContent } = {}): Promise<IndexResult> {
  const content = options.content ?? (await getHubContent());
  const source = knowledgeSources(content).find((item) => item.key === key);
  if (!source) {
    await deleteDocument(key).catch(() => undefined);
    return { key, ok: false, state: "not_indexed", chunkCount: 0, message: "This item is no longer published or uploaded, so it was removed from the index." };
  }
  if (source.unsupported) {
    await markDocument(source, "unsupported", source.unsupported);
    return { key, ok: false, state: "unsupported", chunkCount: 0, message: source.unsupported };
  }
  if (!options.force) {
    const existing = (await listDocuments()).find((row) => row.id === key);
    if (existing?.status === "indexed" && existing.fingerprint === source.fingerprint) {
      return { key, ok: true, state: "indexed", chunkCount: existing.chunk_count, message: "Already up to date." };
    }
  }

  const started = Date.now();
  try {
    let text: string;
    let maxChunks: number;
    let label: string;
    let weekly = false;
    if (source.sourceType === "telex") {
      const item = content.telex.find((entry) => entry.id === source.sourceId)!;
      text = telexText(item);
      maxChunks = MAX_CHUNKS.telex;
      label = `Telex ${formatTelexDay(item.publishedAt)}: ${telexHeadline(item)}`;
    } else {
      const file = content.libraryDocuments.find((entry) => entry.id === source.sourceId)!;
      ({ text, maxChunks } = await readFileText(file, extension(file), content.aquibot.extraction));
      label = file.title;
      weekly = WEEKLY_FILE.test(`${file.title} ${file.filename} ${file.storedName}`);
    }

    const chunks = chunkText(text, { label, maxChunks, weekly });
    if (chunks.length === 0) throw new Error("No readable text was found.");
    const vectors = await embedDocuments(chunks, source.title);
    await saveDocument({ ...documentBase(source), status: "pending", chunk_count: 0, char_count: text.length, error: null, indexed_at: null });
    await replaceChunks(
      source.key,
      chunks.map((chunk, index) => ({
        chunk_index: index,
        content: chunk,
        embedding: vectors[index],
        source_type: source.sourceType,
        visibility: source.visibility,
        access: source.access,
        title: source.title,
        published_at: source.publishedAt,
      })),
    );
    const indexedAt = new Date().toISOString();
    await saveDocument({ ...documentBase(source), status: "indexed", chunk_count: chunks.length, char_count: text.length, error: null, indexed_at: indexedAt });
    await writeLog("index", "info", `Indexed “${source.title}” — ${chunks.length} chunks`, { key, chunks: chunks.length, chars: text.length, ms: Date.now() - started });
    return { key, ok: true, state: "indexed", chunkCount: chunks.length, message: `Indexed ${chunks.length} chunks.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexing failed.";
    await markDocument(source, "error", message).catch(() => undefined);
    await writeLog(error instanceof GeminiError ? "connection" : "index", "error", `Indexing “${source.title}” failed: ${message}`, { key, ms: Date.now() - started });
    return { key, ok: false, state: "error", chunkCount: 0, message };
  }
}

export async function removeSource(key: string) {
  await deleteDocument(key);
  await writeLog("index", "info", `Removed ${key} from the index`, { key });
}

const RETRY_AFTER_MS = 6 * 60 * 60 * 1000;

export type SweepResult = { indexed: number; failed: number; removed: number; remaining: number; results: IndexResult[]; ms: number };

/**
 * One pass of background indexing: new and changed sources first (newest first), then failures last tried
 * more than six hours ago. Stops starting new work once `budgetMs` is spent so the request ends in time.
 */
export async function indexPending(options: { limit: number; budgetMs: number; concurrency?: number }): Promise<SweepResult> {
  const started = Date.now();
  const content = await getHubContent();
  const { rows, orphans } = await knowledgeInventory(content);

  let removed = 0;
  for (const orphan of orphans.slice(0, 50)) {
    await deleteDocument(orphan.id).then(() => (removed += 1), () => undefined);
  }

  const newest = (a: KnowledgeRow, b: KnowledgeRow) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  const fresh = rows.filter((row) => row.state === "not_indexed" || row.state === "outdated").sort(newest);
  const retry = rows.filter((row) => row.state === "error" && (!row.updatedAt || started - new Date(row.updatedAt).getTime() > RETRY_AFTER_MS));
  const queue = [...fresh, ...retry];

  const results: IndexResult[] = [];
  let next = 0;
  const worker = async () => {
    while (next < queue.length && next < options.limit && Date.now() - started < options.budgetMs) {
      const row = queue[next++];
      results.push(await indexSource(row.key, { content }));
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency ?? 2) }, worker));

  const indexed = results.filter((result) => result.ok).length;
  const sweep = { indexed, failed: results.length - indexed, removed, remaining: queue.length - results.length, results, ms: Date.now() - started };
  if (results.length || removed) {
    await writeLog("index", sweep.failed ? "warn" : "info", `Background indexing: ${indexed} indexed, ${sweep.failed} failed, ${sweep.remaining} left`, {
      indexed,
      failed: sweep.failed,
      removed,
      remaining: sweep.remaining,
      ms: sweep.ms,
    });
  }
  return sweep;
}

/**
 * Keeps the index in step with publishing: runs after the response so saving stays fast.
 * Unpublished or deleted items are removed; new or changed ones are indexed.
 */
export function syncKnowledgeLater(keys: string[]) {
  if (keys.length === 0) return;
  after(async () => {
    try {
      const status = await engineStatus();
      if (!status.ready) return;
      const content = await getHubContent();
      for (const key of keys) await indexSource(key, { content });
    } catch (error) {
      await writeLog("index", "error", `Automatic indexing failed: ${error instanceof Error ? error.message : "unknown error"}`, { keys });
    }
  });
}
