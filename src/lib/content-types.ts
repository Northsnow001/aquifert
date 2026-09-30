import type { Plan } from "@/lib/session-shared";

export type PublishStatus = "published" | "draft" | "private";
export type TelexAccess = "public" | "growth" | "enterprise";

export const TELEX_ACCESS: { value: TelexAccess; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Every member" },
  { value: "growth", label: "Growth+", hint: "Growth and Enterprise" },
  { value: "enterprise", label: "Enterprise", hint: "Enterprise only" },
];

export const PUBLISH_STATUS: { value: PublishStatus; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "private", label: "Private" },
];

export type TelexItem = {
  id: string;
  headline: string;
  paragraphs: string[];
  tags: string[];
  access: TelexAccess;
  status: PublishStatus;
  author: string;
  /** Desk time, `YYYY-MM-DDTHH:mm`, no zone. */
  publishedAt: string;
  updatedAt: string;
};

export type Indicator = {
  name: string;
  value: number;
  summary: string;
  note: string;
};

export type CurveDirection = "up" | "down" | "flat";

export type HedgeRow = { id: string; period: string; bid: string; ask: string; dir: CurveDirection };
export type HedgeCommodity = { id: string; label: string; index: string; rows: HedgeRow[] };
export type HedgeSection = { id: string; label: string; commodities: HedgeCommodity[] };

export type HedgeReport = {
  id: string;
  title: string;
  /** `YYYY-MM-DD` */
  date: string;
  status: "published" | "draft";
  narrative: string;
  sections: HedgeSection[];
  updatedAt: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  private: boolean;
};

export type LibraryDocument = {
  id: string;
  title: string;
  filename: string;
  collectionIds: string[];
  type: string;
  size: string;
  updated: string;
  summary: string;
  access: TelexAccess;
  /** Hidden from members regardless of collection. */
  private: boolean;
  author: string;
  /** Name of the uploaded file under `data/library/<id>/`, or null when only listed. */
  storedName: string | null;
};

export const FILE_ACCESS_LABEL: Record<TelexAccess, string> = { public: "Free", growth: "Growth+", enterprise: "Enterprise" };

export type FreightFixture = {
  id: string;
  account: string;
  product: string;
  qty: string;
  origin: string;
  destination: string;
  laycan: string;
  visible: boolean;
};

export type FreightBoard = {
  fixtures: FreightFixture[];
  /** Plain text. Blank lines split paragraphs, `**text**` is bold. */
  commentary: string;
  showOnHome: boolean;
  updatedAt: string | null;
};

export type ToolsCommentary = {
  /** Sanitised HTML. */
  html: string;
  updatedAt: string | null;
};

const PLAN_RANK: Record<Plan, number> = { core: 0, growth: 1, enterprise: 2 };
const ACCESS_RANK: Record<TelexAccess, number> = { public: 0, growth: 1, enterprise: 2 };

export function canReadTelex(access: TelexAccess, plan: Plan) {
  return PLAN_RANK[plan] >= ACCESS_RANK[access];
}

