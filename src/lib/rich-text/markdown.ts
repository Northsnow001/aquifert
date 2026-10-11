/**
 * The desk's article format: Markdown with a few additions the admin editor's toolbar writes.
 *
 *   **bold**  _italic_  ++underline++  ~~strike~~  ==highlight==  `code`
 *   [text]{.red}         colour from TEXT_COLORS
 *   P~2~O~5~  m^3^       subscript and superscript, written straight after a letter or digit
 *   ## Heading {.center} alignment (center, right, justify) at the end of a heading or paragraph
 *   a) item  b) item     lettered lists, alongside - bullets and 1. numbers; two spaces nest a level
 *   \*  \#  \|           a backslash keeps a character literal
 *
 * One parser feeds the member pages, the editor and plain text for excerpts and search, so all three
 * always agree on what an article says.
 */

export type Align = "left" | "center" | "right" | "justify";

export const TEXT_COLORS = {
  red: { label: "Red", hex: "#c0392b" },
  amber: { label: "Amber", hex: "#b45309" },
  green: { label: "Green", hex: "#15803d" },
  blue: { label: "Blue", hex: "#1d4ed8" },
  grey: { label: "Grey", hex: "#64748b" },
} as const;
export type TextColor = keyof typeof TEXT_COLORS;
export const isTextColor = (value: string): value is TextColor => Object.hasOwn(TEXT_COLORS, value);

export const HIGHLIGHT_HEX = "#fde68a";

export type Inline =
  | { t: "text"; v: string }
  | { t: "br" }
  | { t: "code"; v: string }
  | { t: "img"; src: string; alt: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "color"; color: TextColor; c: Inline[] }
  | { t: "strong" | "em" | "u" | "s" | "mark" | "sup" | "sub"; c: Inline[] };

export type ListKind = "ul" | "ol" | "a" | "A";
export type ListItem = { kind: ListKind; depth: number; n: number; c: Inline[] };

export type Block =
  | { t: "p"; align?: Align; c: Inline[] }
  | { t: "h"; level: 1 | 2 | 3; align?: Align; c: Inline[] }
  | { t: "list"; items: ListItem[] }
  | { t: "quote"; c: Inline[] }
  | { t: "pre"; v: string }
  | { t: "hr" }
  | { t: "table"; align: Align[]; head: Inline[][]; rows: Inline[][][] };

/* ---------------- Inline ---------------- */

const NESTED = String.raw`(?:[^[\]\\]|\\.|\[[^\]]*\])+`;
const INLINE = new RegExp(
  [
    String.raw`\\(?<esc>[\\${"`"}*_{}[\]()#+\-.!|~^=>•])`,
    String.raw`!\[(?<imgAlt>[^\]]*)\]\((?<imgSrc>https:\/\/[^\s)]+)\)`,
    String.raw`\[(?<linkText>${NESTED})\]\((?<linkHref>(?:https?:\/\/|mailto:)[^\s)]+)\)`,
    String.raw`\[(?<colorText>${NESTED})\]\{\.(?<color>${Object.keys(TEXT_COLORS).join("|")})\}`,
    "`(?<code>[^`]+)`",
    String.raw`\*\*\*(?<strongEm>(?=\S)[\s\S]*?\S)\*\*\*`,
    String.raw`\*\*(?<strong>(?=\S)[\s\S]*?\S)\*\*`,
    String.raw`__(?<strong2>(?=\S)[\s\S]*?\S)__`,
    String.raw`\+\+(?<u>(?=\S)[\s\S]*?\S)\+\+`,
    String.raw`~~(?<s>(?=\S)[\s\S]*?\S)~~`,
    String.raw`==(?<mark>(?=\S)[\s\S]*?\S)==`,
    String.raw`(?<=[\p{L}\p{N})\]*_])\^(?<sup>[^\s^]+)\^`,
    String.raw`(?<=[\p{L}\p{N})\]*_])~(?<sub>[^\s~]+)~`,
    String.raw`\*(?<em>(?=[^\s*])[^*]*?[^\s*])\*`,
    String.raw`(?<![\p{L}\p{N}_\\])_(?<em2>(?=[^\s_])[^_]*?[^\s_])_(?![\p{L}\p{N}_])`,
  ].join("|"),
  "gu",
);

