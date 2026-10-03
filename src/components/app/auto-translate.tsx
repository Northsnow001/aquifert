"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/app/i18n";
import { BOT_DICTS } from "@/lib/i18n/aquibot-locales";
import { DICTS, type LangCode } from "@/lib/i18n/locales";
import { fillTemplate, toTemplate } from "@/lib/i18n/machine-text";

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "KBD", "SAMP", "TEXTAREA", "IFRAME", "svg", "math"]);
const WORD = /[A-Za-z]{2}/;
const CODE = /^[A-Z]{2,5}$/;
const ADDRESS = /^(?:https?:\/\/|www\.)\S+$|^\S+@\S+\.\S+$/;
const LETTER = /\p{L}/gu;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;

/** Source text is English, so text written mostly in another script is already translated. */
function mostlyForeignScript(text: string) {
  const letters = text.match(LETTER) ?? [];
  const foreign = letters.filter((letter) => !LATIN_LETTER.test(letter)).length;
  return foreign > letters.length - foreign;
}
const MAX_LENGTH = 4000;
const LOAD_FALLBACK_MS = 2500;
const REQUEST_SIZE = 150;
const STORE_LIMIT = 1_500_000;
const RETRY_MS = 30_000;

type Applied = { source: string; applied: string };

/** What each node said in English and what we last wrote into it, shared across language switches. */
const textState = new WeakMap<Text, Applied>();
const attrState = new WeakMap<Element, Map<string, Applied>>();
const memories = new Map<LangCode, Map<string, string>>();
let touched = false;
let hydrated = false;

const storeKey = (lang: LangCode) => `aq-tr:${lang}`;

function memoryFor(lang: LangCode) {
  let memory = memories.get(lang);
  if (!memory) {
    memory = new Map();
    try {
      const stored = JSON.parse(localStorage.getItem(storeKey(lang)) ?? "{}") as Record<string, unknown>;
      for (const [key, value] of Object.entries(stored)) if (typeof value === "string") memory.set(key, value);
    } catch {
      // unreadable cache: start empty
    }
    memories.set(lang, memory);
  }
  return memory;
}

function skipElement(el: Element) {
  return SKIP_TAGS.has(el.tagName) || el.getAttribute("translate") === "no" || el.classList.contains("notranslate") || el.getAttribute("contenteditable") === "true";
}

function insideSkipped(el: Element | null) {
  for (let current = el; current; current = current.parentElement) if (skipElement(current)) return true;
  return false;
}

/** Runs once React has hydrated the streamed page, so server-rendered text is never changed under it. */
function whenHydrated(run: () => void) {
  if (hydrated) {
    run();
    return () => {};
  }
  let idle = 0;
  let cancelled = false;
  let started = false;
  const go = () => {
    if (cancelled || started) return;
    started = true;
    window.clearTimeout(fallback);
    const done = () => {
      hydrated = true;
      if (!cancelled) run();
    };
    idle = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(done, { timeout: 600 }) : window.setTimeout(done, 120);
  };
  // A slow image can hold back the load event indefinitely.
  const fallback = window.setTimeout(go, LOAD_FALLBACK_MS);
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
  return () => {
    cancelled = true;
    window.clearTimeout(fallback);
    window.removeEventListener("load", go);
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    window.clearTimeout(idle);
  };
}

/**
 * Translates everything React renders into the member's language: text and the placeholder, title and
 * aria-label attributes. Numbers are lifted out before lookup so prices and dates reuse one translation.
 * Only node values change, never the node tree, so React keeps owning the DOM. Mark any element
 * `translate="no"` to leave it as written.
 */
class Translator {
  private readonly memory: Map<string, string>;
  private readonly known: Set<string>;
  private readonly wanted = new Set<string>();
  private readonly requested = new Set<string>();
  private readonly dirty = new Set<Node>();
  private readonly dirtyAttrs = new Set<Element>();
  private observer: MutationObserver | null = null;
  private requestTimer = 0;
  private saveTimer = 0;
  private frame = 0;
  private inFlight = 0;
  private stopped = false;

  constructor(
    private readonly lang: LangCode,
    private readonly onBusy: (busy: boolean) => void,
  ) {
    this.memory = lang === "en" ? new Map() : memoryFor(lang);
    this.known = lang === "en" ? new Set() : new Set([...Object.values(DICTS[lang]), ...Object.values(BOT_DICTS[lang])]);
  }

