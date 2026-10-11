import { inlineText, type Block, type Inline, type ListItem } from "@/lib/rich-text/markdown";

/**
 * House style for articles the author did not format. Runs on the parsed article when members read
 * it; the stored text is never changed.
 *
 * Always: lines written as a run of short points, or short paragraphs after a "…:" lead-in, become a
 * list.
 *
 * Only when the author used no headings, emphasis, colour, quotes or tables (an unformatted article):
 * tidy typography (sentence capitals, a lone "i", doubled words, spaces before punctuation, spaced
 * dashes), split very long paragraphs at sentence ends, promote short title lines to headings, open
 * with a lede, set a standalone question apart, and bold prices such as USD 390 CFR or 320 FOB.
 */
export function polishBlocks(input: Block[]): Block[] {
  const plain = isUnformatted(input);
  let blocks = listsFromParagraphs(listsFromLines(input));
  if (!plain) return blocks;

  blocks = blocks.map((block) => mapText(block, tidy));
  blocks = blocks.flatMap((block) => (block.t === "p" && !block.align && !block.c.some((node) => node.t === "br") ? splitLong(block.c).map((c): Block => ({ t: "p", c })) : [block]));
  blocks = blocks.map((block, i): Block => (block.t === "p" && isTitleLine(block, blocks[i + 1]) ? { t: "h", level: 2, c: stripColon(block.c) } : block));

  const body = blocks.filter((block) => block.t !== "h").length;
  blocks = blocks.map((block, i): Block => {
    if (block.t !== "p" || block.align || body < 3) return block;
    const text = inlineText(block.c).trim();
    const words = wordCount(text);
    if (i === 0 && words >= 12 && words <= 90) return { ...block, role: "lede" };
    if (i > 0 && text.endsWith("?") && words <= 45 && !block.c.some((node) => node.t === "br")) return { ...block, role: "callout" };
    return block;
  });

  return boldPrices(blocks);
}

/* ---------------- What the author did ---------------- */

const EMPHASIS = new Set(["strong", "em", "u", "s", "mark", "color"]);

function hasEmphasis(nodes: Inline[]): boolean {
  return nodes.some((node) => EMPHASIS.has(node.t) || ("c" in node && hasEmphasis(node.c)));
}

function isUnformatted(blocks: Block[]) {
  return blocks.every((block) => {
    if (block.t === "h" || block.t === "quote" || block.t === "table" || block.t === "pre") return false;
    if (block.t === "p") return !hasEmphasis(block.c);
    if (block.t === "list") return block.items.every((item) => !hasEmphasis(item.c));
    return true;
  });
}

/* ---------------- Lists ---------------- */

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

function splitLines(nodes: Inline[]): Inline[][] {
  const lines: Inline[][] = [[]];
  for (const node of nodes) {
    if (node.t === "br") lines.push([]);
    else lines[lines.length - 1].push(node);
  }
  return lines;
}

function joinLines(lines: Inline[][]): Inline[] {
  return lines.flatMap((line, n) => (n ? [{ t: "br" } as Inline, ...line] : line));
}

const endsWithColon = (nodes: Inline[]) => inlineText(nodes).trim().endsWith(":");