function pushText(out: Inline[], v: string) {
  if (!v) return;
  const last = out[out.length - 1];
  if (last?.t === "text") last.v += v;
  else out.push({ t: "text", v });
}

/** One line of inline Markdown. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = new RegExp(INLINE.source, INLINE.flags);
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    pushText(out, text.slice(last, match.index));
    last = match.index + match[0].length;
    const g = match.groups ?? {};
    if (g.esc !== undefined) pushText(out, g.esc);
    else if (g.imgSrc !== undefined) out.push({ t: "img", src: g.imgSrc, alt: g.imgAlt ?? "" });
    else if (g.linkHref !== undefined) out.push({ t: "link", href: g.linkHref, c: parseInline(g.linkText ?? "") });
    else if (g.color !== undefined) out.push({ t: "color", color: g.color as TextColor, c: parseInline(g.colorText ?? "") });
    else if (g.code !== undefined) out.push({ t: "code", v: g.code });
    else if (g.strongEm !== undefined) out.push({ t: "strong", c: [{ t: "em", c: parseInline(g.strongEm) }] });
    else if (g.strong !== undefined || g.strong2 !== undefined) out.push({ t: "strong", c: parseInline(g.strong ?? g.strong2 ?? "") });
    else if (g.u !== undefined) out.push({ t: "u", c: parseInline(g.u) });
    else if (g.s !== undefined) out.push({ t: "s", c: parseInline(g.s) });
    else if (g.mark !== undefined) out.push({ t: "mark", c: parseInline(g.mark) });
    else if (g.sup !== undefined) out.push({ t: "sup", c: parseInline(g.sup) });
    else if (g.sub !== undefined) out.push({ t: "sub", c: parseInline(g.sub) });
    else out.push({ t: "em", c: parseInline(g.em ?? g.em2 ?? "") });
  }
  pushText(out, text.slice(last));
  return out;
}

/* ---------------- Blocks ---------------- */