  start() {
    this.scan(document.body);
    if (this.lang === "en") return;
    touched = true;
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") record.addedNodes.forEach((node) => this.dirty.add(node));
        else if (record.type === "characterData") this.dirty.add(record.target);
        else this.dirtyAttrs.add(record.target as Element);
      }
      if (!this.frame) this.frame = requestAnimationFrame(() => this.flushDirty());
    });
    this.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    this.request();
    if (!this.inFlight) this.onBusy(false);
  }

  stop() {
    this.stopped = true;
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.requestTimer);
  }

  private flushDirty() {
    this.frame = 0;
    for (const node of this.dirty) if (node.isConnected) this.scan(node);
    for (const el of this.dirtyAttrs) if (el.isConnected && !insideSkipped(el)) this.attributes(el);
    this.dirty.clear();
    this.dirtyAttrs.clear();
    this.observer?.takeRecords();
    this.schedule();
  }

  private render(source: string) {
    if (this.lang === "en") return source;
    const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(source) ?? ["", "", source, ""];
    if (core.length > MAX_LENGTH || !WORD.test(core) || CODE.test(core) || ADDRESS.test(core) || this.known.has(core) || mostlyForeignScript(core)) return source;
    const { key, numbers } = toTemplate(core);
    const hit = this.memory.get(key);
    if (hit === undefined) {
      if (!this.requested.has(key)) this.wanted.add(key);
      return source;
    }
    return lead + fillTemplate(hit, numbers) + trail;
  }

  private text(node: Text) {
    const value = node.nodeValue ?? "";
    let state = textState.get(node);
    if (!state || value !== state.applied) {
      state = { source: value, applied: value };
      textState.set(node, state);
    }
    const next = this.render(state.source);
    if (next !== value) {
      state.applied = next;
      node.nodeValue = next;
    }
  }

  private attributes(el: Element) {
    for (const name of ATTRS) {
      const value = el.getAttribute(name);
      if (value === null) continue;
      let states = attrState.get(el);
      if (!states) attrState.set(el, (states = new Map()));
      let state = states.get(name);
      if (!state || value !== state.applied) {
        state = { source: value, applied: value };
        states.set(name, state);
      }
      const next = this.render(state.source);
      if (next !== value) {
        state.applied = next;
        el.setAttribute(name, next);
      }
    }
  }

  private scan(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!insideSkipped(root.parentElement)) this.text(root as Text);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || insideSkipped(root as Element)) return;
    this.attributes(root as Element);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.nodeType === Node.ELEMENT_NODE && skipElement(node as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) this.text(node as Text);
      else this.attributes(node as Element);
    }
  }

  private schedule() {
    if (!this.wanted.size || this.requestTimer || this.stopped) return;
    this.requestTimer = window.setTimeout(() => this.request(), 60);
  }

  private request() {
    this.requestTimer = 0;
    const keys = [...this.wanted];
    this.wanted.clear();
    for (let i = 0; i < keys.length; i += REQUEST_SIZE) void this.fetchChunk(keys.slice(i, i + REQUEST_SIZE));
  }

  private async fetchChunk(keys: string[]) {
    keys.forEach((key) => this.requested.add(key));
    this.inFlight += 1;
    this.onBusy(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: this.lang, texts: keys }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { translations } = (await response.json()) as { translations?: Record<string, string> };
      for (const [key, value] of Object.entries(translations ?? {})) if (typeof value === "string") this.memory.set(key, value);
      this.persist();
    } catch {
      window.setTimeout(() => keys.forEach((key) => this.requested.delete(key)), RETRY_MS);
    } finally {
      this.inFlight -= 1;
      if (!this.stopped) {
        this.scan(document.body);
        this.observer?.takeRecords();
        this.schedule();
        if (!this.inFlight) this.onBusy(false);
      }
    }
  }

  private persist() {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      let entries = [...this.memory];
      for (;;) {
        const json = JSON.stringify(Object.fromEntries(entries));
        if (json.length > STORE_LIMIT && entries.length > 1) {
          entries = entries.slice(Math.floor(entries.length / 2));
          continue;
        }
        try {
          localStorage.setItem(storeKey(this.lang), json);
        } catch {
          // storage full or blocked: the in-memory cache still works this visit
        }
        return;
      }
    }, 1000);
  }
}

export function AutoTranslate() {
  const { lang, t } = useI18n();
  const [readyFor, setReadyFor] = useState<LangCode | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (lang === "en" && !touched) return;
    const translator = new Translator(lang, (next) => {
      setBusy(next);
      if (!next) setReadyFor(lang);
    });
    const cancel = whenHydrated(() => translator.start());
    return () => {
      cancel();
      translator.stop();
    };
  }, [lang]);

  const masked = lang !== "en" && readyFor !== lang;
  return (
    <>
      {masked ? <style>{"#main-content{opacity:0;animation:aq-tr-reveal .3s ease 3s forwards}@keyframes aq-tr-reveal{to{opacity:1}}"}</style> : null}
      {busy && lang !== "en" ? (
        <div translate="no" role="status" className="aq-float pointer-events-none fixed left-1/2 top-[76px] z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-mid">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue/25 border-t-blue" aria-hidden />
          {t("top.translating")}
        </div>
      ) : null}
    </>
  );
}