/** A line that reads as one point: short, starting like a sentence, not trailing into the next line. */
function isPoint(nodes: Inline[], maxWords = 30) {
  const text = inlineText(nodes).trim();
  return Boolean(text) && wordCount(text) <= maxWords && /^["“'(\p{Lu}\p{N}$€£]/u.test(text) && !/[:,;]$/.test(text);
}

const bullets = (lines: Inline[][]): Block => ({ t: "list", items: lines.map((c): ListItem => ({ kind: "ul", depth: 0, n: 1, c })) });

/** A paragraph whose lines are a run of points, with or without a "…:" line before them. */
function listsFromLines(blocks: Block[]): Block[] {
  return blocks.flatMap((block, i): Block[] => {
    if (block.t !== "p" || block.align || !block.c.some((node) => node.t === "br")) return [block];
    const lines = splitLines(block.c);
    const previous = blocks[i - 1];
    const introduced = previous?.t === "p" && endsWithColon(previous.c);
    const start = lines.length >= 3 && endsWithColon(lines[0]) ? 1 : 0;
    let end = start;
    while (end < lines.length && isPoint(lines[end])) end += 1;
    if (end - start < (start || introduced ? 2 : 3)) return [block];
    const out: Block[] = [];
    if (start) out.push({ t: "p", c: lines[0] });
    out.push(bullets(lines.slice(start, end)));
    if (end < lines.length) out.push({ t: "p", c: joinLines(lines.slice(end)) });
    return out;
  });
}

/** Short one-line paragraphs after a "…:" lead-in. */
function listsFromParagraphs(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    out.push(block);
    if (block.t !== "p" || !endsWithColon(block.c)) continue;
    let end = i + 1;
    const run: Inline[][] = [];
    for (; end < blocks.length; end++) {
      const next = blocks[end];
      if (next.t !== "p" || next.align || next.c.some((node) => node.t === "br") || !isPoint(next.c, 20)) break;
      run.push(next.c);
    }
    if (run.length >= 2) {
      out.push(bullets(run));
      i = end - 1;
    }
  }
  return out;
}

/* ---------------- Typography ---------------- */

const ABBREVIATION = String.raw`(?<!\b(?:\p{Lu}|Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e|approx|No|Co|Ltd|Inc|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec))`;
const SENTENCE_LOWER = new RegExp(String.raw`${ABBREVIATION}(?<![.]{2})([.!?]["”]?\s+)(\p{Ll})`, "gu");
const SENTENCE_END = new RegExp(String.raw`${ABBREVIATION}(?<![.]{2})[.!?]["”]?(?=\s+["“(]?[\p{Lu}\p{N}])`, "gu");
const DOUBLED = /\b([A-Za-z]{2,})\s+\1\b/gi;
const KEEP_DOUBLED = new Set(["had", "that", "is", "do", "very", "so", "no", "bye", "ha", "far"]);

