import {
  formatBytes,
  formatDay,
  parseHedgeReport,
  type Collection,
  type CurveDirection,
  type FreightFixture,
  type HedgeReport,
  type HedgeSection,
  type Indicator,
  type LibraryDocument,
  type PublishStatus,
  type TelexAccess,
  type TelexItem,
} from "@/lib/content-types";

/* ---------------- Export file shape (see wordpress/aquifert-export) ---------------- */

type WpBase = { id: number; status: string; title: string; date: string; dateGmt: string; modified: string };

export type WpTelex = WpBase & { content: string; author: string; tags: string[] };
export type WpIndicators = WpBase & Record<"nitrogen" | "phosphate" | "potassium", { value: number | null; note: string }>;
export type WpHedgeRow = { type?: string; section?: string; label?: string; index?: string; period?: string; bid?: string; ask?: string; dir?: string };
export type WpHedge = WpBase & { content: string; data: { date?: string; narrative?: string; rows?: WpHedgeRow[] } | null };
export type WpRoute = { account?: string; product?: string; qty?: string; origin?: string; destination?: string; laycan?: string; visible?: boolean };
export type WpFreight = { narrative: string; routes: WpRoute[]; modified: string };
export type WpCollection = { id: number; name: string; slug: string; parent: number; description: string; private: boolean };
export type WpProduct = { id: number; title: string; slug: string };
export type WpFile = WpBase & {
  filename: string;
  mime: string;
  bytes: number;
  missing: boolean;
  caption: string;
  description: string;
  collections: number[];
  productId: number;
  author: string;
};
export type WpEnquiry = WpBase & { content: string; payload: Record<string, string> };

export type WpExport = {
  format: "aquifert-export";
  version: number;
  site: string;
  timezone: string;
  exportedAt: string;
  download: { endpoint: string; token: string; expiresAt: string };
  telex: WpTelex[];
  indicators: WpIndicators | null;
  hedgeTables: WpHedge[];
  freight: WpFreight | null;
  toolsCommentary: string;
  collections: WpCollection[];
  products: WpProduct[];
  library: WpFile[];
  enquiries: WpEnquiry[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "");
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);
const list = <T>(value: unknown, map: (item: Record<string, unknown>) => T): T[] => (Array.isArray(value) ? value.filter(isRecord).map(map) : []);

function base(item: Record<string, unknown>): WpBase {
  return { id: num(item.id), status: str(item.status), title: str(item.title), date: str(item.date), dateGmt: str(item.dateGmt), modified: str(item.modified) };
}

function strings(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, str(item)]));
}

