import "server-only";

import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { syncKnowledgeLater } from "@/lib/aquibot-engine/indexer";
import { deskNow, formatBytes, type HedgeReport, type LibraryDocument, type TelexAccess, type TelexItem } from "@/lib/content-types";
import { getHubContent, libraryFileDir, libraryFilePath, saveHubContent, sortHedge, sortTelex, type HubContent } from "@/lib/hub-content";
import { listInbox, mergeInbox, type InboxItem } from "@/lib/inbox";
import { sanitizeRichText } from "@/lib/sanitize";
import {
  enquiryTime,
  guessProductAccess,
  mapCollections,
  mapEnquiryPayload,
  mapFile,
  mapFreightFixtures,
  mapHedge,
  mapIndicators,
  mapTelex,
  parseExport,
  plainText,
  deskTime,
  wpId,
  type WpExport,
} from "./map";

const root = path.join(process.cwd(), "data", "wp-import");
const exportPath = path.join(root, "export.json");
const statePath = path.join(root, "state.json");

export const SECTION_KEYS = ["telex", "indicators", "hedge", "freight", "tools", "library", "enquiries"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABEL: Record<SectionKey, string> = {
  telex: "Telex",
  indicators: "Market indicators",
  hedge: "Hedge tables",
  freight: "Freight routes",
  tools: "Tools commentary",
  library: "Library collections and files",
  enquiries: "Order Desk enquiries",
};

export type ImportOptions = {
  sections: Record<SectionKey, boolean>;
  /** Remove items in the imported sections that did not come from this export (sample content, earlier imports since deleted). */
  replaceExisting: boolean;
  telexAccess: TelexAccess;
  productAccess: Record<string, TelexAccess>;
};

export type SectionPlan = {
  key: SectionKey;
  label: string;
  available: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  notes: string[];
};

type FileState = { bytes: number; modified: string; at: string };
type ImportState = {
  uploadedAt: string;
  fileName: string;
  lastRun: { at: string; options: ImportOptions; sections: SectionPlan[] } | null;
  files: Record<string, FileState>;
};

export type ExportSummary = {
  site: string;
  exportedAt: string;
  uploadedAt: string;
  fileName: string;
  downloadExpiresAt: string;
  downloadExpired: boolean;
  products: { id: string; title: string; files: number }[];
  fileCount: number;
  fileBytes: number;
  missingFiles: number;
};

export type PendingFile = { id: number; title: string; bytes: number };

/* ---------------- Stored export ---------------- */

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeState(state: ImportState) {
  mkdirSync(root, { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function loadExport(): WpExport | null {
  const raw = readJson<unknown>(exportPath);
  if (!raw) return null;
  try {
    return parseExport(raw);
  } catch {
    return null;
  }
}

export function loadState(): ImportState | null {
  return readJson<ImportState>(statePath);
}

/** Validates and stores an uploaded export, replacing any earlier one. */
export function saveExport(text: string, fileName: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON. Download the export again from WordPress.");
  }
  const data = parseExport(raw);
  mkdirSync(root, { recursive: true });
  writeFileSync(exportPath, JSON.stringify(raw), "utf8");
  const previous = loadState();
  writeState({ uploadedAt: new Date().toISOString(), fileName, lastRun: previous?.lastRun ?? null, files: previous?.files ?? {} });
  return data;
}

export function discardExport() {
  rmSync(exportPath, { force: true });
}

export function summarize(data: WpExport, state: ImportState | null): ExportSummary {
  const perProduct = new Map<number, number>();
  for (const file of data.library) if (file.productId > 0) perProduct.set(file.productId, (perProduct.get(file.productId) ?? 0) + 1);
  const products = data.products.map((product) => ({ id: String(product.id), title: product.title || product.slug, files: perProduct.get(product.id) ?? 0 }));
  for (const [id, files] of perProduct) {
    if (!data.products.some((product) => product.id === id)) products.push({ id: String(id), title: `Product #${id} (no longer published)`, files });
  }
  const expires = Date.parse(data.download.expiresAt);
  return {
    site: data.site,
    exportedAt: data.exportedAt,
    uploadedAt: state?.uploadedAt ?? "",
    fileName: state?.fileName ?? "",
    downloadExpiresAt: data.download.expiresAt,
    downloadExpired: !Number.isFinite(expires) || expires < Date.now(),
    products,
    fileCount: data.library.length,
    fileBytes: data.library.reduce((total, file) => total + file.bytes, 0),
    missingFiles: data.library.filter((file) => file.missing).length,
  };
}

export function defaultOptions(data: WpExport, state: ImportState | null): ImportOptions {
  const previous = state?.lastRun?.options;
  const productAccess: Record<string, TelexAccess> = {};
  for (const product of data.products) productAccess[String(product.id)] = previous?.productAccess[String(product.id)] ?? guessProductAccess(product);
  for (const file of data.library) {
    if (file.productId > 0 && !productAccess[String(file.productId)]) productAccess[String(file.productId)] = previous?.productAccess[String(file.productId)] ?? "growth";
  }
  return {
    sections: previous?.sections ?? { telex: true, indicators: true, hedge: true, freight: true, tools: true, library: true, enquiries: true },
    replaceExisting: previous?.replaceExisting ?? true,
    telexAccess: previous?.telexAccess ?? "public",
    productAccess,
  };
}

const ACCESS: TelexAccess[] = ["public", "growth", "enterprise"];

/** Accepts options from the browser, keeping only known keys and values. */
export function cleanOptions(raw: ImportOptions, data: WpExport): ImportOptions {
  const fallback = defaultOptions(data, null);
  const sections = { ...fallback.sections };
  for (const key of SECTION_KEYS) sections[key] = Boolean(raw?.sections?.[key]);
  const productAccess = { ...fallback.productAccess };
  for (const id of Object.keys(productAccess)) {
    const value = raw?.productAccess?.[id];
    if (ACCESS.includes(value)) productAccess[id] = value;
  }
  return {
    sections,
    replaceExisting: Boolean(raw?.replaceExisting),
    telexAccess: ACCESS.includes(raw?.telexAccess) ? raw.telexAccess : "public",
    productAccess,
  };
}

/* ---------------- Plan and apply ---------------- */

type Keyed = { id: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function without<T extends object>(key: keyof T) {
  return (item: T) => {
    const copy = { ...item };
    delete copy[key];
    return copy;
  };
}

/** Merges incoming items into the current list by id and counts what changes. */
function mergeById<T extends Keyed>(current: T[], incoming: T[], replace: boolean, section: SectionPlan, compare: (item: T) => unknown = (item) => item) {
  const existing = new Map(current.map((item) => [item.id, item]));
  const incomingIds = new Set(incoming.map((item) => item.id));
  for (const item of incoming) {
    const before = existing.get(item.id);
    if (!before) section.added += 1;
    else if (same(compare(before), compare(item))) section.unchanged += 1;
    else section.updated += 1;
  }
  const kept = current.filter((item) => !incomingIds.has(item.id));
  const removed = replace ? kept : [];
  section.removed += removed.length;
  return { items: [...incoming, ...(replace ? [] : kept)], removed };
}

function plan(key: SectionKey, available: number): SectionPlan {
  return { key, label: SECTION_LABEL[key], available, added: 0, updated: 0, unchanged: 0, removed: 0, notes: [] };
}

type Build = { content: HubContent; inbox: InboxItem[] | null; sections: SectionPlan[]; removedFileIds: string[]; changedFileIds: string[] };

function build(data: WpExport, options: ImportOptions, content: HubContent, inbox: InboxItem[]): Build {
  const sections: SectionPlan[] = [];
  const removedFileIds: string[] = [];
  const changedFileIds: string[] = [];
  let nextInbox: InboxItem[] | null = null;
  const on = options.sections;

  if (on.telex) {
    const section = plan("telex", data.telex.length);
    const incoming = data.telex.map((post) => mapTelex(post, options.telexAccess)).filter((item) => item.paragraphs.length > 0);
    const empty = data.telex.length - incoming.length;
    if (empty) section.notes.push(`${empty} empty ${empty === 1 ? "message is" : "messages are"} skipped.`);
    const images = data.telex.filter((post) => /<img\b/i.test(post.content)).length;
    if (images) section.notes.push(`${images} ${images === 1 ? "message has" : "messages have"} an image. Telex here is text only, so the images are left out.`);
    const drafts = incoming.filter((item) => item.status !== "published").length;
    if (drafts) section.notes.push(`${drafts} ${drafts === 1 ? "draft stays a draft" : "drafts stay drafts"}.`);
    content.telex = sortTelex(mergeById(content.telex, incoming, options.replaceExisting, section, without<TelexItem>("updatedAt")).items);
    sections.push(section);
  }

  if (on.indicators) {
    const section = plan("indicators", data.indicators ? 3 : 0);
    if (data.indicators) {
      const next = mapIndicators(data.indicators, content.indicators);
      next.forEach((item, i) => (same(item, content.indicators[i]) ? (section.unchanged += 1) : (section.updated += 1)));
      content.indicators = next;
      content.indicatorsUpdatedAt = deskTime(data.indicators.modified || data.indicators.date);
    } else section.notes.push("WordPress has no published indicator readings.");
    sections.push(section);
  }

  if (on.hedge) {
    const section = plan("hedge", data.hedgeTables.length);
    const incoming = data.hedgeTables.map(mapHedge);
    const blank = incoming.filter((item) => item.sections.length === 0).length;
    if (blank) section.notes.push(`${blank} ${blank === 1 ? "table has" : "tables have"} no price rows, only a title or narrative.`);
    content.hedgeReports = sortHedge(mergeById(content.hedgeReports, incoming, options.replaceExisting, section, without<HedgeReport>("updatedAt")).items);
    sections.push(section);
  }

  if (on.freight) {
    const section = plan("freight", data.freight?.routes.length ?? 0);
    if (data.freight) {
      const fixtures = mapFreightFixtures(data.freight);
      const commentary = plainText(data.freight.narrative);
      const before = { fixtures: content.freight.fixtures, commentary: content.freight.commentary };
      if (same(before, { fixtures, commentary })) section.unchanged = fixtures.length;
      else section.updated = fixtures.length;
      section.notes.push("The whole board is replaced with the latest WordPress save. Show on home keeps its current setting.");
      content.freight = { ...content.freight, fixtures, commentary, updatedAt: data.freight.modified ? deskTime(data.freight.modified) : deskNow() };
    }
    sections.push(section);
  }

  if (on.tools) {
    const html = sanitizeRichText(data.toolsCommentary);
    const section = plan("tools", html ? 1 : 0);
    if (!html) section.notes.push("WordPress has no tools commentary saved, so the current one is kept.");
    else {
      if (same(html, content.toolsCommentary.html)) section.unchanged = 1;
      else section.updated = 1;
      content.toolsCommentary = { html, updatedAt: deskNow() };
    }
    sections.push(section);
  }

  if (on.library) {
    const section = plan("library", data.library.length);
    const collections = mapCollections(data.collections);
    const collectionPlan = plan("library", collections.length);
    const mergedCollections = mergeById(content.collections, collections, options.replaceExisting, collectionPlan);
    content.collections = mergedCollections.items;
    const collectionIds = new Set(content.collections.map((item) => item.id));

    const existing = new Map(content.libraryDocuments.map((item) => [item.id, item]));
    const incoming = data.library.map((file) => mapFile(file, options.productAccess, collectionIds, existing.get(wpId.file(file.id))));
    const merged = mergeById(content.libraryDocuments, incoming, options.replaceExisting, section, without<LibraryDocument>("storedName"));
    content.libraryDocuments = merged.items.map((item) => ({ ...item, collectionIds: item.collectionIds.filter((id) => collectionIds.has(id)) }));
    removedFileIds.push(...merged.removed.map((item) => item.id));
    changedFileIds.push(...incoming.map((item) => item.id));

    section.notes.push(
      `Collections: ${collectionPlan.added} new, ${collectionPlan.updated} updated${collectionPlan.removed ? `, ${collectionPlan.removed} removed` : ""}.`,
    );
    const paid = data.library.filter((file) => file.productId > 0).length;
    if (paid) section.notes.push(`${paid} ${paid === 1 ? "file was" : "files were"} sold through MemberPress. They get the plan level chosen below.`);
    const missing = data.library.filter((file) => file.missing).length;
    if (missing) section.notes.push(`${missing} ${missing === 1 ? "file is" : "files are"} missing from the WordPress uploads folder and will be listed without a download.`);
    const leftover = merged.removed.filter((item) => item.storedName).length;
    if (leftover) section.notes.push(`${leftover} uploaded ${leftover === 1 ? "file" : "files"} not in WordPress will be deleted from this app.`);
    sections.push(section);
  }

  if (on.enquiries) {
    const section = plan("enquiries", data.enquiries.length);
    const current = new Map(inbox.map((item) => [item.id, item]));
    const incoming: InboxItem[] = data.enquiries.map((item) => ({ id: wpId.enquiry(item.id), table: "order_enquiries", at: enquiryTime(item), payload: mapEnquiryPayload(item) }));
    for (const item of incoming) {
      const before = current.get(item.id);
      if (!before) section.added += 1;
      else if (same(before, item)) section.unchanged += 1;
      else section.updated += 1;
    }
    section.notes.push("Existing enquiries in this app are kept.");
    nextInbox = incoming;
    sections.push(section);
  }

  return { content, inbox: nextInbox, sections, removedFileIds, changedFileIds };
}

export function planImport(data: WpExport, options: ImportOptions) {
  return build(data, options, getHubContent(), listInbox()).sections;
}

export function applyImport(data: WpExport, options: ImportOptions) {
  const current = getHubContent();
  const oldKeys = [...current.telex.map((item) => `telex:${item.id}`), ...current.libraryDocuments.map((item) => `file:${item.id}`)];
  const result = build(data, options, current, listInbox());
  saveHubContent(result.content);
  if (result.inbox) mergeInbox(result.inbox);

  for (const id of result.removedFileIds) {
    try {
      rmSync(libraryFileDir(id), { recursive: true, force: true });
    } catch {
      /* the folder is already gone */
    }
  }

  const kept = new Set([...result.content.telex.map((item) => `telex:${item.id}`), ...result.content.libraryDocuments.map((item) => `file:${item.id}`)]);
  syncKnowledgeLater(oldKeys.filter((key) => !kept.has(key)));

  const state = loadState() ?? { uploadedAt: new Date().toISOString(), fileName: "", lastRun: null, files: {} };
  state.lastRun = { at: new Date().toISOString(), options, sections: result.sections };
  writeState(state);
  return result.sections;
}

/* ---------------- Library file downloads ---------------- */

export function pendingFiles(data: WpExport): PendingFile[] {
  const state = loadState();
  const docs = new Map(getHubContent().libraryDocuments.map((item) => [item.id, item]));
  return data.library
    .filter((file) => {
      if (file.missing) return false;
      const doc = docs.get(wpId.file(file.id));
      if (!doc) return false;
      const stored = libraryFilePath(doc);
      if (!stored || !existsSync(stored)) return true;
      const seen = state?.files[String(file.id)];
      return !seen || seen.bytes !== file.bytes || seen.modified !== file.modified;
    })
    .map((file) => ({ id: file.id, title: file.title || file.filename, bytes: file.bytes }));
}

const MAX_FILE_BYTES = 500 * 1024 * 1024;

export async function downloadFile(data: WpExport, wpFileId: number) {
  const file = data.library.find((item) => item.id === wpFileId);
  if (!file) throw new Error("That file is not in the export.");
  const docId = wpId.file(file.id);
  if (!getHubContent().libraryDocuments.some((item) => item.id === docId)) throw new Error("Import the library first, then download its files.");
  if (!data.download.endpoint || !data.download.token) throw new Error("The export has no download link. Update the Aquifert Export plugin and export again.");
  if (Date.parse(data.download.expiresAt) < Date.now()) throw new Error("The export's download link has expired. Download a new export in WordPress and upload it here.");
  if (file.bytes > MAX_FILE_BYTES) throw new Error(`${file.title} is larger than ${formatBytes(MAX_FILE_BYTES)}. Upload it by hand in Library.`);

  const response = await fetch(`${data.download.endpoint}${file.id}`, {
    headers: { "X-Aquifert-Export-Token": data.download.token },
    signal: AbortSignal.timeout(10 * 60 * 1000),
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    let message = `WordPress answered ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }

  const name = path.basename(file.filename).replace(/[^\w.\- ()&]+/g, "_") || `file-${file.id}`;
  const dir = libraryFileDir(docId);
  mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, `.download-${Date.now()}`);
  try {
    await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream), createWriteStream(temp));
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
  const bytes = statSync(temp).size;
  for (const entry of readdirSync(dir)) if (path.join(dir, entry) !== temp) rmSync(path.join(dir, entry), { force: true });
  renameSync(temp, path.join(dir, name));

  const content = getHubContent();
  const doc = content.libraryDocuments.find((item) => item.id === docId);
  if (doc) {
    doc.storedName = name;
    doc.size = formatBytes(bytes);
    const ext = path.extname(name).slice(1);
    if (ext) doc.type = ext.toUpperCase();
    saveHubContent(content);
  }

  const state = loadState() ?? { uploadedAt: new Date().toISOString(), fileName: "", lastRun: null, files: {} };
  state.files[String(file.id)] = { bytes: file.bytes, modified: file.modified, at: new Date().toISOString() };
  writeState(state);
  syncKnowledgeLater([`file:${docId}`]);
  return { title: doc?.title ?? file.title, bytes };
}