function tidy(text: string, first: boolean) {
  let out = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/(\S)\s+([!?;,])(?=\s|$)/g, "$1$2")
    .replace(/(\S) -{1,2} (?=\S)/g, "$1 – ")
    .replace(/(^|[\s(“"])i(?=(?:'[a-z]+)?(?:[\s,!?;:]|$))/g, "$1I")
    .replace(DOUBLED, (match: string, word: string) => (KEEP_DOUBLED.has(word.toLowerCase()) || match.split(/\s+/)[0] !== match.split(/\s+/)[1] ? match : word))
    .replace(SENTENCE_LOWER, (_, gap: string, letter: string) => `${gap}${letter.toUpperCase()}`);
  if (first) out = out.replace(/^(\s*["“(]?)(\p{Ll})(?=\p{Ll}*\s)/u, (_, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`);
  return out;
}

/** Applies `fn` to the text of a block, outside code and links. `first` marks the opening text of a paragraph or item. */
function mapText(block: Block, fn: (text: string, first: boolean) => string): Block {
  const walk = (nodes: Inline[], first: boolean): Inline[] =>
    nodes.map((node, n) => {
      if (node.t === "text") return { t: "text", v: fn(node.v, first && n === 0) };
      if (node.t === "link" || node.t === "code" || node.t === "img" || node.t === "br") return node;
      return { ...node, c: walk(node.c, first && n === 0) };
    });
  if (block.t === "p" || block.t === "h" || block.t === "quote") return { ...block, c: walk(block.c, true) };
  if (block.t === "list") return { ...block, items: block.items.map((item) => ({ ...item, c: walk(item.c, true) })) };
  return block;
}

/* ---------------- Paragraphs ---------------- */

/** A paragraph over 90 words, cut at sentence ends into parts of roughly 60. */
function splitLong(nodes: Inline[]): Inline[][] {
  const total = wordCount(inlineText(nodes));
  if (total <= 90) return [nodes];
  const target = total / Math.ceil(total / 65);
  const parts: Inline[][] = [[]];
  let inPart = 0;
  let done = 0;
  for (const node of nodes) {
    if (node.t !== "text") {
      parts[parts.length - 1].push(node);
      const words = wordCount(inlineText([node]));
      inPart += words;
      done += words;
      continue;
    }
    const pattern = new RegExp(SENTENCE_END.source, SENTENCE_END.flags);
    let last = 0;
    let counted = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(node.v))) {
      const end = match.index + match[0].length;
      const words = wordCount(node.v.slice(counted, end));
      counted = end;
      inPart += words;
      done += words;
      if (inPart >= target && total - done >= 25) {
        parts[parts.length - 1].push({ t: "text", v: node.v.slice(last, end) });
        parts.push([]);
        inPart = 0;
        last = end;
        while (/\s/.test(node.v[last] ?? "")) last += 1;
        counted = last;
        pattern.lastIndex = last;
      }
    }
    const tail = wordCount(node.v.slice(counted));
    inPart += tail;
    done += tail;
    const rest = node.v.slice(last);
    if (rest) parts[parts.length - 1].push({ t: "text", v: rest });
  }
  return parts.filter((part) => inlineText(part).trim());
}

/** A short line standing alone above more text, written as a title: "Market outlook", "INDIA:". */
function isTitleLine(block: Block & { t: "p" }, next: Block | undefined) {
  if (block.align || block.c.some((node) => node.t !== "text") || !next) return false;
  const text = inlineText(block.c).trim();
  if (!text || wordCount(text) > 8 || /[.,;!?]$/.test(text) || /^[\d$€£]|^(USD|EUR)\b/.test(text)) return false;
  if (!/^\p{Lu}/u.test(text)) return false;
  const after = next.t === "p" ? wordCount(inlineText(next.c)) : next.t === "list" ? 3 : 0;
  return after >= (next.t === "list" ? 3 : 12);
}

function stripColon(nodes: Inline[]): Inline[] {
  const last = nodes[nodes.length - 1];
  return last?.t === "text" ? [...nodes.slice(0, -1), { t: "text", v: last.v.replace(/\s*:\s*$/, "") }] : nodes;
}

/* ---------------- Prices ---------------- */

const AMOUNT = String.raw`\d[\d,]*(?:\.\d+)?(?:\s?[-–]\s?\d[\d,]*(?:\.\d+)?)?`;
const UNIT = String.raw`(?:\s?\/\s?(?:Mt|mt|MT|t|tonne|ton)\b)?`;
const TERM = String.raw`(?:CFR|FOB|EXW|CIF|CPT|DAP|FCA|FOT|DDP)\b`;
const PRICE = new RegExp(String.raw`(?:(?:USD|US\$|\$|EUR|€|GBP|£|RMB|CNY|INR)\s?${AMOUNT}${UNIT}(?:\s${TERM})?|\b${AMOUNT}${UNIT}\s${TERM})`, "g");
const MAX_PRICES = 20;

function priceNodes(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(PRICE.source, PRICE.flags))) {
    const at = match.index ?? 0;
    if (at > last) out.push({ t: "text", v: text.slice(last, at) });
    out.push({ t: "strong", c: [{ t: "text", v: match[0] }] });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

function boldPrices(blocks: Block[]): Block[] {
  const count = blocks.reduce((sum, block) => {
    const text = block.t === "p" || block.t === "quote" ? inlineText(block.c) : block.t === "list" ? block.items.map((item) => inlineText(item.c)).join(" ") : "";
    return sum + (text.match(new RegExp(PRICE.source, PRICE.flags))?.length ?? 0);
  }, 0);
  if (!count || count > MAX_PRICES) return blocks;
  const walk = (nodes: Inline[]): Inline[] => nodes.flatMap((node) => (node.t === "text" ? priceNodes(node.v) : node));
  return blocks.map((block) => {
    if (block.t === "p" || block.t === "quote") return { ...block, c: walk(block.c) };
    if (block.t === "list") return { ...block, items: block.items.map((item) => ({ ...item, c: walk(item.c) })) };
    return block;
  });
}