/** Reads the export file, filling gaps with empty values. Throws a readable message when it is not an Aquifert export. */
export function parseExport(raw: unknown): WpExport {
  if (!isRecord(raw) || raw.format !== "aquifert-export") {
    throw new Error("This is not an Aquifert export file. Download it from Tools → Aquifert export in WordPress.");
  }
  if (num(raw.version) !== 1) throw new Error(`Export format version ${str(raw.version)} is not supported. Update the Aquifert Export plugin.`);
  const download = isRecord(raw.download) ? raw.download : {};
  const indicators = isRecord(raw.indicators) ? raw.indicators : null;
  const freight = isRecord(raw.freight) ? raw.freight : null;
  const reading = (value: unknown) => {
    const item = isRecord(value) ? value : {};
    return { value: item.value === null || item.value === undefined || item.value === "" ? null : num(item.value), note: str(item.note) };
  };
  return {
    format: "aquifert-export",
    version: 1,
    site: str(raw.site),
    timezone: str(raw.timezone),
    exportedAt: str(raw.exportedAt),
    download: { endpoint: str(download.endpoint), token: str(download.token), expiresAt: str(download.expiresAt) },
    telex: list(raw.telex, (item) => ({ ...base(item), content: str(item.content), author: str(item.author), tags: Array.isArray(item.tags) ? item.tags.map(str).filter(Boolean) : [] })),
    indicators: indicators
      ? { ...base(indicators), nitrogen: reading(indicators.nitrogen), phosphate: reading(indicators.phosphate), potassium: reading(indicators.potassium) }
      : null,
    hedgeTables: list(raw.hedgeTables, (item) => ({
      ...base(item),
      content: str(item.content),
      data: isRecord(item.data)
        ? { date: str(item.data.date), narrative: str(item.data.narrative), rows: list(item.data.rows, (row) => strings(row) as WpHedgeRow) }
        : null,
    })),
    freight: freight
      ? {
          narrative: str(freight.narrative),
          modified: str(freight.modified),
          routes: list(freight.routes, (route) => ({ ...strings(route), visible: route.visible === undefined ? true : Boolean(route.visible) }) as WpRoute),
        }
      : null,
    toolsCommentary: str(raw.toolsCommentary),
    collections: list(raw.collections, (item) => ({
      id: num(item.id),
      name: str(item.name),
      slug: str(item.slug),
      parent: num(item.parent),
      description: str(item.description),
      private: Boolean(item.private),
    })),
    products: list(raw.products, (item) => ({ id: num(item.id), title: str(item.title), slug: str(item.slug) })),
    library: list(raw.library, (item) => ({
      ...base(item),
      filename: str(item.filename),
      mime: str(item.mime),
      bytes: num(item.bytes),
      missing: Boolean(item.missing),
      caption: str(item.caption),
      description: str(item.description),
      collections: Array.isArray(item.collections) ? item.collections.map(num).filter(Boolean) : [],
      productId: num(item.productId),
      author: str(item.author),
    })),
    enquiries: list(raw.enquiries, (item) => ({ ...base(item), content: str(item.content), payload: strings(item.payload) })),
  };
}

/* ---------------- Text helpers ---------------- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

const CELL = "\u0001";

/** WordPress post HTML (or Markdown-style text) to plain paragraphs. Line breaks inside a paragraph are kept. */
export function htmlToParagraphs(html: string) {
  const text = decodeEntities(
    html
      .replace(/\r\n?/g, "\n")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<tr[^>]*>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|ul|ol|table|blockquote|figure)>/gi, "\n\n")
      .replace(/<\/(li|tr)>/gi, "")
      .replace(/<\/t[dh]>/gi, CELL)
      .replace(/<[^>]+>/g, ""),
  );
  return text
    .split(/\n[ \t]*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) =>
          line
            .replace(/[ \t]+/g, " ")
            .replace(new RegExp(`\\s*${CELL}\\s*$`), "")
            .replaceAll(CELL, " | ")
            .trim(),
        )
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean);
}

export function plainText(html: string) {
  return htmlToParagraphs(html).join("\n\n");
}

/** `2026-09-28 14:05:00` to desk time `2026-09-28T14:05`. */
export function deskTime(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : value.slice(0, 16);
}

function isoDay(value: string, fallback: string) {
  const direct = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = Date.parse(value);
  if (value.trim() && Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return fallback.slice(0, 10);
}

function status(value: string): PublishStatus {
  if (value === "publish" || value === "future") return "published";
  if (value === "private") return "private";
  return "draft";
}

/* ---------------- Mappers ---------------- */

export const wpId = {
  telex: (id: number) => `wp-telex-${id}`,
  hedge: (id: number) => `wp-hedge-${id}`,
  collection: (id: number) => `wp-col-${id}`,
  file: (id: number) => `wp-file-${id}`,
  enquiry: (id: number) => `wp-enquiry-${id}`,
};

export const isWpId = (id: string) => id.startsWith("wp-");

/** WordPress accounts that are not a person members should see as the author: the site admin and the desk's test accounts. */
const DESK_ACCOUNTS = new Set(["admin", "administrator", "demo analyst", "team member", "s. bot", "a. fert", "j. market"]);

function authorName(value: string) {
  const name = decodeEntities(value).trim();
  return !name || DESK_ACCOUNTS.has(name.toLowerCase()) ? "Aquifert Desk" : name;
}

/** WordPress fills an empty Telex title with its first eight words, so that title is dropped and the hub derives it again. */
function telexHeadline(title: string, paragraphs: string[]) {
  const clean = decodeEntities(title).trim();
  if (!clean || /^\(no title\)$/i.test(clean) || /^intel update \d{4}-\d{2}-\d{2}/i.test(clean)) return "";
  const words = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean).join(" ");
  const opening = words(paragraphs.join(" ")).split(" ").slice(0, 8).join(" ");
  return words(clean) === opening ? "" : clean;
}

