"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  ExternalLink,
  Eye,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { btnPrimary, btnSecondary } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";

type Mode = "visual" | "html";

const BLOCKS = [
  { value: "p", label: "Paragraph" },
  { value: "h2", label: "Heading" },
  { value: "h3", label: "Subheading" },
  { value: "blockquote", label: "Quote" },
];

type Tool = { icon: LucideIcon; label: string; command: string; value?: string; state?: boolean };

const GROUPS: Tool[][] = [
  [
    { icon: Bold, label: "Bold (Ctrl+B)", command: "bold", state: true },
    { icon: Italic, label: "Italic (Ctrl+I)", command: "italic", state: true },
    { icon: Underline, label: "Underline (Ctrl+U)", command: "underline", state: true },
    { icon: Strikethrough, label: "Strikethrough", command: "strikeThrough", state: true },
  ],
  [
    { icon: List, label: "Bulleted list", command: "insertUnorderedList", state: true },
    { icon: ListOrdered, label: "Numbered list", command: "insertOrderedList", state: true },
    { icon: Quote, label: "Quote", command: "formatBlock", value: "<blockquote>" },
    { icon: Minus, label: "Divider", command: "insertHorizontalRule" },
  ],
  [
    { icon: AlignLeft, label: "Align left", command: "justifyLeft", state: true },
    { icon: AlignCenter, label: "Align centre", command: "justifyCenter", state: true },
    { icon: AlignRight, label: "Align right", command: "justifyRight", state: true },
  ],
];

function words(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export function RichTextEditor({
  initialHtml,
  updatedAt,
  save,
  publicHref,
}: {
  initialHtml: string;
  updatedAt: string | null;
  save: (html: string) => Promise<{ ok: true; html: string; savedAt: string }>;
  publicHref: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("visual");
  const [html, setHtml] = useState(initialHtml);
  const [baseline, setBaseline] = useState(initialHtml);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState("p");
  const [saving, startSaving] = useTransition();
  const dirty = html !== baseline;

  useEffect(() => {
    if (mode === "visual" && editorRef.current && editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html;
    // Only re-seed the editable surface when switching modes or after a save rewrites the HTML.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, baseline]);

  const readEditor = useCallback(() => {
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }, []);

  const refreshState = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;
    const next: Record<string, boolean> = {};
    GROUPS.flat().forEach((tool) => {
      if (tool.state) next[tool.command] = document.queryCommandState(tool.command);
    });
    setActive(next);
    const current = String(document.queryCommandValue("formatBlock") || "p").toLowerCase().replace(/[<>]/g, "");
    setBlock(BLOCKS.some((item) => item.value === current) ? current : "p");
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshState);
    return () => document.removeEventListener("selectionchange", refreshState);
  }, [refreshState]);

  const run = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    readEditor();
    refreshState();
  };

  const addLink = () => {
    const url = window.prompt("Link address", "https://");
    if (!url || url === "https://") return;
    run("createLink", url);
  };

  const addImage = () => {
    const url = window.prompt("Image address (https://…)", "https://");
    if (!url || !/^https?:\/\//.test(url)) return;
    run("insertImage", url);
  };

  const submit = () => {
    if (saving) return;
    const current = mode === "visual" && editorRef.current ? editorRef.current.innerHTML : html;
    startSaving(async () => {
      const result = await save(current);
      setHtml(result.html);
      setBaseline(result.html);
      setSavedAt(result.savedAt);
      if (editorRef.current && editorRef.current.innerHTML !== result.html) editorRef.current.innerHTML = result.html;
      toast.success("Commentary saved. The Tools page shows it now.");
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        submit();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  const toolButton = (tool: Tool) => {
    const Icon = tool.icon;
    const on = tool.state && active[tool.command];
    return (
      <button
        key={tool.label}
        type="button"
        title={tool.label}
        aria-label={tool.label}
        aria-pressed={tool.state ? Boolean(on) : undefined}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => (tool.command === "__link" ? addLink() : tool.command === "__image" ? addImage() : run(tool.command, tool.value))}
        disabled={mode === "html"}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition disabled:opacity-40 ${on ? "bg-blue-light text-blue" : "text-mid hover:bg-s2 hover:text-ink"}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur">
        <select
          value={block}
          onChange={(event) => run("formatBlock", `<${event.target.value}>`)}
          disabled={mode === "html"}
          aria-label="Text style"
          className="h-8 rounded-md border border-border bg-white px-2 text-[12.5px] font-medium text-ink outline-none disabled:opacity-40"
        >
          {BLOCKS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {GROUPS.map((group, i) => (
          <div key={i} className="flex items-center gap-0.5 border-l border-border pl-1">
            {group.map(toolButton)}
          </div>
        ))}
        <div className="flex items-center gap-0.5 border-l border-border pl-1">
          {toolButton({ icon: Link2, label: "Add link", command: "__link" })}
          {toolButton({ icon: Unlink, label: "Remove link", command: "unlink" })}
          {toolButton({ icon: ImagePlus, label: "Insert image from a link", command: "__image" })}
          {toolButton({ icon: Eraser, label: "Clear formatting", command: "removeFormat" })}
        </div>
        <div className="flex items-center gap-0.5 border-l border-border pl-1">
          {toolButton({ icon: Undo2, label: "Undo (Ctrl+Z)", command: "undo" })}
          {toolButton({ icon: Redo2, label: "Redo (Ctrl+Y)", command: "redo" })}
        </div>
        <div className="ml-auto flex rounded-lg bg-s2 p-0.5">
          {(["visual", "html"] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                if (item === mode) return;
                if (item === "html") readEditor();
                setMode(item);
              }}
              className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold transition ${mode === item ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
            >
              {item === "visual" ? <Eye className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
              {item === "visual" ? "Visual" : "HTML"}
            </button>
          ))}
        </div>
      </div>

      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          aria-label="Commentary"
          onInput={readEditor}
          onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
              event.preventDefault();
              addLink();
            }
          }}
          className="aq-prose min-h-[520px] max-w-none px-8 py-7 text-[14px] outline-none [&_h2]:text-[18px] [&_h3]:text-[15px]"
        />
      ) : (
        <textarea
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          spellCheck={false}
          aria-label="Commentary HTML"
          className="block min-h-[520px] w-full resize-y border-0 bg-[#0f2236] px-6 py-5 font-mono text-[12.5px] leading-relaxed text-[#d6e4f0] outline-none"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-s2/50 px-4 py-3">
        <p className="text-[12px] text-mid">
          {words(html)} words · Full HTML supported. Scripts, embeds and inline styles other than alignment are removed on save.
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] text-mid">
            <span className={`h-2 w-2 rounded-full ${dirty ? "bg-[#d97706]" : "bg-[#1f7a45]"}`} />
            {dirty ? "Unsaved changes" : savedAt ? `Saved ${formatStamp(savedAt)}` : "Saved"}
          </span>
          <a href={publicHref} target="_blank" rel="noreferrer" className={btnSecondary}>
            <ExternalLink className="h-4 w-4" />
            Tools page
          </a>
          <button type="button" onClick={submit} disabled={saving || !dirty} className={btnPrimary} title="Save (Ctrl+S)">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save commentary"}
          </button>
        </div>
      </div>
    </div>
  );
}
