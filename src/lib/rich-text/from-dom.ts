import { TEXT_COLORS, isRule, listMarker, type Align, type ListKind, type TextColor } from "@/lib/rich-text/markdown";

/**
 * Turns the editor's page, or HTML pasted from Word, WPS, Google Docs or a web page, back into the
 * desk's Markdown. Only what the format can say survives: structure, emphasis, palette colours,
 * highlight, links, https images and tables. Fonts, sizes and stray styles fall away, so a pasted
 * document comes out looking like every other article.
 */

const ELEMENT = 1;
const TEXT = 3;

const SKIP = new Set(["SCRIPT", "STYLE", "HEAD", "TITLE", "META", "LINK", "TEMPLATE", "NOSCRIPT", "IFRAME", "OBJECT", "SVG", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "XML"]);
const BLOCKS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "HR", "TABLE", "SECTION", "ARTICLE", "MAIN", "HEADER", "FOOTER", "ASIDE", "NAV", "FIGURE", "FIGCAPTION", "CENTER", "DL", "DT", "DD", "ADDRESS", "BODY", "HTML", "TR", "TD", "TH", "THEAD", "TBODY", "TFOOT", "CAPTION"]);
const CONTAINERS = new Set(["DIV", "SECTION", "ARTICLE", "MAIN", "HEADER", "FOOTER", "ASIDE", "NAV", "FIGURE", "CENTER", "BODY", "HTML", "DL", "ADDRESS"]);

const isElement = (node: Node): node is HTMLElement => node.nodeType === ELEMENT;
const isBlock = (node: Node) => isElement(node) && BLOCKS.has(node.tagName.toUpperCase());

/* ---------------- Colours ---------------- */

function rgb(value: string | null | undefined): [number, number, number] | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const fn = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (fn) {
    if (fn[4] !== undefined && parseFloat(fn[4]) === 0) return null;
    return [Number(fn[1]), Number(fn[2]), Number(fn[3])];
  }
  const named: Record<string, [number, number, number]> = { red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0], orange: [255, 165, 0], gray: [128, 128, 128], grey: [128, 128, 128], purple: [128, 0, 128], navy: [0, 0, 128], teal: [0, 128, 128], olive: [128, 128, 0], maroon: [128, 0, 0], lime: [0, 255, 0], aqua: [0, 255, 255], fuchsia: [255, 0, 255], silver: [192, 192, 192], white: [255, 255, 255], black: [0, 0, 0] };
  return named[v] ?? null;
}

