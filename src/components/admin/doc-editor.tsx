"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  BetweenHorizontalStart,
  BetweenVerticalStart,
  Bold,
  Check,
  ChevronDown,
  Code,
  Code2,
  Eye,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  PenLine,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Trash2,
  Underline,
  Undo2,
  Unlink,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/hub/markdown";
import { inlineHtml, markdownToEditorHtml } from "@/lib/rich-text/editor-html";
import { domToMarkdown, isHighlight, paletteColor } from "@/lib/rich-text/from-dom";
import { HIGHLIGHT_HEX, TEXT_COLORS, markdownText, parseMarkdown, type Align, type TextColor } from "@/lib/rich-text/markdown";

type View = "write" | "markdown" | "preview";
type Menu = "style" | "color" | "highlight" | "table" | null;
type Panel = { kind: "link"; href: string; text: string; anchor: HTMLAnchorElement | null } | { kind: "image"; src: string; alt: string } | null;

const STYLES = [
  { tag: "p", label: "Normal text", hint: "Ctrl+Alt+0", look: "text-[14px] text-ink" },
  { tag: "h1", label: "Heading 1", hint: "Ctrl+Alt+1", look: "text-[18px] font-bold text-ink" },
  { tag: "h2", label: "Heading 2", hint: "Ctrl+Alt+2", look: "text-[16px] font-bold text-ink" },
  { tag: "h3", label: "Heading 3", hint: "Ctrl+Alt+3", look: "text-[14.5px] font-bold text-ink" },
  { tag: "blockquote", label: "Quote", hint: "> then space", look: "border-l-2 border-border pl-2 text-[14px] text-mid" },
  { tag: "pre", label: "Code block", hint: "``` then space", look: "rounded bg-s2 px-1.5 font-mono text-[12.5px] text-ink" },
] as const;
type StyleTag = (typeof STYLES)[number]["tag"];

type Format = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  sup: boolean;
  sub: boolean;
  code: boolean;
  list: "ul" | "ol" | "alpha" | null;
  block: StyleTag;
  align: Align;
  link: boolean;
  table: boolean;
  color: TextColor | null;
  highlight: boolean;
};

const EMPTY_FORMAT: Format = { bold: false, italic: false, underline: false, strike: false, sup: false, sub: false, code: false, list: null, block: "p", align: "left", link: false, table: false, color: null, highlight: false };

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function unwrap(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function placeCaret(node: Node, atEnd = false) {
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(!atEnd);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const commandState = (command: string) => {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
};

function readFormat(root: HTMLElement): Format {
  const selection = document.getSelection();
  const node = selection?.anchorNode;
  const start = node ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null;
  if (!start || !root.contains(start)) return EMPTY_FORMAT;
  const within = (selector: string) => {
    const found = start.closest(selector);
    return found && found !== root && root.contains(found) ? (found as HTMLElement) : null;
  };
  const list = within("ul,ol");
  const heading = within("h1,h2,h3");
  const cell = within("td,th");
  const block = cell ?? within("h1,h2,h3,blockquote,pre,p,li,div");
  const textAlign = block ? getComputedStyle(block).textAlign : "left";
  let color: TextColor | null = null;
  let highlight = false;
  for (let el: HTMLElement | null = start; el && el !== root; el = el.parentElement) {
    if (!color) color = paletteColor(el.tagName === "FONT" ? el.getAttribute("color") : el.style.color);
    if (!highlight) highlight = isHighlight(el.style.backgroundColor) || el.tagName === "MARK";
  }
  return {
    bold: commandState("bold"),
    italic: commandState("italic"),
    underline: commandState("underline") && !within("a"),
    strike: commandState("strikeThrough"),
    sup: commandState("superscript"),
    sub: commandState("subscript"),
    code: Boolean(within("code")),
    list: !list ? null : list.tagName === "UL" ? "ul" : /^a$/i.test(list.getAttribute("type") ?? "") ? "alpha" : "ol",
    block: within("pre") ? "pre" : within("blockquote") ? "blockquote" : heading ? (heading.tagName.toLowerCase() as StyleTag) : "p",
    align: textAlign === "center" ? "center" : textAlign === "right" || textAlign === "end" ? "right" : textAlign === "justify" ? "justify" : "left",
    link: Boolean(within("a")),
    table: Boolean(cell),
    color,
    highlight,
  };
}

function ToolButton({ icon: Icon, label, onClick, active = false, disabled = false, children }: { icon?: LucideIcon; label: string; onClick: () => void; active?: boolean; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`relative flex h-8 min-w-8 items-center justify-center rounded-md px-1 transition disabled:pointer-events-none disabled:opacity-35 ${
        active ? "bg-blue-light text-blue ring-1 ring-blue/25" : "text-mid hover:bg-s2 hover:text-ink"
      }`}
    >
      {Icon ? <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} /> : null}
      {children}
    </button>
  );
}

