import { collectionTree, type Collection, type LibraryDocument, type TelexAccess } from "@/lib/content-types";
import { productOf, type TelexProduct } from "@/lib/aq-modules/types";

/** A listed file with what the viewer needs to render it. */
export type LibraryFile = LibraryDocument & {
  readable: boolean;
  /** `YYYY-MM-DD` from `updated`, empty when it cannot be read. */
  day: string;
  collectionNames: string[];
};

export type LibrarySort = "newest" | "oldest" | "az";

export type LibraryFilters = {
  q: string;
  collection: string;
  year: string;
  access: TelexAccess | "";
  sort: LibrarySort;
  page: number;
};

export const PAGE_SIZE = 10;
export const DESK_HREF = "/hub/contact?topic=Library%20access";

export const SORTS: { value: LibrarySort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "az", label: "A–Z" },
];

export const ACCESS_OPTIONS: { value: TelexAccess; label: string }[] = [
  { value: "public", label: "Free" },
  { value: "growth", label: "Growth+" },
  { value: "enterprise", label: "AQ Zero" },
];

const UNLOCK = {
  growth: { plan: "growth", label: "Growth" },
  enterprise: { plan: "enterprise", label: "AQ Zero" },
} as const;

export function unlockFor(access: TelexAccess) {
  const target = UNLOCK[access === "enterprise" ? "enterprise" : "growth"];
  return { label: target.label, href: `/hub/membership?plan=${target.plan}&from=library` };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (value: number | string) => String(value).padStart(2, "0");

/** Reads `2026-09-17` or `17 Sep 2026` into a sortable `YYYY-MM-DD`. */
export function dayKey(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = value.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})/);
  const month = dmy ? MONTHS.indexOf(dmy[2].toLowerCase()) : -1;
  if (dmy && month >= 0) return `${dmy[3]}-${pad(month + 1)}-${pad(dmy[1])}`;
  const year = value.match(/\b(\d{4})\b/);
  return year ? `${year[1]}-00-00` : "";
}

export const hasValue = (value: string) => Boolean(value && value.trim() && value.trim() !== "—");

export const fileProduct = (file: LibraryFile): TelexProduct => productOf(`${file.title} ${file.collectionNames.join(" ")}`);

export function fileFacts(file: Pick<LibraryFile, "type" | "size">) {
  return [file.type, file.size].filter(hasValue).join(" · ");
}

export function isPdf(file: Pick<LibraryFile, "type" | "storedName">) {
  return file.type.trim().toUpperCase() === "PDF" || Boolean(file.storedName?.toLowerCase().endsWith(".pdf"));
}

/** Collections that hold files, directly or through a child, with their tree depth. */
export function shelfTree(collections: Collection[], files: LibraryFile[]) {
  const used = new Set(files.flatMap((file) => file.collectionIds));
  const byId = new Map(collections.map((item) => [item.id, item]));
  const keep = new Set<string>();
  for (const id of used) {
    let current = byId.get(id);
    while (current && !keep.has(current.id)) {
      keep.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  return collectionTree(collections.filter((item) => keep.has(item.id)));
}

function withChildren(collections: Collection[], id: string) {
  const ids = new Set<string>();
  const add = (next: string) => {
    if (ids.has(next)) return;
    ids.add(next);
    for (const item of collections) if (item.parentId === next) add(item.id);
  };
  add(id);
  return ids;
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function readFilters(raw: RawParams, collections: Collection[], years: string[]): LibraryFilters {
  const collection = first(raw.collection);
  const year = first(raw.year);
  const access = first(raw.access);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).slice(0, 120),
    collection: collections.some((item) => item.id === collection) ? collection : "",
    year: years.includes(year) ? year : "",
    access: ACCESS_OPTIONS.some((item) => item.value === access) ? (access as TelexAccess) : "",
    sort: SORTS.some((item) => item.value === sort) ? (sort as LibrarySort) : "newest",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

export const isFiltered = (filters: LibraryFilters) => Boolean(filters.q.trim() || filters.collection || filters.year || filters.access);

export function libraryHref(filters: Partial<LibraryFilters>) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q);
  if (filters.collection) params.set("collection", filters.collection);
  if (filters.year) params.set("year", filters.year);
  if (filters.access) params.set("access", filters.access);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/hub/library?${query}` : "/hub/library";
}

export function sortFiles(files: LibraryFile[], sort: LibrarySort) {
  const byTitle = (a: LibraryFile, b: LibraryFile) => a.title.localeCompare(b.title);
  return [...files].sort((a, b) => {
    if (sort === "az") return byTitle(a, b);
    const order = sort === "oldest" ? a.day.localeCompare(b.day) : b.day.localeCompare(a.day);
    return order || byTitle(a, b);
  });
}

export function matchFiles(files: LibraryFile[], filters: LibraryFilters, collections: Collection[]) {
  const scope = filters.collection ? withChildren(collections, filters.collection) : null;
  const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return files.filter((file) => {
    if (scope && !file.collectionIds.some((id) => scope.has(id))) return false;
    if (filters.year && !file.day.startsWith(`${filters.year}-`)) return false;
    if (filters.access && file.access !== filters.access) return false;
    if (!words.length) return true;
    const haystack = [file.title, file.summary, file.filename, ...file.collectionNames].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
