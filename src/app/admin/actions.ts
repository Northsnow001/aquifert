"use server";

import { rmSync } from "fs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import {
  deskNow,
  newId,
  slugify,
  splitParagraphs,
  type Collection,
  type FreightBoard,
  type HedgeReport,
  type Indicator,
  type PublishStatus,
  type TelexAccess,
  type TelexItem,
} from "@/lib/content-types";
import {
  AQUIBOT_MODELS,
  DEFAULT_EXTRACTION,
  DEFAULT_SETTINGS,
  parseStopWords,
  type AquibotPrompt,
  type AquibotSettings,
  type ExtractionRules,
} from "@/lib/aquibot";
import { syncKnowledgeLater } from "@/lib/aquibot-engine/indexer";
import { libraryFileDir, updateHubContent } from "@/lib/hub-content";
import { sanitizeRichText } from "@/lib/sanitize";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function refresh() {
  revalidatePath("/hub", "layout");
  revalidatePath("/admin", "layout");
}

const STATUSES: PublishStatus[] = ["published", "draft", "private"];
const ACCESS: TelexAccess[] = ["public", "growth", "enterprise"];

/* ---------------- Telex ---------------- */

export async function saveTelex(formData: FormData) {
  const user = await requireAdmin();
  const existingId = text(formData, "id");
  const intent = text(formData, "intent");
  const statusField = text(formData, "status") as PublishStatus;
  const status: PublishStatus = intent === "draft" ? "draft" : intent === "publish" ? "published" : STATUSES.includes(statusField) ? statusField : "draft";
  const accessField = text(formData, "access") as TelexAccess;
  const paragraphs = splitParagraphs(text(formData, "body"));
  const tags = Array.from(
    new Set(
      text(formData, "tags")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );

  if (paragraphs.length === 0) redirect(existingId ? `/admin/telex/${existingId}?error=1` : "/admin/telex/new?error=1");

  const id = existingId || newId("tx");
  const item: TelexItem = {
    id,
    headline: text(formData, "headline"),
    paragraphs,
    tags,
    access: ACCESS.includes(accessField) ? accessField : "public",
    status,
    author: text(formData, "author") || user.name,
    publishedAt: text(formData, "publishedAt") || deskNow(),
    updatedAt: deskNow(),
  };

  updateHubContent((content) => {
    const index = content.telex.findIndex((entry) => entry.id === id);
    if (index >= 0) content.telex[index] = item;
    else content.telex.unshift(item);
  });
  syncKnowledgeLater([`telex:${id}`]);
  refresh();
  redirect(`/admin/telex/${id}?saved=${status}`);
}

export async function deleteTelex(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  updateHubContent((content) => {
    content.telex = content.telex.filter((item) => item.id !== id);
  });
  syncKnowledgeLater([`telex:${id}`]);
  refresh();
  redirect("/admin/telex?done=deleted");
}

export async function duplicateTelex(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const copyId = newId("tx");
  updateHubContent((content) => {
    const source = content.telex.find((item) => item.id === id);
    if (source) content.telex.unshift({ ...source, id: copyId, status: "draft", publishedAt: deskNow(), updatedAt: deskNow() });
  });
  refresh();
  redirect(`/admin/telex/${copyId}?saved=draft`);
}

export async function bulkTelex(formData: FormData) {
  await requireAdmin();
  const ids = new Set(formData.getAll("ids").map(String));
  const action = text(formData, "bulk");
  const back = text(formData, "back") || "/admin/telex";
  if (ids.size === 0 || !action) redirect(back);
  updateHubContent((content) => {
    if (action === "delete") {
      content.telex = content.telex.filter((item) => !ids.has(item.id));
      return;
    }
    const status = action as PublishStatus;
    if (!STATUSES.includes(status)) return;
    content.telex = content.telex.map((item) => (ids.has(item.id) ? { ...item, status, updatedAt: deskNow() } : item));
  });
  syncKnowledgeLater(Array.from(ids, (id) => `telex:${id}`));
  refresh();
  const join = back.includes("?") ? "&" : "?";
  redirect(`${back}${join}done=${action}&count=${ids.size}`);
}

/* ---------------- Market indicators ---------------- */

export async function saveIndicatorReadings(readings: Indicator[]): Promise<{ ok: true; savedAt: string }> {
  await requireAdmin();
  const savedAt = deskNow();
  updateHubContent((content) => {
    content.indicators = content.indicators.map((item) => {
      const next = readings.find((entry) => entry.name === item.name);
      if (!next) return item;
      const value = Number(next.value);
      return {
        ...item,
        value: Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : item.value,
        summary: String(next.summary ?? "").trim(),
        note: String(next.note ?? "").trim(),
      };
    });
    content.indicatorsUpdatedAt = savedAt;
  });
  refresh();
  return { ok: true, savedAt };
}

/* ---------------- Hedge tables ---------------- */

function cleanReport(report: HedgeReport): HedgeReport {
  return {
    id: report.id || newId("hedge"),
    title: report.title.trim() || `Daily Hedge Update – ${report.date}`,
    date: /^\d{4}-\d{2}-\d{2}$/.test(report.date) ? report.date : deskNow().slice(0, 10),
    status: report.status === "draft" ? "draft" : "published",
    narrative: report.narrative.trim(),
    updatedAt: deskNow(),
    sections: report.sections
      .map((section) => ({
        id: section.id || newId("sec"),
        label: section.label.trim() || "Section",
        commodities: section.commodities
          .map((commodity) => ({
            id: commodity.id || newId("com"),
            label: commodity.label.trim(),
            index: commodity.index.trim(),
            rows: commodity.rows
              .map((row) => ({
                id: row.id || newId("row"),
                period: row.period.trim(),
                bid: row.bid.trim(),
                ask: row.ask.trim(),
                dir: row.dir === "up" || row.dir === "down" ? row.dir : ("flat" as const),
              }))
              .filter((row) => row.period && (row.bid || row.ask)),
          }))
          .filter((commodity) => commodity.label),
      }))
      .filter((section) => section.commodities.length > 0),
  };
}

export async function saveHedgeReport(report: HedgeReport): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireAdmin();
  const clean = cleanReport(report);
  if (clean.sections.length === 0 && !clean.narrative) {
    return { ok: false, message: "Add a narrative or at least one priced month before saving." };
  }
  updateHubContent((content) => {
    const index = content.hedgeReports.findIndex((item) => item.id === clean.id);
    if (index >= 0) content.hedgeReports[index] = clean;
    else content.hedgeReports.unshift(clean);
  });
  refresh();
  return { ok: true, id: clean.id };
}