function hue([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return { h: 0, s: 0, l: max / 255, chroma: 0 };
  const d = max - min;
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return { h, s: d / max, l: (max + min) / 510, chroma: d / 255 };
}

/** The palette colour nearest a pasted or applied text colour. Near-black, dark ink and greyish text is plain text. */
export function paletteColor(value: string | null | undefined): TextColor | null {
  const c = rgb(value);
  if (!c) return null;
  const exact = (Object.keys(TEXT_COLORS) as TextColor[]).find((key) => rgb(TEXT_COLORS[key].hex)?.join() === c.join());
  if (exact) return exact;
  const { h, s, l, chroma } = hue(c);
  if (l < 0.12 || l > 0.92) return null;
  if (l < 0.35 && chroma < 0.3) return null;
  if (s < 0.3) return l > 0.3 && l < 0.75 ? "grey" : null;
  if (h < 20 || h >= 330) return "red";
  if (h < 65) return "amber";
  if (h < 170) return "green";
  if (h < 270) return "blue";
  return "red";
}

export function isHighlight(value: string | null | undefined) {
  const c = rgb(value);
  if (!c) return false;
  const { s, l } = hue(c);
  return !(l > 0.94 || (s < 0.08 && l > 0.85)) && c.join() !== "255,255,255";
}

/* ---------------- Inline runs ---------------- */

const ORDER = ["link", "color", "mark", "strong", "em", "u", "s", "sup", "sub", "code"] as const;
type MarkName = (typeof ORDER)[number];
type Mark = { name: MarkName; value?: string };
type Run = { text: string; marks: Mark[] } | { br: true } | { img: { src: string; alt: string }; marks: Mark[] };

const markId = (mark: Mark) => `${mark.name}:${mark.value ?? ""}`;

function addMark(marks: Mark[], mark: Mark): Mark[] {
  const rest = marks.filter((item) => item.name !== mark.name);
  return [...rest, mark].sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
}
const dropMark = (marks: Mark[], name: MarkName) => marks.filter((item) => item.name !== name);

function styleMarks(el: HTMLElement, marks: Mark[], inLink: boolean): Mark[] {
  const tag = el.tagName.toUpperCase();
  const style = el.style;
  let next = marks;
  const weight = style?.fontWeight;
  if (tag === "B" || tag === "STRONG") next = weight === "normal" || weight === "400" ? next : addMark(next, { name: "strong" });
  else if (weight === "bold" || weight === "bolder" || Number(weight) >= 600) next = addMark(next, { name: "strong" });
  else if (weight === "normal" || (weight && Number(weight) < 600)) next = dropMark(next, "strong");

  const italic = style?.fontStyle;
  if (tag === "I" || tag === "EM" || tag === "CITE" || tag === "DFN") next = italic === "normal" ? next : addMark(next, { name: "em" });
  else if (italic === "italic" || italic === "oblique") next = addMark(next, { name: "em" });
  else if (italic === "normal") next = dropMark(next, "em");

  const decoration = `${style?.textDecorationLine ?? ""} ${style?.textDecoration ?? ""}`;
  if ((tag === "U" || tag === "INS" || /underline/.test(decoration)) && !inLink && tag !== "A") next = addMark(next, { name: "u" });
  if (tag === "S" || tag === "STRIKE" || tag === "DEL" || /line-through/.test(decoration)) next = addMark(next, { name: "s" });

  const align = style?.verticalAlign;
  if (tag === "SUP" || align === "super") next = addMark(next, { name: "sup" });
  if (tag === "SUB" || align === "sub") next = addMark(next, { name: "sub" });
  if (tag === "CODE" || tag === "KBD" || tag === "SAMP" || tag === "TT") next = addMark(next, { name: "code" });

  if (tag === "MARK" || isHighlight(style?.backgroundColor)) next = addMark(next, { name: "mark" });
  else if (style?.backgroundColor && /transparent|initial|inherit/.test(style.backgroundColor)) next = dropMark(next, "mark");

  const colorValue = tag === "FONT" ? (el.getAttribute("color") ?? style?.color) : style?.color;
  if (colorValue && tag !== "A") {
    const color = paletteColor(colorValue);
    next = color ? addMark(next, { name: "color", value: color }) : dropMark(next, "color");
  }
  return next;
}

function collect(node: Node, marks: Mark[], out: Run[], images: boolean) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === TEXT) {
      const text = (child.nodeValue ?? "").replace(/[\s\u00a0]+/g, " ");
      if (text) out.push({ text, marks });
      continue;
    }
    if (!isElement(child)) continue;
    const tag = child.tagName.toUpperCase();
    if (SKIP.has(tag) || child.getAttribute("aria-hidden") === "true" || /mso-list:\s*ignore/i.test(child.getAttribute("style") ?? "")) continue;
    if (tag === "BR") {
      out.push({ br: true });
      continue;
    }
    if (tag === "IMG") {
      const src = child.getAttribute("src") ?? "";
      if (images && /^https:\/\//.test(src)) out.push({ img: { src, alt: (child.getAttribute("alt") ?? "").replace(/[[\]]/g, "") }, marks });
      continue;
    }
    if (isBlock(child) && out.length && !("br" in out[out.length - 1])) out.push({ br: true });
    let next = marks;
    if (tag === "A") {
      const href = child.getAttribute("href") ?? "";
      if (/^(https?:\/\/|mailto:)\S+$/.test(href)) next = addMark(next, { name: "link", value: href.replace(/\)/g, "%29") });
    }
    next = styleMarks(child, next, next.some((mark) => mark.name === "link"));
    collect(child, next, out, images);
    if (isBlock(child) && tag !== "LI") out.push({ br: true });
  }
}

