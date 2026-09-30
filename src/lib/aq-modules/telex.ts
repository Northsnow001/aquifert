import { canReadTelex, excerpt, telexHeadline, type TelexItem } from "@/lib/content-types";
import { productOf, toneOf, type TelexProduct, type Tone } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

export type TelexView = {
  id: string;
  headline: string;
  excerpt: string;
  paragraphs: string[];
  tags: string[];
  product: TelexProduct;
  tone: Tone;
  access: TelexItem["access"];
  publishedAt: string;
  /** False when the member's plan does not include this flash. */
  readable: boolean;
};

export function telexView(item: TelexItem, plan: Plan | "all"): TelexView {
  const headline = telexHeadline(item);
  const text = `${headline} ${item.paragraphs.join(" ")}`;
  const product = productOf(`${item.tags.join(" ")} ${headline}`);
  return {
    id: item.id,
    headline,
    excerpt: excerpt(item.paragraphs, 34),
    paragraphs: item.paragraphs,
    tags: item.tags,
    product: product === "General" ? productOf(text) : product,
    tone: toneOf(text),
    access: item.access,
    publishedAt: item.publishedAt,
    readable: plan === "all" || canReadTelex(item.access, plan),
  };
}

/** Published flashes, newest first. */
export function publishedTelex(items: TelexItem[], plan: Plan | "all") {
  return items
    .filter((item) => item.status === "published")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((item) => telexView(item, plan));
}

export function groupByDay(items: TelexView[]) {
  const map = new Map<string, TelexView[]>();
  for (const item of items) {
    const day = item.publishedAt.slice(0, 10);
    map.set(day, [...(map.get(day) ?? []), item]);
  }
  return [...map.entries()];
}