export async function deleteHedgeReport(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  updateHubContent((content) => {
    content.hedgeReports = content.hedgeReports.filter((item) => item.id !== id);
  });
  refresh();
  return { ok: true };
}

/* ---------------- Collections ---------------- */

export async function saveCollection(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || newId("col");
  const name = text(formData, "name");
  if (!name) redirect(`/admin/collections?error=1${text(formData, "id") ? `&edit=${id}` : ""}`);

  updateHubContent((content) => {
    const base = slugify(text(formData, "slug") || name) || "collection";
    let slug = base;
    let n = 2;
    while (content.collections.some((item) => item.slug === slug && item.id !== id)) slug = `${base}-${n++}`;
    const parentId = text(formData, "parentId");
    const createsLoop = (candidate: string) => {
      const seen = new Set<string>();
      for (let at: string | null = candidate; at; at = content.collections.find((item) => item.id === at)?.parentId ?? null) {
        if (at === id || seen.has(at)) return true;
        seen.add(at);
      }
      return false;
    };
    const next: Collection = {
      id,
      name,
      slug,
      parentId: parentId && content.collections.some((item) => item.id === parentId) && !createsLoop(parentId) ? parentId : null,
      description: text(formData, "description"),
      private: formData.get("private") === "on",
    };
    const index = content.collections.findIndex((item) => item.id === id);
    if (index >= 0) content.collections[index] = next;
    else content.collections.push(next);
  });
  refresh();
  redirect("/admin/collections?saved=1");
}

export async function deleteCollection(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  updateHubContent((content) => {
    content.collections = content.collections
      .filter((item) => item.id !== id)
      .map((item) => (item.parentId === id ? { ...item, parentId: null } : item));
    content.libraryDocuments = content.libraryDocuments.map((file) => ({
      ...file,
      collectionIds: file.collectionIds.filter((value) => value !== id),
    }));
  });
  refresh();
  redirect("/admin/collections?saved=deleted");
}

/* ---------------- Library files ---------------- */

function removeStoredFiles(ids: Iterable<string>) {
  for (const id of ids) rmSync(libraryFileDir(id), { recursive: true, force: true });
}