const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*```/;
const ALIGN_TAIL = /\s*(?<!\\)\{\.(center|right|justify)\}\s*$/;
const BULLET = /^(\s*)([-*•])\s+(.*)$/;
const NUMBER = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const LETTER = /^(\s*)([a-zA-Z])([.)])\s+(.*)$/;

export const isRule = (line: string) => RULE.test(line);
const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isSeparator = (line: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

/** Table cells, split on pipes a backslash does not escape. */
export function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());
}

function cellAlign(cell: string): Align {
  return cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left";
}

const depthOf = (indent: string) => Math.min(3, Math.floor(indent.replace(/\t/g, "    ").length / 2));

/**
 * The list item starting this line, if any. "a." only counts inside a list or when the next line is
 * lettered too, so a sentence opening with an initial ("A. Smith said") stays a paragraph.
 */
function listItem(lines: string[], i: number, inList: boolean): ListItem | null {
  const line = lines[i];
  if (isRule(line)) return null;
  const bullet = line.match(BULLET);
  if (bullet) return { kind: "ul", depth: depthOf(bullet[1]), n: 1, c: parseInline(bullet[3]) };
  const number = line.match(NUMBER);
  if (number) return { kind: "ol", depth: depthOf(number[1]), n: Number(number[2]), c: parseInline(number[3]) };
  const letter = line.match(LETTER);
  if (letter && (letter[3] === ")" || inList || LETTER.test(lines[i + 1] ?? ""))) {
    const upper = letter[2] === letter[2].toUpperCase();
    return { kind: upper ? "A" : "a", depth: depthOf(letter[1]), n: letter[2].toLowerCase().charCodeAt(0) - 96, c: parseInline(letter[4]) };
  }
  return null;
}

function startsBlock(lines: string[], i: number) {
  const line = lines[i];
  return HEADING.test(line) || FENCE.test(line) || line.trim().startsWith(">") || isTableRow(line) || isRule(line) || listItem(lines, i, false) !== null;
}

function withBreaks(lines: string[]): Inline[] {
  const out: Inline[] = [];
  lines.forEach((line, n) => {
    if (n > 0) out.push({ t: "br" });
    out.push(...parseInline(line));
  });
  return out;
}

export function parseMarkdown(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (FENCE.test(line)) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i += 1;
      out.push({ t: "pre", v: code.join("\n") });
      continue;
    }

    if (isRule(line)) {
      out.push({ t: "hr" });
      i += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const align = heading[2].match(ALIGN_TAIL)?.[1] as Align | undefined;
      const level = Math.min(3, heading[1].length) as 1 | 2 | 3;
      out.push({ t: "h", level, align, c: parseInline(heading[2].replace(ALIGN_TAIL, "")) });
      i += 1;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const head = tableCells(line);
      const align = tableCells(lines[i + 1]).map(cellAlign);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(tableCells(lines[i++]).map(parseInline));
      out.push({ t: "table", align, head: head.map(parseInline), rows });
      continue;
    }

    const first = listItem(lines, i, false);
    if (first) {
      const items: ListItem[] = [first];
      i += 1;
      for (;;) {
        let j = i;
        while (j < lines.length && !lines[j].trim()) j += 1;
        const next = j < lines.length ? listItem(lines, j, true) : null;
        if (!next) break;
        items.push(next);
        i = j + 1;
      }
      out.push({ t: "list", items });
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push({ t: "quote", c: withBreaks(quote) });
      continue;
    }

    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) paragraph.push(lines[i++]);
    const tail = paragraph[paragraph.length - 1];
    const align = tail.match(ALIGN_TAIL)?.[1] as Align | undefined;
    if (align) paragraph[paragraph.length - 1] = tail.replace(ALIGN_TAIL, "");
    out.push({ t: "p", align, c: withBreaks(paragraph) });
  }
  return out;
}

/* ---------------- Plain text ---------------- */

export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.t === "text" || node.t === "code") return node.v;
      if (node.t === "br") return " ";
      if (node.t === "img") return node.alt;
      return inlineText(node.c);
    })
    .join("");
}

/** The words of an article, for headlines, excerpts and search. */
export function markdownText(markdown: string): string {
  return parseMarkdown(markdown)
    .map((block) => {
      if (block.t === "p" || block.t === "h" || block.t === "quote") return inlineText(block.c);
      if (block.t === "list") return block.items.map((item) => inlineText(item.c)).join(" ");
      if (block.t === "table") return [...block.head, ...block.rows.flat()].map(inlineText).join(" ");
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------- Lists ---------------- */

export type ListTree = { kind: ListKind; start: number; items: { c: Inline[]; children: ListTree[] }[] };

/** Flat items with depths, folded into nested lists. A change of marker at the same depth starts a new list. */
export function listTrees(items: ListItem[]): ListTree[] {
  const trees: ListTree[] = [];
  let i = 0;
  const build = (depth: number): ListTree => {
    const tree: ListTree = { kind: items[i].kind, start: items[i].n, items: [] };
    while (i < items.length && items[i].depth >= depth) {
      const item = items[i];
      if (item.depth > depth) {
        const host = tree.items[tree.items.length - 1];
        if (host) host.children.push(build(item.depth));
        else tree.items.push({ c: [], children: [build(item.depth)] });
        continue;
      }
      if (item.kind !== tree.kind) break;
      tree.items.push({ c: item.c, children: [] });
      i += 1;
    }
    return tree;
  };
  while (i < items.length) trees.push(build(items[i].depth));
  return trees;
}

export function listMarker(kind: ListKind, n: number) {
  if (kind === "ul") return "-";
  if (kind === "ol" || n > 26) return `${n}.`;
  const letter = String.fromCharCode(96 + n);
  return `${kind === "A" ? letter.toUpperCase() : letter})`;
}