export function mapTelex(post: WpTelex, access: TelexAccess): TelexItem {
  const paragraphs = htmlToParagraphs(post.content);
  return {
    id: wpId.telex(post.id),
    headline: telexHeadline(post.title, paragraphs),
    paragraphs,
    tags: post.tags.map((tag) => decodeEntities(tag).trim()).filter(Boolean),
    access,
    status: status(post.status),
    author: authorName(post.author),
    publishedAt: deskTime(post.date),
    updatedAt: deskTime(post.modified || post.date),
  };
}

function direction(value: string | undefined): CurveDirection {
  const token = (value ?? "").trim().toLowerCase();
  if (["↑", "+", "up", "higher", "rise"].includes(token)) return "up";
  if (["↓", "-", "down", "lower", "fall"].includes(token)) return "down";
  return "flat";
}

/** Same grouping as the WordPress hedge table template: section rows open a section, commodity rows a column, price rows fill it. */
export function hedgeSections(postId: number, rows: WpHedgeRow[]): HedgeSection[] {
  const sections: HedgeSection[] = [];
  const prefix = wpId.hedge(postId);
  let section: HedgeSection | null = null;
  let commodity: HedgeSection["commodities"][number] | null = null;
  const ensureSection = () => {
    if (!section) {
      section = { id: `${prefix}-s${sections.length}`, label: "Direct Hedge", commodities: [] };
      sections.push(section);
    }
    return section;
  };
  for (const row of rows) {
    const type = (row.type ?? "").trim();
    if (type === "section" || type === "subsection") {
      section = { id: `${prefix}-s${sections.length}`, label: (row.label ?? "").trim() || "Section", commodities: [] };
      sections.push(section);
      commodity = null;
    } else if (type === "commodity") {
      const current = ensureSection();
      commodity = { id: `${current.id}-c${current.commodities.length}`, label: (row.label ?? "").trim() || "Commodity", index: (row.index ?? "").trim(), rows: [] };
      current.commodities.push(commodity);
    } else if (type === "price") {
      const current = ensureSection();
      if (!commodity) {
        commodity = { id: `${current.id}-c${current.commodities.length}`, label: "Market", index: "", rows: [] };
        current.commodities.push(commodity);
      }
      const period = (row.period ?? "").replace(/[^A-Za-z0-9/\-\s]/g, "").replace(/\s+/g, " ").trim() || "N/A";
      commodity.rows.push({ id: `${commodity.id}-r${commodity.rows.length}`, period, bid: (row.bid ?? "").trim(), ask: (row.ask ?? "").trim(), dir: direction(row.dir) });
    }
  }
  return sections.filter((item) => item.commodities.length > 0);
}

export function mapHedge(post: WpHedge): HedgeReport {
  const rows = post.data?.rows ?? [];
  let sections = hedgeSections(post.id, rows);
  let narrative = (post.data?.narrative ?? "").trim();
  if (sections.length === 0 && post.content.trim()) {
    const parsed = parseHedgeReport(plainText(post.content));
    sections = parsed.sections;
    narrative ||= parsed.narrative;
  }
  const title = decodeEntities(post.title).trim();
  const date = isoDay(post.data?.date ?? "", post.date);
  return {
    id: wpId.hedge(post.id),
    title: title || `Hedge table ${formatDay(date)}`,
    date,
    status: post.status === "publish" || post.status === "future" ? "published" : "draft",
    narrative,
    sections,
    updatedAt: deskTime(post.modified || post.date),
  };
}

const INDICATOR_KEYS = { Nitrogen: "nitrogen", Phosphate: "phosphate", Potassium: "potassium" } as const;