export async function deleteLibraryFile(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const back = text(formData, "back") || "/admin/library";
  updateHubContent((content) => {
    content.libraryDocuments = content.libraryDocuments.filter((item) => item.id !== id);
  });
  removeStoredFiles([id]);
  syncKnowledgeLater([`file:${id}`]);
  refresh();
  redirect(`${back}${back.includes("?") ? "&" : "?"}saved=deleted`);
}

export async function bulkLibrary(formData: FormData) {
  await requireAdmin();
  const ids = new Set(formData.getAll("ids").map(String));
  const action = text(formData, "bulk");
  const back = text(formData, "back") || "/admin/library";
  if (ids.size === 0 || !action) redirect(back);
  updateHubContent((content) => {
    if (action === "delete") {
      content.libraryDocuments = content.libraryDocuments.filter((item) => !ids.has(item.id));
      return;
    }
    content.libraryDocuments = content.libraryDocuments.map((file) => {
      if (!ids.has(file.id)) return file;
      if (action === "private") return { ...file, private: true };
      if (action === "listed") return { ...file, private: false };
      if (action.startsWith("access:")) {
        const access = action.slice(7) as TelexAccess;
        return ACCESS.includes(access) ? { ...file, access } : file;
      }
      if (action.startsWith("add:")) {
        const collectionId = action.slice(4);
        return content.collections.some((item) => item.id === collectionId) && !file.collectionIds.includes(collectionId)
          ? { ...file, collectionIds: [...file.collectionIds, collectionId] }
          : file;
      }
      if (action.startsWith("remove:")) {
        const collectionId = action.slice(7);
        return { ...file, collectionIds: file.collectionIds.filter((value) => value !== collectionId) };
      }
      return file;
    });
  });
  if (action === "delete") removeStoredFiles(ids);
  syncKnowledgeLater(Array.from(ids, (id) => `file:${id}`));
  refresh();
  redirect(`${back}${back.includes("?") ? "&" : "?"}done=${encodeURIComponent(action)}&count=${ids.size}`);
}

/* ---------------- Freight routes ---------------- */

export async function saveFreightBoard(board: FreightBoard): Promise<{ ok: true; savedAt: string }> {
  await requireAdmin();
  const savedAt = deskNow();
  const cell = (value: unknown) => String(value ?? "").trim().slice(0, 120);
  updateHubContent((content) => {
    content.freight = {
      fixtures: board.fixtures
        .map((row) => ({
          id: row.id || newId("fx"),
          account: cell(row.account),
          product: cell(row.product),
          qty: cell(row.qty),
          origin: cell(row.origin),
          destination: cell(row.destination),
          laycan: cell(row.laycan),
          visible: row.visible !== false,
        }))
        .filter((row) => row.account || row.product || row.qty || row.origin || row.destination || row.laycan),
      commentary: String(board.commentary ?? "").trim(),
      showOnHome: Boolean(board.showOnHome),
      updatedAt: savedAt,
    };
  });
  refresh();
  return { ok: true, savedAt };
}

/* ---------------- Tools commentary ---------------- */

export async function saveToolsCommentary(html: string): Promise<{ ok: true; html: string; savedAt: string }> {
  await requireAdmin();
  const clean = sanitizeRichText(String(html ?? ""));
  const savedAt = deskNow();
  updateHubContent((content) => {
    content.toolsCommentary = { html: clean, updatedAt: savedAt };
  });
  refresh();
  return { ok: true, html: clean, savedAt };
}

/* ---------------- Aquibot ---------------- */

export type PromptAction = "save-test" | "publish" | "restore" | "reset";

export async function updateAquibotPrompt(action: PromptAction, test: string): Promise<{ ok: true; prompt: AquibotPrompt } | { ok: false; message: string }> {
  await requireAdmin();
  const draft = String(test ?? "").replace(/\r\n/g, "\n").trim().slice(0, 40000);
  const now = deskNow();
  let result: { ok: true; prompt: AquibotPrompt } | { ok: false; message: string } = { ok: false, message: "Unknown action" };
  updateHubContent((content) => {
    const prompt = { ...content.aquibot.prompt, test: draft, testSavedAt: now };
    if (action === "publish") {
      if (!draft) {
        result = { ok: false, message: "Write a test prompt before publishing" };
        return;
      }
      if (draft !== prompt.published) prompt.previous = prompt.published;
      prompt.published = draft;
      prompt.publishedAt = now;
    } else if (action === "restore") {
      if (!prompt.previous) {
        result = { ok: false, message: "There is no previous prompt to restore" };
        return;
      }
      [prompt.published, prompt.previous] = [prompt.previous, prompt.published];
      prompt.publishedAt = now;
    } else if (action === "reset") {
      if (prompt.published) prompt.previous = prompt.published;
      prompt.published = "";
      prompt.publishedAt = now;
    } else if (action !== "save-test") {
      return;
    }
    content.aquibot = { ...content.aquibot, prompt, updatedAt: now };
    result = { ok: true, prompt };
  });
  refresh();
  return result;
}