function Group({ caption, children, className = "" }: { caption: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={caption} className={`flex flex-col items-center justify-between border-r border-border/70 px-1.5 last:border-r-0 sm:px-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-0.5">{children}</div>
      <span className="mt-1 hidden select-none text-[9.5px] font-semibold uppercase tracking-[0.14em] text-dim xl:block">{caption}</span>
    </div>
  );
}

function Popover({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`absolute left-0 top-full z-30 mt-1.5 rounded-xl border border-border bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,35,60,0.35)] ${className}`}>{children}</div>;
}

const TABLE_COLS = 8;
const TABLE_ROWS = 7;

type TableAction = "rowAbove" | "rowBelow" | "colLeft" | "colRight" | "deleteRow" | "deleteColumn";
const TABLE_TOOLS: { label: string; icon: typeof X; action: TableAction }[] = [
  { label: "Row above", icon: BetweenHorizontalStart, action: "rowAbove" },
  { label: "Row below", icon: BetweenHorizontalStart, action: "rowBelow" },
  { label: "Column left", icon: BetweenVerticalStart, action: "colLeft" },
  { label: "Column right", icon: BetweenVerticalStart, action: "colRight" },
  { label: "Delete row", icon: X, action: "deleteRow" },
  { label: "Delete column", icon: X, action: "deleteColumn" },
];

/**
 * The admin article editor: a word-processor page with a ribbon, writing the desk's Markdown
 * (lib/rich-text/markdown.ts). Paste from Word, WPS, Google Docs or a web page keeps headings,
 * emphasis, lists, links and tables and drops the rest, so every article reads alike on the hub.
 * Markdown and Preview tabs show the stored text and the member view.
 */
export function DocEditor({
  id,
  title,
  value,
  onChange,
  placeholder = "Start writing…",
  meta,
  images = true,
  name,
  minHeight = 420,
  error,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  meta?: React.ReactNode;
  /** Lets writers place https images in the text. */
  images?: boolean;
  /** Also posts the Markdown with a surrounding form under this name. */
  name?: string;
  minHeight?: number;
  error?: string;
}) {
  const labelId = useId();
  const surface = useRef<HTMLDivElement | null>(null);
  const ribbon = useRef<HTMLDivElement>(null);
  const lastRange = useRef<Range | null>(null);
  const emitted = useRef(value);
  const valueRef = useRef(value);
  const plainPaste = useRef(false);
  const [view, setView] = useState<View>("write");
  const [focusMode, setFocusMode] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [format, setFormat] = useState<Format>(EMPTY_FORMAT);
  const [lastColor, setLastColor] = useState<TextColor>("red");
  const [grid, setGrid] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    valueRef.current = value;
  }, [value]);

  const markEmpty = useCallback((el: HTMLElement) => {
    el.dataset.empty = String(!el.textContent?.trim() && !el.querySelector("img,hr,table,li"));
  }, []);

  const seed = useCallback(
    (el: HTMLElement, markdown: string) => {
      el.innerHTML = markdownToEditorHtml(markdown, images);
      emitted.current = markdown;
      markEmpty(el);
    },
    [images, markEmpty],
  );

  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      surface.current = el;
      if (el) seed(el, valueRef.current);
    },
    [seed],
  );

  useEffect(() => {
    const el = surface.current;
    if (view === "write" && el && value !== emitted.current) seed(el, value);
  }, [value, view, seed]);

  const sync = useCallback(() => {
    const el = surface.current;
    if (!el) return;
    if (!el.firstElementChild && !el.textContent) el.innerHTML = "<p><br></p>";
    markEmpty(el);
    const markdown = domToMarkdown(el, images);
    emitted.current = markdown;
    if (markdown !== valueRef.current) onChange(markdown);
  }, [images, markEmpty, onChange]);

  const refresh = useCallback(() => {
    const el = surface.current;
    const selection = document.getSelection();
    if (!el || !selection?.rangeCount || !el.contains(selection.anchorNode)) return;
    lastRange.current = selection.getRangeAt(0).cloneRange();
    setFormat(readFormat(el));
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  }, [refresh]);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (!ribbon.current?.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !menu && !panel && setFocusMode(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [focusMode, menu, panel]);

  /* ---------------- Commands ---------------- */

  const restore = () => {
    const el = surface.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    const selection = document.getSelection();
    if (lastRange.current && selection && el.contains(lastRange.current.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(lastRange.current);
    }
  };

  const done = () => {
    sync();
    refresh();
  };

  const exec = (command: string, arg?: string) => {
    restore();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, arg);
    done();
  };

  const closest = (selector: string) => {
    const el = surface.current;
    const node = lastRange.current?.startContainer;
    const start = node ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null;
    const found = start?.closest(selector);
    return el && found && found !== el && el.contains(found) ? (found as HTMLElement) : null;
  };

  const setStyle = (tag: StyleTag) => {
    setMenu(null);
    restore();
    const quote = closest("blockquote");
    if (tag === "blockquote" && quote) {
      unwrap(quote);
      done();
      return;
    }
    if (quote) unwrap(quote);
    const pre = closest("pre");
    if (pre && tag !== "pre") {
      document.execCommand("formatBlock", false, "<p>");
    }
    if (closest("ul,ol") && tag !== "p") document.execCommand(closest("ol") ? "insertOrderedList" : "insertUnorderedList");
    document.execCommand("formatBlock", false, `<${tag}>`);
    done();
  };

  const toggleList = (kind: "ul" | "ol" | "alpha") => {
    restore();
    const current = closest("ul,ol");
    const alpha = current?.tagName === "OL" && /^a$/i.test(current.getAttribute("type") ?? "");
    if (kind === "ul") document.execCommand("insertUnorderedList");
    else if (kind === "ol" && alpha) current?.removeAttribute("type");
    else if (kind === "alpha" && current?.tagName === "OL" && !alpha) current.setAttribute("type", "a");
    else if (kind === "alpha" && alpha) document.execCommand("insertOrderedList");
    else {
      document.execCommand("insertOrderedList");
      if (kind === "alpha") {
        const selection = document.getSelection();
        const node = selection?.anchorNode;
        const ol = (node?.nodeType === 1 ? (node as HTMLElement) : node?.parentElement)?.closest("ol");
        ol?.setAttribute("type", "a");
      }
    }
    done();
  };

  const align = (to: Align) => {
    const cell = closest("td,th") as HTMLTableCellElement | null;
    if (cell) {
      const table = cell.closest("table") as HTMLTableElement;
      for (const row of Array.from(table.rows)) {
        const target = row.cells[cell.cellIndex];
        if (target) target.style.textAlign = to === "left" ? "" : to;
      }
      done();
      return;
    }
    exec(to === "center" ? "justifyCenter" : to === "right" ? "justifyRight" : to === "justify" ? "justifyFull" : "justifyLeft");
  };

  const applyColor = (color: TextColor | null) => {
    setMenu(null);
    if (color) {
      setLastColor(color);
      exec("foreColor", TEXT_COLORS[color].hex);
      return;
    }
    exec("foreColor", "#000000");
    surface.current?.querySelectorAll('font[color="#000000"]').forEach(unwrap);
    done();
  };

  const applyHighlight = (on: boolean) => {
    setMenu(null);
    restore();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, on ? HIGHLIGHT_HEX : "transparent");
    document.execCommand("styleWithCSS", false, "false");
    done();
  };

  const toggleCode = () => {
    restore();
    const code = closest("code");
    if (code) {
      unwrap(code);
      done();
      return;
    }
    const text = document.getSelection()?.toString() ?? "";
    if (!text.trim()) {
      toast.message("Select the words to show as code first.");
      return;
    }
    document.execCommand("insertHTML", false, `<code>${escapeHtml(text.replace(/\s+/g, " "))}</code>`);
    done();
  };

  const clearFormatting = () => {
    restore();
    document.execCommand("removeFormat");
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, "transparent");
    document.execCommand("styleWithCSS", false, "false");
    const code = closest("code");
    if (code) unwrap(code);
    done();
  };

  const insertHtml = (html: string) => {
    restore();
    document.execCommand("insertHTML", false, html);
    done();
  };

  const openLink = () => {
    setMenu(null);
    restore();
    const anchor = closest("a") as HTMLAnchorElement | null;
    const text = anchor ? (anchor.textContent ?? "") : (document.getSelection()?.toString() ?? "");
    setPanel({ kind: "link", href: anchor?.getAttribute("href") ?? "https://", text, anchor });
  };

  const applyLink = (href: string, text: string, anchor: HTMLAnchorElement | null) => {
    const url = href.trim();
    if (!/^(https?:\/\/|mailto:)\S+\.\S+|^mailto:\S+@\S+$/.test(url)) {
      toast.error("Use a full address starting with https://, or mailto: for email.");
      return;
    }
    setPanel(null);
    if (anchor && surface.current?.contains(anchor)) {
      anchor.setAttribute("href", url);
      if (text.trim() && text !== anchor.textContent) anchor.textContent = text.trim();
      done();
      return;
    }
    restore();
    const selected = document.getSelection()?.toString() ?? "";
    if (selected.trim() && (!text.trim() || text === selected)) document.execCommand("createLink", false, url);
    else document.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}">${escapeHtml(text.trim() || url)}</a>`);
    done();
  };

  const removeLink = () => {
    const anchor = closest("a");
    setPanel(null);
    if (anchor) unwrap(anchor);
    else exec("unlink");
    done();
  };

  const applyImage = (src: string, alt: string) => {
    if (!/^https:\/\/\S+$/.test(src.trim())) {
      toast.error("Images need an https:// address. Upload the picture somewhere public first, or use the thumbnail for the cover.");
      return;
    }
    setPanel(null);
    insertHtml(`<img src="${escapeHtml(src.trim())}" alt="${escapeHtml(alt.trim().replace(/[[\]]/g, ""))}">`);
  };

  const insertTable = (rows: number, cols: number) => {
    setMenu(null);
    const head = `<tr>${"<th><br></th>".repeat(cols)}</tr>`;
    const body = `<tr>${"<td><br></td>".repeat(cols)}</tr>`.repeat(Math.max(1, rows - 1));
    insertHtml(`<table><thead>${head}</thead><tbody>${body}</tbody></table><p><br></p>`);
    const table = closest("table") ?? surface.current?.querySelector("table:last-of-type");
    const first = table?.querySelector("th");
    if (first) placeCaret(first);
  };

  const tableContext = () => {
    const cell = closest("td,th") as HTMLTableCellElement | null;
    if (!cell) return null;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table") as HTMLTableElement;
    const width = Math.max(...Array.from(table.rows).map((item) => item.cells.length));
    return { cell, row, table, col: cell.cellIndex, width, head: row.parentElement?.tagName === "THEAD" };
  };

  const addRow = (after: boolean) => {
    const ctx = tableContext();
    if (!ctx) return;
    const tr = document.createElement("tr");
    for (let c = 0; c < ctx.width; c++) {
      const td = document.createElement("td");
      td.innerHTML = "<br>";
      const style = ctx.table.rows[0]?.cells[c]?.style.textAlign;
      if (style) td.style.textAlign = style;
      tr.appendChild(td);
    }
    if (ctx.head) {
      const body = ctx.table.tBodies[0] ?? ctx.table.createTBody();
      body.insertBefore(tr, body.firstChild);
    } else ctx.row.parentElement?.insertBefore(tr, after ? ctx.row.nextSibling : ctx.row);
    placeCaret(tr.cells[Math.min(ctx.col, tr.cells.length - 1)]);
    done();
  };

  const addColumn = (after: boolean) => {
    const ctx = tableContext();
    if (!ctx) return;
    for (const row of Array.from(ctx.table.rows)) {
      const cell = document.createElement(row.parentElement?.tagName === "THEAD" ? "th" : "td");
      cell.innerHTML = "<br>";
      row.insertBefore(cell, row.cells[after ? ctx.col + 1 : ctx.col] ?? null);
    }
    placeCaret(ctx.row.cells[after ? ctx.col + 1 : ctx.col]);
    done();
  };

  const deleteRow = () => {
    const ctx = tableContext();
    if (!ctx) return;
    if (ctx.head) {
      toast.message("The header row stays with the table. Delete the table to remove it.");
      return;
    }
    const next = (ctx.row.nextElementSibling ?? ctx.row.previousElementSibling ?? ctx.table.rows[0]) as HTMLTableRowElement;
    ctx.row.remove();
    placeCaret(next.cells[Math.min(ctx.col, next.cells.length - 1)]);
    done();
  };

  const deleteColumn = () => {
    const ctx = tableContext();
    if (!ctx) return;
    if (ctx.width <= 1) return deleteTable();
    for (const row of Array.from(ctx.table.rows)) row.cells[ctx.col]?.remove();
    placeCaret(ctx.row.cells[Math.max(0, ctx.col - 1)]);
    done();
  };

  const tableTool = (action: TableAction) => {
    if (action === "rowAbove" || action === "rowBelow") addRow(action === "rowBelow");
    else if (action === "colLeft" || action === "colRight") addColumn(action === "colRight");
    else if (action === "deleteRow") deleteRow();
    else deleteColumn();
  };

  const deleteTable = () => {
    const ctx = tableContext();
    if (!ctx) return;
    const after = document.createElement("p");
    after.innerHTML = "<br>";
    ctx.table.replaceWith(after);
    placeCaret(after);
    done();
  };

  /* ---------------- Keyboard and paste ---------------- */

  const autoFormat = (event: React.KeyboardEvent) => {
    const selection = document.getSelection();
    const el = surface.current;
    if (!el || !selection?.isCollapsed || !selection.anchorNode) return false;
    const start = selection.anchorNode.nodeType === 1 ? (selection.anchorNode as HTMLElement) : selection.anchorNode.parentElement;
    const block = start?.closest("p,div,h1,h2,h3,li,blockquote,pre,td,th");
    if (!block || block === el || !/^(P|DIV)$/.test(block.tagName) || block.parentElement !== el) return false;
    const range = document.createRange();
    range.setStart(block, 0);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    const typed = range.toString();
    const rules: [RegExp, () => void][] = [
      [/^#$/, () => setStyle("h1")],
      [/^##$/, () => setStyle("h2")],
      [/^###$/, () => setStyle("h3")],
      [/^>$/, () => setStyle("blockquote")],
      [/^```$/, () => setStyle("pre")],
      [/^[-*•]$/, () => toggleList("ul")],
      [/^1[.)]$/, () => toggleList("ol")],
      [/^a[.)]$/, () => toggleList("alpha")],
    ];
    const rule = rules.find(([pattern]) => pattern.test(typed));
    if (!rule) return false;
    event.preventDefault();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("delete");
    lastRange.current = document.getSelection()?.getRangeAt(0).cloneRange() ?? null;
    rule[1]();
    return true;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    refresh();
    if (mod && event.shiftKey && event.code === "KeyV") {
      plainPaste.current = true;
      return;
    }
    if (mod && !event.shiftKey && !event.altKey && event.code === "KeyK") {
      event.preventDefault();
      openLink();
    } else if (mod && event.altKey && /^Digit[0-3]$/.test(event.code)) {
      event.preventDefault();
      setStyle((["p", "h1", "h2", "h3"] as const)[Number(event.code.slice(5))]);
    } else if (mod && event.shiftKey && event.code === "Digit7") {
      event.preventDefault();
      toggleList("ol");
    } else if (mod && event.shiftKey && event.code === "Digit8") {
      event.preventDefault();
      toggleList("ul");
    } else if (mod && event.shiftKey && event.code === "KeyH") {
      event.preventDefault();
      applyHighlight(!format.highlight);
    } else if (mod && event.code === "Equal") {
      event.preventDefault();
      exec(event.shiftKey ? "superscript" : "subscript");
    } else if (event.key === "Tab" && !mod) {
      const cell = closest("td,th");
      if (cell) {
        event.preventDefault();
        const table = cell.closest("table") as HTMLTableElement;
        const cells = Array.from(table.querySelectorAll("th,td"));
        const next = cells[cells.indexOf(cell) + (event.shiftKey ? -1 : 1)];
        if (next) placeCaret(next, true);
        else if (!event.shiftKey) addRow(true);
        refresh();
      } else if (closest("li")) {
        event.preventDefault();
        exec(event.shiftKey ? "outdent" : "indent");
      }
    } else if (event.key === " " && !mod) {
      autoFormat(event);
    } else if (event.key === "Enter" && !event.shiftKey && !mod) {
      const block = closest("p,div");
      if (block && block.parentElement === surface.current && /^(-{3,}|\*{3,}|_{3,})$/.test((block.textContent ?? "").trim())) {
        event.preventDefault();
        const hr = document.createElement("hr");
        const after = document.createElement("p");
        after.innerHTML = "<br>";
        block.replaceWith(hr, after);
        placeCaret(after);
        done();
      }
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const plain = plainPaste.current;
    plainPaste.current = false;
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    event.preventDefault();
    if (closest("pre,code")) {
      document.execCommand("insertText", false, text);
      done();
      return;
    }
    if (plain || (!html && !text.includes("\n"))) {
      if (plain && text.includes("\n")) {
        const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).filter((part) => part.trim());
        document.execCommand("insertHTML", false, paragraphs.map((part) => `<p>${escapeHtml(part.trim()).replace(/\n/g, "<br>")}</p>`).join(""));
      } else document.execCommand("insertText", false, text);
      done();
      return;
    }
    const markdown = html ? domToMarkdown(new DOMParser().parseFromString(html, "text/html").body, images) : text;
    const blocks = parseMarkdown(markdown);
    if (!blocks.length) return;
    const single = blocks.length === 1 && blocks[0].t === "p" && !blocks[0].align;
    document.execCommand("insertHTML", false, single && blocks[0].t === "p" ? inlineHtml(blocks[0].c, images) : markdownToEditorHtml(markdown, images));
    done();
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    toast.message(images ? "Files cannot go into the text. Add a picture with Insert › Image and an https link." : "Files cannot go into the text.");
  };

  /* ---------------- View ---------------- */

  const words = markdownText(value).split(" ").filter(Boolean).length;
  const characters = markdownText(value).length;
  const writing = view === "write";
  const off = !writing;
  const blockLabel = STYLES.find((item) => item.tag === format.block)?.label ?? "Normal text";
  const inTable = writing && format.table;

  const switchView = (next: View) => {
    if (next === view) return;
    if (view === "write") sync();
    setMenu(null);
    setPanel(null);
    setView(next);
  };

  return (
    <div className={focusMode ? "fixed inset-0 z-[95] flex flex-col bg-[#e9eef3] p-2 sm:p-4" : ""}>
      {!focusMode ? (
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
          <span id={labelId} className="text-[12.5px] font-semibold text-ink" onClick={() => surface.current?.focus()}>
            {title}
          </span>
          {meta ? <span className="font-mono text-[11px] text-dim">{meta}</span> : null}
        </div>
      ) : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <div
        className={`flex min-h-0 flex-col overflow-clip rounded-2xl border bg-white shadow-[0_1px_2px_rgba(26,58,92,0.05)] ${focusMode ? "mx-auto h-full w-full max-w-[1180px]" : ""} ${error ? "border-red-300 ring-2 ring-red-100" : "border-border"}`}
      >
        <div ref={ribbon} className={`${focusMode ? "" : "sticky top-0"} z-20 border-b border-border bg-gradient-to-b from-white to-[#f4f7fa]`}>
          <div className="flex flex-wrap items-stretch gap-y-1.5 px-1.5 py-1.5">
            <Group caption="Edit">
              <ToolButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => exec("undo")} disabled={off} />
              <ToolButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={() => exec("redo")} disabled={off} />
            </Group>

            <Group caption="Style">
              <div className="relative">
                <button
                  type="button"
                  disabled={off}
                  aria-haspopup="listbox"
                  aria-expanded={menu === "style"}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setMenu(menu === "style" ? null : "style")}
                  className="flex h-8 w-[9.5rem] items-center justify-between gap-1 rounded-md border border-border bg-white px-2.5 text-left text-[13px] font-medium text-ink transition hover:border-blue/40 disabled:opacity-40"
                >
                  <span className="truncate">{blockLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-dim" />
                </button>
                {menu === "style" ? (
                  <Popover className="w-64">
                    <ul role="listbox" aria-label="Paragraph style">
                      {STYLES.map((item) => (
                        <li key={item.tag}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={format.block === item.tag}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setStyle(item.tag)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-s2 ${format.block === item.tag ? "bg-blue-light/60" : ""}`}
                          >
                            <span className={`min-w-0 flex-1 truncate ${item.look}`}>{item.label}</span>
                            <span className="shrink-0 font-mono text-[10.5px] text-dim">{item.hint}</span>
                            {format.block === item.tag ? <Check className="h-3.5 w-3.5 shrink-0 text-blue" /> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Popover>
                ) : null}
              </div>
            </Group>

            <Group caption="Font">
              <ToolButton icon={Bold} label="Bold (Ctrl+B)" onClick={() => exec("bold")} active={writing && format.bold} disabled={off} />
              <ToolButton icon={Italic} label="Italic (Ctrl+I)" onClick={() => exec("italic")} active={writing && format.italic} disabled={off} />
              <ToolButton icon={Underline} label="Underline (Ctrl+U)" onClick={() => exec("underline")} active={writing && format.underline} disabled={off} />
              <ToolButton icon={Strikethrough} label="Strikethrough" onClick={() => exec("strikeThrough")} active={writing && format.strike} disabled={off} />
              <ToolButton icon={Superscript} label="Superscript, as in m³ (Ctrl+Shift+=)" onClick={() => exec("superscript")} active={writing && format.sup} disabled={off} />
              <ToolButton icon={Subscript} label="Subscript, as in P₂O₅ (Ctrl+=)" onClick={() => exec("subscript")} active={writing && format.sub} disabled={off} />
              <ToolButton icon={Code} label="Inline code" onClick={toggleCode} active={writing && format.code} disabled={off} />
              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
              <div className="relative flex items-center">
                <ToolButton label={`Text colour: ${TEXT_COLORS[lastColor].label}`} onClick={() => applyColor(lastColor)} disabled={off}>
                  <Baseline className="h-[17px] w-[17px]" strokeWidth={2.1} />
                  <span className="absolute bottom-1 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full" style={{ backgroundColor: TEXT_COLORS[lastColor].hex }} />
                </ToolButton>
                <button
                  type="button"
                  aria-label="More text colours"
                  aria-expanded={menu === "color"}
                  disabled={off}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setMenu(menu === "color" ? null : "color")}
                  className="flex h-8 w-4 items-center justify-center rounded-md text-dim hover:bg-s2 hover:text-ink disabled:opacity-35"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {menu === "color" ? (
                  <Popover className="w-52">
                    <p className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-dim">Text colour</p>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyColor(null)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink hover:bg-s2"
                    >
                      <span className="h-4 w-4 rounded-full border border-border bg-ink" />
                      Automatic
                      {writing && !format.color ? <Check className="ml-auto h-3.5 w-3.5 text-blue" /> : null}
                    </button>
                    {(Object.keys(TEXT_COLORS) as TextColor[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyColor(key)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-s2"
                        style={{ color: TEXT_COLORS[key].hex }}
                      >
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: TEXT_COLORS[key].hex }} />
                        <span className="font-semibold">{TEXT_COLORS[key].label}</span>
                        {writing && format.color === key ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
                      </button>
                    ))}
                  </Popover>
                ) : null}
              </div>
              <div className="relative flex items-center">
                <ToolButton label="Highlight (Ctrl+Shift+H)" onClick={() => applyHighlight(!format.highlight)} active={writing && format.highlight} disabled={off}>
                  <Highlighter className="h-[17px] w-[17px]" strokeWidth={2.1} />
                  <span className="absolute bottom-1 left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full" style={{ backgroundColor: HIGHLIGHT_HEX }} />
                </ToolButton>
                <button
                  type="button"
                  aria-label="Highlight options"
                  aria-expanded={menu === "highlight"}
                  disabled={off}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setMenu(menu === "highlight" ? null : "highlight")}
                  className="flex h-8 w-4 items-center justify-center rounded-md text-dim hover:bg-s2 hover:text-ink disabled:opacity-35"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {menu === "highlight" ? (
                  <Popover className="w-48">
                    {[
                      { on: true, label: "Marker yellow" },
                      { on: false, label: "No highlight" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyHighlight(item.on)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-ink hover:bg-s2"
                      >
                        <span className="h-4 w-4 rounded border border-border" style={{ backgroundColor: item.on ? HIGHLIGHT_HEX : "#fff" }} />
                        {item.label}
                      </button>
                    ))}
                  </Popover>
                ) : null}
              </div>
              <ToolButton icon={RemoveFormatting} label="Clear formatting" onClick={clearFormatting} disabled={off} />
            </Group>

            <Group caption="Paragraph">
              <ToolButton icon={List} label="Bullets (Ctrl+Shift+8)" onClick={() => toggleList("ul")} active={writing && format.list === "ul"} disabled={off} />
              <ToolButton icon={ListOrdered} label="Numbering (Ctrl+Shift+7)" onClick={() => toggleList("ol")} active={writing && format.list === "ol"} disabled={off} />
              <ToolButton label="Lettered list: a) b) c)" onClick={() => toggleList("alpha")} active={writing && format.list === "alpha"} disabled={off}>
                <span className="font-mono text-[12.5px] font-bold leading-none">a)</span>
              </ToolButton>
              <ToolButton icon={ListIndentDecrease} label="Decrease indent (Shift+Tab)" onClick={() => exec("outdent")} disabled={off || !format.list} />
              <ToolButton icon={ListIndentIncrease} label="Increase indent (Tab)" onClick={() => exec("indent")} disabled={off || !format.list} />
              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
              <ToolButton icon={AlignLeft} label={inTable ? "Align column left" : "Align left"} onClick={() => align("left")} active={writing && format.align === "left"} disabled={off} />
              <ToolButton icon={AlignCenter} label={inTable ? "Centre column" : "Centre"} onClick={() => align("center")} active={writing && format.align === "center"} disabled={off} />
              <ToolButton icon={AlignRight} label={inTable ? "Align column right" : "Align right"} onClick={() => align("right")} active={writing && format.align === "right"} disabled={off} />
              <ToolButton icon={AlignJustify} label="Justify" onClick={() => align("justify")} active={writing && format.align === "justify"} disabled={off || inTable} />
              <ToolButton icon={Quote} label="Quote" onClick={() => setStyle("blockquote")} active={writing && format.block === "blockquote"} disabled={off} />
            </Group>

            <Group caption="Insert">
              <ToolButton icon={Link2} label="Link (Ctrl+K)" onClick={openLink} active={writing && format.link} disabled={off} />
              {images ? <ToolButton icon={ImagePlus} label="Image from an https link" onClick={() => setPanel({ kind: "image", src: "https://", alt: "" })} disabled={off} /> : null}
              <div className="relative">
                <ToolButton icon={Table} label="Table" onClick={() => setMenu(menu === "table" ? null : "table")} active={menu === "table"} disabled={off} />
                {menu === "table" ? (
                  <Popover className="-left-16 w-auto">
                    <p className="px-1 pb-1.5 text-[12px] font-semibold text-ink">{grid[0] ? `${grid[1]} × ${grid[0]} table` : "Insert a table"}</p>
                    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${TABLE_COLS}, 1rem)` }} onMouseLeave={() => setGrid([0, 0])}>
                      {Array.from({ length: TABLE_ROWS * TABLE_COLS }, (_, index) => {
                        const r = Math.floor(index / TABLE_COLS) + 1;
                        const c = (index % TABLE_COLS) + 1;
                        const lit = r <= grid[0] && c <= grid[1];
                        return (
                          <button
                            key={index}
                            type="button"
                            aria-label={`${c} columns by ${r} rows`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setGrid([r, c])}
                            onFocus={() => setGrid([r, c])}
                            onClick={() => insertTable(r, c)}
                            className={`h-4 w-4 rounded-[3px] border transition ${lit ? "border-blue bg-blue-light" : "border-border bg-white"}`}
                          />
                        );
                      })}
                    </div>
                    <p className="px-1 pt-1.5 text-[11px] text-dim">The first row is the header.</p>
                  </Popover>
                ) : null}
              </div>
              <ToolButton icon={Minus} label="Divider line (--- then Enter)" onClick={() => exec("insertHorizontalRule")} disabled={off} />
            </Group>

            <div className="ml-auto flex items-center gap-1.5 pl-2">
              <div className="flex rounded-lg border border-border bg-white p-0.5" role="tablist" aria-label={`${title} view`}>
                {(
                  [
                    { key: "write", label: "Write", icon: PenLine },
                    { key: "markdown", label: "Markdown", icon: Code2 },
                    { key: "preview", label: "Preview", icon: Eye },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={view === item.key}
                    onClick={() => switchView(item.key)}
                    className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition ${view === item.key ? "bg-ink text-white shadow-sm" : "text-mid hover:text-ink"}`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                ))}
              </div>
              <ToolButton icon={focusMode ? Minimize2 : Maximize2} label={focusMode ? "Leave full screen (Esc)" : "Full screen"} onClick={() => setFocusMode(!focusMode)} />
            </div>
          </div>

          {panel?.kind === "link" ? (
            <LinkBar key="link" panel={panel} onApply={applyLink} onRemove={removeLink} onCancel={() => setPanel(null)} />
          ) : panel?.kind === "image" ? (
            <ImageBar key="image" initial={panel} onApply={applyImage} onCancel={() => setPanel(null)} />
          ) : inTable ? (
            <div className="flex flex-wrap items-center gap-1 border-t border-border bg-blue-light/40 px-3 py-1.5">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue">Table</span>
              {TABLE_TOOLS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => tableTool(item.action)}
                  className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-ink hover:bg-white"
                >
                  <item.icon className="h-3.5 w-3.5 text-mid" />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={deleteTable}
                className="ml-auto flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-danger hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete table
              </button>
            </div>
          ) : null}
        </div>

        <div className={`min-h-0 bg-[#eef2f6] px-2 py-4 sm:px-6 sm:py-6 ${focusMode ? "flex-1 overflow-y-auto" : ""}`}>
          <div className="mx-auto w-full max-w-[820px] rounded-lg bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,35,60,0.12),0_8px_24px_-12px_rgba(15,35,60,0.18)] sm:px-12 sm:py-10">
            {view === "write" ? (
              <div
                ref={attach}
                id={id}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline
                aria-labelledby={labelId}
                aria-invalid={Boolean(error)}
                spellCheck
                data-placeholder={placeholder}
                onInput={sync}
                onKeyDown={onKeyDown}
                onKeyUp={refresh}
                onMouseUp={refresh}
                onPaste={onPaste}
                onDrop={onDrop}
                onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
                className="aq-doc relative outline-none"
                style={{ minHeight: focusMode ? "calc(100vh - 16rem)" : minHeight }}
              />
            ) : view === "markdown" ? (
              <textarea
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                spellCheck={false}
                aria-labelledby={labelId}
                className="block w-full resize-y bg-transparent font-mono text-[13px] leading-relaxed text-ink outline-none"
                style={{ minHeight: focusMode ? "calc(100vh - 16rem)" : minHeight }}
              />
            ) : value.trim() ? (
              <Markdown text={value} images={images} className="text-[16px] text-ink" />
            ) : (
              <p className="text-[14px] text-dim">Nothing to preview yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-[#f7f9fb] px-4 py-2 text-[11.5px] text-dim">
          <span className="font-mono tabular-nums">
            {words.toLocaleString()} {words === 1 ? "word" : "words"} · {characters.toLocaleString()} characters · {Math.max(1, Math.round(words / 200))} min read
          </span>
          <span className="hidden md:inline">
            {view === "markdown"
              ? "The stored text. Edit here if you prefer Markdown; Write picks it up."
              : view === "preview"
                ? "Exactly as members read it."
                : "Paste from Word, WPS or Google Docs keeps headings, lists and tables. Ctrl+Shift+V pastes plain text."}
          </span>
        </div>
      </div>
      {error ? <p className="mt-1.5 text-[12px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

function LinkBar({
  panel,
  onApply,
  onRemove,
  onCancel,
}: {
  panel: { href: string; text: string; anchor: HTMLAnchorElement | null };
  onApply: (href: string, text: string, anchor: HTMLAnchorElement | null) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [href, setHref] = useState(panel.href);
  const [text, setText] = useState(panel.text);
  const submit = () => onApply(href, text, panel.anchor);
  const keys = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-blue-light/40 px-3 py-2">
      <Link2 className="h-4 w-4 shrink-0 text-blue" />
      <input
        autoFocus
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={keys}
        onFocus={(event) => event.target.select()}
        placeholder="https://"
        aria-label="Link address"
        className="h-8 min-w-[14rem] flex-[2] rounded-md border border-border bg-white px-2.5 font-mono text-[12.5px] text-ink outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/15"
      />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={keys}
        placeholder="Text to show"
        aria-label="Text to show"
        className="h-8 min-w-[10rem] flex-1 rounded-md border border-border bg-white px-2.5 text-[13px] text-ink outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/15"
      />
      <button type="button" onClick={submit} className="h-8 rounded-md bg-blue px-3 text-[12.5px] font-semibold text-white hover:bg-blue-dim">
        {panel.anchor ? "Update link" : "Add link"}
      </button>
      {panel.anchor ? (
        <button type="button" onClick={onRemove} className="flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-mid hover:bg-white hover:text-ink">
          <Unlink className="h-3.5 w-3.5" /> Remove
        </button>
      ) : null}
      <button type="button" onClick={onCancel} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-mid hover:bg-white hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ImageBar({ initial, onApply, onCancel }: { initial: { src: string; alt: string }; onApply: (src: string, alt: string) => void; onCancel: () => void }) {
  const [src, setSrc] = useState(initial.src);
  const [alt, setAlt] = useState(initial.alt);
  const keys = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onApply(src, alt);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-blue-light/40 px-3 py-2">
      <ImagePlus className="h-4 w-4 shrink-0 text-blue" />
      <input
        autoFocus
        value={src}
        onChange={(event) => setSrc(event.target.value)}
        onKeyDown={keys}
        onFocus={(event) => event.target.select()}
        placeholder="https://…/chart.png"
        aria-label="Image address"
        className="h-8 min-w-[14rem] flex-[2] rounded-md border border-border bg-white px-2.5 font-mono text-[12.5px] text-ink outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/15"
      />
      <input
        value={alt}
        onChange={(event) => setAlt(event.target.value)}
        onKeyDown={keys}
        placeholder="Describe the picture"
        aria-label="Picture description"
        className="h-8 min-w-[10rem] flex-1 rounded-md border border-border bg-white px-2.5 text-[13px] text-ink outline-none focus:border-blue/50 focus:ring-2 focus:ring-blue/15"
      />
      <button type="button" onClick={() => onApply(src, alt)} className="h-8 rounded-md bg-blue px-3 text-[12.5px] font-semibold text-white hover:bg-blue-dim">
        Insert image
      </button>
      <button type="button" onClick={onCancel} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-mid hover:bg-white hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