/** Members see a file unless it is private or every collection it sits in is private. */
export function isFileListed(file: Pick<LibraryDocument, "private" | "collectionIds">, collections: Collection[]) {
  if (file.private) return false;
  if (file.collectionIds.length === 0) return true;
  const privateIds = new Set(collections.filter((item) => item.private).map((item) => item.id));
  return file.collectionIds.some((id) => !privateIds.has(id));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Markdown reduced to its words, for headlines, excerpts and search. */
export function plainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)*\s*\|?\s*$/gm, " ")
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*•]|\d+[.)])\s+/gm, "")
    .replace(/(\*\*|__|`|\|)/g, " ")
    .replace(/(^|\s)[*_]([^*_\s][^*_]*)[*_](?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

export function telexHeadline(item: Pick<TelexItem, "headline" | "paragraphs">) {
  if (item.headline.trim()) return item.headline.trim();
  const words = plainText(item.paragraphs.join("\n\n")).split(" ").filter(Boolean);
  return words.slice(0, 8).join(" ") || "Intel update";
}

export function excerpt(paragraphs: string[], words = 22) {
  const all = plainText(paragraphs.join("\n\n")).split(" ").filter(Boolean);
  return all.length > words ? `${all.slice(0, words).join(" ")}…` : all.join(" ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, hh = "00", mm = "00"] = match;
  return { y: Number(y), m: Number(m), d: Number(d), hh, mm };
}

/** `19 Jul 2026` */
export function formatDay(value: string) {
  const p = parts(value);
  if (!p) return value;
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** `Mon · 28 Sep 2026` */
export function formatTelexDay(value: string) {
  const p = parts(value);
  if (!p) return value;
  const weekday = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  return `${weekday} · ${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** `28 Sep 2026, 03:58` */
export function formatStamp(value: string) {
  const p = parts(value);
  if (!p) return value;
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}, ${p.hh}:${p.mm}`;
}

/** Collections in parent → child order, alphabetical within each level. */
export function collectionTree(collections: Collection[]) {
  const out: { item: Collection; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    collections
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        out.push({ item, depth });
        walk(item.id, depth + 1);
      });
  };
  walk(null, 0);
  const seen = new Set(out.map((row) => row.item.id));
  collections.filter((item) => !seen.has(item.id)).forEach((item) => out.push({ item, depth: 0 }));
  return out;
}

export function deskNow() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const DIRECTION_MARK: Record<CurveDirection, string> = { up: "↑", down: "↓", flat: "→" };

export function hedgePeriods(section: HedgeSection) {
  const seen = new Map<string, string>();
  for (const commodity of section.commodities) {
    for (const row of commodity.rows) {
      const key = row.period.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, row.period.trim());
    }
  }
  return Array.from(seen, ([key, label]) => ({ key, label }));
}

export function hedgeRowCount(section: HedgeSection) {
  return section.commodities.reduce((total, commodity) => total + commodity.rows.length, 0);
}

function direction(token: string | undefined): CurveDirection {
  const value = (token ?? "").trim().toLowerCase();
  if (["↑", "+", "up", "higher", "rise", "firmer"].includes(value)) return "up";
  if (["↓", "-", "down", "lower", "fall", "softer"].includes(value)) return "down";
  return "flat";
}

const PRICE = /^[-•*]?\s*([A-Za-z][A-Za-z0-9/\- .]*?):?\s+\$?([\d.,]+)\s*\/{1,2}\s*\$?([\d.,]+)\s*(↑|↓|→|~|\+|-|up|down|flat|higher|lower)?\s*$/i;
const OFFER = /^[-•*]?\s*([A-Za-z][A-Za-z0-9/\- .]*?):?\s+\$?([\d.,]+)\s+(offer|offered|bid)\s*$/i;
const INDEX = /^(.+?)\s*(?:[–—-]\s*|\(\s*)(?:latest\s+)?index(?:\s+value)?\s*:?\s*([\d.,]+)\)?.*$/i;

function isHeader(line: string) {
  if (PRICE.test(line) || OFFER.test(line)) return false;
  if (INDEX.test(line)) return true;
  const clean = line.replace(/:$/, "").trim();
  return clean.length > 0 && clean.length <= 48 && !/[.;!?]$/.test(clean) && /^[A-Za-z][A-Za-z0-9\s()&/.+-]*$/.test(clean);
}

/**
 * Reads a pasted desk report. Plain header lines followed by another header open a section,
 * `Name – index 890` or a header followed by prices opens a commodity, and `Aug 820/870 ↑`
 * lines are prices. Sentences before the first table become the narrative.
 */
export function parseHedgeReport(text: string): { sections: HedgeSection[]; narrative: string; prices: number } {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const sections: HedgeSection[] = [];
  const narrative: string[] = [];
  let section: HedgeSection | null = null;
  let commodity: HedgeCommodity | null = null;
  let prices = 0;

  const nextContent = (from: number) => {
    for (let i = from + 1; i < lines.length; i += 1) if (lines[i]) return lines[i];
    return "";
  };
  const ensureSection = () => {
    if (!section) {
      section = { id: newId("sec"), label: "Direct Hedge", commodities: [] };
      sections.push(section);
    }
    return section;
  };

  lines.forEach((line, i) => {
    if (!line) {
      if (sections.length === 0 && narrative.length > 0) narrative.push("");
      return;
    }
    if (/^(paper|phys|physical):?$/i.test(line)) return;

    const price = line.match(PRICE);
    const offer = price ? null : line.match(OFFER);
    if ((price || offer) && commodity) {
      const [, period, a, b, dir] = price ?? [];
      commodity.rows.push(
        price
          ? { id: newId("row"), period: period.trim(), bid: a, ask: b, dir: direction(dir) }
          : {
              id: newId("row"),
              period: offer![1].trim(),
              bid: /bid/i.test(offer![3]) ? offer![2] : "",
              ask: /bid/i.test(offer![3]) ? "" : offer![2],
              dir: "flat",
            },
      );
      prices += 1;
      return;
    }

    if (isHeader(line)) {
      const indexed = line.match(INDEX);
      if (!indexed && isHeader(nextContent(i))) {
        section = { id: newId("sec"), label: line.replace(/:$/, "").trim(), commodities: [] };
        sections.push(section);
        commodity = null;
        return;
      }
      commodity = {
        id: newId("com"),
        label: (indexed ? indexed[1] : line).replace(/:$/, "").trim(),
        index: indexed ? `Index ${indexed[2]}` : "",
        rows: [],
      };
      ensureSection().commodities.push(commodity);
      return;
    }

    if (sections.length === 0) narrative.push(line);
  });

  return {
    sections: sections.filter((item) => item.commodities.length > 0),
    narrative: narrative.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    prices,
  };
}