const whole = (value: unknown, fallback: number, max = 10_000_000) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), max) : fallback;
};

const model = (value: unknown, fallback: string) => (AQUIBOT_MODELS.some((item) => item.value === value) ? String(value) : fallback);

export async function saveAquibotSettings(settings: AquibotSettings): Promise<{ ok: true; settings: AquibotSettings; savedAt: string }> {
  await requireAdmin();
  const savedAt = deskNow();
  const d = DEFAULT_SETTINGS;
  const clean: AquibotSettings = {
    limitCore: whole(settings.limitCore, d.limitCore),
    limitGrowth: whole(settings.limitGrowth, d.limitGrowth),
    limitEnterprise: whole(settings.limitEnterprise, d.limitEnterprise),
    contextWindow: whole(settings.contextWindow, d.contextWindow, 100),
    pruneAgeMonths: whole(settings.pruneAgeMonths, d.pruneAgeMonths, 120),
    dateGraceDays: whole(settings.dateGraceDays, d.dateGraceDays, 60),
    ragTotalBudget: whole(settings.ragTotalBudget, d.ragTotalBudget),
    publicFileBudget: whole(settings.publicFileBudget, d.publicFileBudget),
    privateFileBudget: whole(settings.privateFileBudget, d.privateFileBudget),
    maxTopChunks: whole(settings.maxTopChunks, d.maxTopChunks, 500),
    chatHistoryWindow: whole(settings.chatHistoryWindow, d.chatHistoryWindow, 100),
    freightRouting: Boolean(settings.freightRouting),
    introMessage: String(settings.introMessage ?? "").replace(/\r\n/g, "\n").trim().slice(0, 2000),
    recencyFilter: Boolean(settings.recencyFilter),
    recencyYears: Math.max(1, whole(settings.recencyYears, d.recencyYears, 50)),
    benchmarkPriority: Boolean(settings.benchmarkPriority),
    monthTokenMatching: Boolean(settings.monthTokenMatching),
    answerModel: model(settings.answerModel, d.answerModel),
    rewriteModel: model(settings.rewriteModel, d.rewriteModel),
  };
  updateHubContent((content) => {
    content.aquibot = { ...content.aquibot, settings: clean, updatedAt: savedAt };
  });
  refresh();
  return { ok: true, settings: clean, savedAt };
}

export async function saveAquibotVocabulary(input: { synonyms: string; stopWords: string }): Promise<{ ok: true; synonyms: string; stopWords: string; savedAt: string }> {
  await requireAdmin();
  const savedAt = deskNow();
  const synonyms = String(input.synonyms ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 50000);
  const stopWords = parseStopWords(String(input.stopWords ?? "")).words.join(",").slice(0, 20000);
  updateHubContent((content) => {
    content.aquibot = { ...content.aquibot, synonyms, stopWords, updatedAt: savedAt };
  });
  refresh();
  return { ok: true, synonyms, stopWords, savedAt };
}

export async function saveAquibotExtraction(rules: ExtractionRules): Promise<{ ok: true; extraction: ExtractionRules; savedAt: string }> {
  await requireAdmin();
  const savedAt = deskNow();
  const rule = (value: unknown, fallback: string) => String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, 20000) || fallback;
  const extraction: ExtractionRules = {
    pdf: rule(rules.pdf, DEFAULT_EXTRACTION.pdf),
    image: rule(rules.image, DEFAULT_EXTRACTION.image),
    telex: rule(rules.telex, DEFAULT_EXTRACTION.telex),
  };
  updateHubContent((content) => {
    content.aquibot = { ...content.aquibot, extraction, updatedAt: savedAt };
  });
  refresh();
  return { ok: true, extraction, savedAt };
}