/** Updates the three dials in place of the current ones, keeping the caption the hub shows under each gauge. */
export function mapIndicators(source: WpIndicators, current: Indicator[]): Indicator[] {
  return current.map((indicator) => {
    const key = INDICATOR_KEYS[indicator.name as keyof typeof INDICATOR_KEYS];
    if (!key) return indicator;
    const reading = source[key];
    return {
      ...indicator,
      value: reading.value === null ? indicator.value : Math.max(0, Math.min(100, Math.round(reading.value))),
      note: decodeEntities(reading.note).trim() || indicator.note,
    };
  });
}

export function mapFreightFixtures(freight: WpFreight): FreightFixture[] {
  const cell = (value: string | undefined) => decodeEntities(value ?? "").trim().slice(0, 120);
  return freight.routes
    .map((route, i) => ({
      id: `wp-fx-${i}`,
      account: cell(route.account),
      product: cell(route.product),
      qty: cell(route.qty),
      origin: cell(route.origin),
      destination: cell(route.destination),
      laycan: cell(route.laycan),
      visible: route.visible !== false,
    }))
    .filter((row) => row.account || row.product || row.qty || row.origin || row.destination || row.laycan);
}

export function mapCollections(collections: WpCollection[]): Collection[] {
  const known = new Set(collections.map((item) => item.id));
  return collections.map((item) => ({
    id: wpId.collection(item.id),
    name: decodeEntities(item.name).trim() || item.slug,
    slug: item.slug,
    parentId: item.parent && known.has(item.parent) ? wpId.collection(item.parent) : null,
    description: decodeEntities(item.description).trim(),
    private: item.private,
  }));
}

/** Best guess of the plan a MemberPress product stands for, from its name. */
export function guessProductAccess(product: WpProduct): TelexAccess {
  const name = `${product.title} ${product.slug}`.toLowerCase();
  if (/enterprise/.test(name)) return "enterprise";
  if (/growth|premium|pro\b|paid/.test(name)) return "growth";
  return "growth";
}

export function mapFile(file: WpFile, productAccess: Record<string, TelexAccess>, collectionIds: Set<string>, existing?: LibraryDocument): LibraryDocument {
  const ext = file.filename.includes(".") ? file.filename.split(".").pop()!.toLowerCase() : "";
  const stem = file.filename.replace(/\.[^.]+$/, "");
  const summary = (decodeEntities(file.caption).trim() || plainText(file.description)).slice(0, 600);
  return {
    id: wpId.file(file.id),
    title: decodeEntities(file.title).trim() || stem || `File ${file.id}`,
    filename: stem || file.filename,
    collectionIds: file.collections.map(wpId.collection).filter((id) => collectionIds.has(id)),
    type: ext ? ext.toUpperCase() : (file.mime.split("/").pop() ?? "FILE").toUpperCase(),
    size: file.bytes > 0 ? formatBytes(file.bytes) : existing?.size ?? "",
    updated: formatDay((file.modified || file.date).slice(0, 10)),
    summary,
    access: file.productId > 0 ? productAccess[String(file.productId)] ?? "growth" : "public",
    private: existing?.private ?? false,
    author: authorName(file.author),
    storedName: existing?.storedName ?? null,
  };
}

/** WordPress stores GMT beside local time; enquiries keep the real moment so the inbox sorts correctly. */
export function enquiryTime(item: WpEnquiry) {
  const gmt = item.dateGmt && !item.dateGmt.startsWith("0000") ? item.dateGmt : "";
  if (gmt) return `${gmt.replace(" ", "T")}Z`;
  return `${deskTime(item.date)}:00`;
}

export function mapEnquiryPayload(item: WpEnquiry) {
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(item.payload)) {
    const clean = decodeEntities(value).trim();
    if (clean) payload[key] = clean.slice(0, 4000);
  }
  if (!Object.keys(payload).length && item.content.trim()) payload.notes = plainText(item.content).slice(0, 4000);
  payload.source = "WordPress";
  return payload;
}