/* ---------------- Escaping ---------------- */

const escapeDelims = (delim: string) =>
  delim
    .split("")
    .map((c) => `\\${c}`)
    .join("");

/** Text that must read as text: characters that would start formatting get a backslash. */
export function escapeText(text: string, inTable = false) {
  let out = text
    .replace(/\\(?=[\\`*_{}[\]()#+\-.!|~^=>•])/g, "\\\\")
    .replace(/[`*]/g, "\\$&")
    .replace(/(?<![\p{L}\p{N}_])_|_(?![\p{L}\p{N}_])/gu, "\\_")
    .replace(/(==|\+\+|~~)(?=\S)([\s\S]*?\S)\1/g, (_, delim: string, inner: string) => `${escapeDelims(delim)}${inner}${escapeDelims(delim)}`)
    .replace(/\[(?=[^\]]*\][({])/g, "\\[")
    .replace(/(?<=[\p{L}\p{N})\]*_])([~^])(?=[^\s~^]+\1)/gu, "\\$1")
    .replace(/\{(?=\.(?:center|right|justify)\})/g, "\\{");
  if (inTable) out = out.replace(/\|/g, "\\|");
  return out;
}

/** A line that would otherwise start a heading, list, quote, table or rule. */
function escapeLineStart(line: string) {
  if (/^(#{1,6}\s|[-•]\s|>|\|)/.test(line) || isRule(line)) return `\\${line}`;
  return line.replace(/^(\d{1,9}|[a-zA-Z])([.)])(\s)/, "$1\\$2$3");
}

function delimiters(mark: Mark, em: "_" | "*"): [string, string] {
  switch (mark.name) {
    case "link":
      return ["[", `](${mark.value})`];
    case "color":
      return ["[", `]{.${mark.value}}`];
    case "mark":
      return ["==", "=="];
    case "strong":
      return ["**", "**"];
    case "em":
      return [em, em];
    case "u":
      return ["++", "++"];
    case "s":
      return ["~~", "~~"];
    case "sup":
      return ["^", "^"];
    case "sub":
      return ["~", "~"];
    case "code":
      return ["`", "`"];
  }
}

const runText = (run: Run) => ("text" in run ? run.text : "img" in run ? "x" : "\n");

/**
 * Runs to Markdown. Marks open in a fixed order so they always nest, open only around non-space
 * text, and close before trailing spaces, which is where Markdown needs its delimiters.
 */
function emit(runs: Run[], inTable = false): string {
  let s = "";
  const open: { mark: Mark; close: string }[] = [];
  const closeTo = (keep: number) => {
    if (open.length <= keep) return;
    const space = s.match(/\s+$/)?.[0] ?? "";
    s = s.slice(0, s.length - space.length);
    while (open.length > keep) s += open.pop()!.close;
    s += space;
  };

  runs.forEach((run, index) => {
    if ("br" in run) {
      closeTo(0);
      s += "\n";
      return;
    }
    const marks = run.marks;
    const isImage = "img" in run;
    const raw = isImage ? "" : run.text;
    if (!isImage && !raw.trim()) {
      s += raw;
      return;
    }
    let keep = 0;
    while (keep < open.length && keep < marks.length && markId(open[keep].mark) === markId(marks[keep])) keep += 1;
    closeTo(keep);

    const lead = isImage ? "" : (raw.match(/^\s+/)?.[0] ?? "");
    s += lead;
    for (const mark of marks.slice(keep)) {
      let em: "_" | "*" = "_";
      if (mark.name === "em") {
        const before = s.slice(-1);
        let j = index + 1;
        while (j < runs.length && !("br" in runs[j]) && "marks" in runs[j] && (runs[j] as { marks: Mark[] }).marks.some((m) => m.name === "em")) j += 1;
        const after = j < runs.length ? runText(runs[j]).charAt(0) : "";
        if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) em = "*";
      }
      const [openText, close] = delimiters(mark, em);
      s += openText;
      open.push({ mark, close });
    }
    if (isImage) s += `![${run.img.alt}](${run.img.src})`;
    else {
      const body = raw.slice(lead.length);
      s += marks.some((mark) => mark.name === "code") ? body.replace(/`/g, "'") : escapeText(body, inTable);
    }
  });
  closeTo(0);
  return s;
}

function inlineMarkdown(node: Node, images: boolean, inTable = false): string {
  const runs: Run[] = [];
  collect(node, [], runs, images);
  return emit(runs, inTable);
}

/** Lines of a paragraph: trimmed, empty ones dropped, safe line starts. */
function paragraphLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(escapeLineStart);
}

/* ---------------- Blocks ---------------- */

function alignOf(el: HTMLElement, inherited?: Align): Align | undefined {
  const value = (el.style?.textAlign || el.getAttribute("align") || "").toLowerCase();
  if (value === "center" || value === "right" || value === "justify") return value;
  if (value === "left" || value === "start") return undefined;
  return el.tagName.toUpperCase() === "CENTER" ? "center" : inherited;
}

const alignTail = (align?: Align) => (align && align !== "left" ? ` {.${align}}` : "");

function listKind(el: HTMLElement): ListKind {
  if (el.tagName.toUpperCase() === "UL") return "ul";
  const type = el.getAttribute("type") ?? "";
  const style = (el.style?.listStyleType ?? "").toLowerCase();
  if (type === "A" || style === "upper-alpha" || style === "upper-latin") return "A";
  if (type === "a" || style === "lower-alpha" || style === "lower-latin") return "a";
  return "ol";
}

function list(el: HTMLElement, depth: number, out: string[], images: boolean) {
  const kind = listKind(el);
  let n = Number(el.getAttribute("start")) || 1;
  for (const child of Array.from(el.children) as HTMLElement[]) {
    const tag = child.tagName.toUpperCase();
    if (tag === "UL" || tag === "OL") {
      list(child, Math.min(3, depth + 1), out, images);
      continue;
    }
    const nested: HTMLElement[] = [];
    const holder = child.cloneNode(true) as HTMLElement;
    for (const sub of Array.from(holder.querySelectorAll(":scope > ul, :scope > ol"))) sub.remove();
    for (const sub of Array.from(child.children) as HTMLElement[]) if (/^(UL|OL)$/i.test(sub.tagName)) nested.push(sub);
    const text = inlineMarkdown(holder, images)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ");
    if (text) out.push(`${"  ".repeat(depth)}${listMarker(kind, n)} ${text}`);
    n += 1;
    for (const sub of nested) list(sub, Math.min(3, depth + 1), out, images);
  }
}

function table(el: HTMLElement, images: boolean): string | null {
  const rows = Array.from(el.querySelectorAll("tr")).filter((row) => row.closest("table") === el);
  if (!rows.length) return null;
  const grid = rows.map((row) => Array.from(row.children).filter((cell) => /^(TD|TH)$/i.test(cell.tagName)) as HTMLElement[]);
  const width = Math.max(...grid.map((row) => row.length));
  if (!width) return null;
  const text = (cell?: HTMLElement) =>
    cell
      ? inlineMarkdown(cell, images, true)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .join(" ")
      : "";
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const pad = (row: HTMLElement[]) => Array.from({ length: width }, (_, c) => text(row[c]) || " ");
  const align = Array.from({ length: width }, (_, c) => alignOf(grid[0][c] ?? el) ?? "left");
  const rule = align.map((a) => (a === "center" ? ":---:" : a === "right" ? "---:" : "---"));
  return [line(pad(grid[0])), line(rule), ...grid.slice(1).map((row) => line(pad(row)))].join("\n");
}

/** Word marks list paragraphs with mso-list and a leading bullet or number. */
function wordListItem(el: HTMLElement): { kind: ListKind; depth: number } | null {
  const style = el.getAttribute("style") ?? "";
  if (!/mso-list:/i.test(style) && !/MsoListParagraph/i.test(el.className)) return null;
  const level = Number(style.match(/level(\d+)/i)?.[1] ?? 1);
  const marker = (el.textContent ?? "").trim().slice(0, 4);
  const kind: ListKind = /^\d+[.)]/.test(marker) ? "ol" : /^[a-z][.)]/.test(marker) ? "a" : /^[A-Z][.)]/.test(marker) ? "A" : "ul";
  return { kind, depth: Math.min(3, Math.max(0, level - 1)) };
}

function blocks(root: Node, out: string[], images: boolean, inherited?: Align) {
  let pending: Node[] = [];
  const flush = () => {
    if (!pending.length) return;
    const holder = (root.ownerDocument ?? document).createElement("p");
    for (const node of pending) holder.appendChild(node.cloneNode(true));
    pending = [];
    const lines = paragraphLines(inlineMarkdown(holder, images));
    if (lines.length) {
      lines[lines.length - 1] += alignTail(inherited);
      out.push(lines.join("\n"));
    }
  };

  let wordList: { kind: ListKind; n: number; lines: string[] } | null = null;
  const flushWordList = () => {
    if (wordList?.lines.length) out.push(wordList.lines.join("\n"));
    wordList = null;
  };

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === TEXT) {
      if ((child.nodeValue ?? "").trim() || pending.length) pending.push(child);
      continue;
    }
    if (!isElement(child)) continue;
    const tag = child.tagName.toUpperCase();
    if (SKIP.has(tag)) continue;
    if (!isBlock(child)) {
      pending.push(child);
      continue;
    }
    flush();

    const word = tag === "P" ? wordListItem(child) : null;
    if (word) {
      const current: { kind: ListKind; n: number; lines: string[] } = wordList ?? { kind: word.kind, n: 1, lines: [] };
      wordList = current;
      const text = paragraphLines(inlineMarkdown(child, images)).join(" ").replace(/^(\\?[•·▪o§\-–]|\d+\\?[.)]|[a-zA-Z]\\?[.)])\s+/, "");
      if (text) current.lines.push(`${"  ".repeat(word.depth)}${listMarker(word.kind, current.n++)} ${text}`);
      continue;
    }
    flushWordList();

    const align = alignOf(child, inherited);
    if (/^H[1-6]$/.test(tag)) {
      const text = paragraphLines(inlineMarkdown(child, images)).join(" ");
      if (text) out.push(`${"#".repeat(Math.min(3, Number(tag[1])))} ${text.replace(/^\\(?=#)/, "")}${alignTail(align)}`);
    } else if (tag === "UL" || tag === "OL") {
      const lines: string[] = [];
      list(child, 0, lines, images);
      if (lines.length) out.push(lines.join("\n"));
    } else if (tag === "LI") {
      const text = paragraphLines(inlineMarkdown(child, images)).join(" ");
      if (text) out.push(`- ${text}`);
    } else if (tag === "BLOCKQUOTE") {
      const inner: string[] = [];
      blocks(child, inner, images);
      const lines = inner.join("\n").split("\n").filter(Boolean);
      if (lines.length) out.push(lines.map((line) => `> ${line}`).join("\n"));
    } else if (tag === "PRE") {
      const code = (child.innerText ?? child.textContent ?? "").replace(/\u00a0/g, " ").replace(/\n+$/, "");
      if (code.trim()) out.push(`\`\`\`\n${code.replace(/```/g, "'''")}\n\`\`\``);
    } else if (tag === "HR") {
      out.push("---");
    } else if (tag === "TABLE") {
      const md = table(child, images);
      if (md) out.push(md);
    } else if (CONTAINERS.has(tag) && Array.from(child.childNodes).some(isBlock)) {
      blocks(child, out, images, align);
    } else {
      const lines = paragraphLines(inlineMarkdown(child, images));
      if (lines.length) {
        lines[lines.length - 1] += alignTail(align);
        out.push(lines.join("\n"));
      }
    }
  }
  flush();
  flushWordList();
}

/** The Markdown for an editor page or a pasted document. */
export function domToMarkdown(root: Node, images = true): string {
  const out: string[] = [];
  blocks(root, out, images);
  return out.join("\n\n");
}
