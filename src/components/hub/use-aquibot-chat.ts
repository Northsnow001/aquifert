"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatEvent, Usage } from "@/lib/aquibot-engine/chat";
import type { MessageMeta } from "@/lib/aquibot-engine/store";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; meta?: MessageMeta; pending?: boolean; error?: string };
export type ChatStage = "rewriting" | "searching" | "writing";
export type ChatDone = { sessionId: string; title: string; isNew: boolean };

/** Streams answers from /api/aquibot/chat. Shared by the full page and the docked panel. */
export function useAquibotChat({
  sessionId: initialSessionId = null,
  messages: initialMessages = [],
  usage: initialUsage = null,
  onDone,
}: {
  sessionId?: string | null;
  messages?: ChatMessage[];
  usage?: Usage | null;
  onDone?: (done: ChatDone) => void;
} = {}) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ChatStage | null>(null);
  const [usage, setUsage] = useState<Usage | null>(initialUsage);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const limitReached = usage ? !usage.unlimited && usage.used >= usage.limit : false;

  const patchLast = (patch: (message: ChatMessage) => ChatMessage) =>
    setMessages((current) => current.map((message, index) => (index === current.length - 1 ? patch(message) : message)));

  async function send(text: string, { testMode = false }: { testMode?: boolean } = {}) {
    const question = text.trim();
    if (!question || busy || limitReached) return;
    setBusy(true);
    setStage(null);
    const stamp = Date.now().toString(36);
    setMessages((current) => [...current, { id: `u-${stamp}`, role: "user", content: question }, { id: `a-${stamp}`, role: "assistant", content: "", pending: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/aquibot/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, sessionId, testMode }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const json = (await response.json().catch(() => null)) as { message?: string; usage?: Usage } | null;
        if (json?.usage) setUsage(json.usage);
        patchLast((message) => ({ ...message, pending: false, error: json?.message ?? "Aquibot could not answer. Please try again." }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary).replace(/^data:\s?/, "");
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          if (!raw) continue;
          const event = JSON.parse(raw) as ChatEvent;
          if (event.type === "status") setStage(event.stage);
          else if (event.type === "meta") patchLast((message) => ({ ...message, meta: event.meta }));
          else if (event.type === "delta") patchLast((message) => ({ ...message, content: message.content + event.text }));
          else if (event.type === "error") patchLast((message) => ({ ...message, pending: false, error: event.message }));
          else if (event.type === "done") {
            patchLast((message) => ({ ...message, id: String(event.messageId ?? message.id), content: event.content, meta: event.meta, pending: false }));
            setUsage(event.usage);
            if (!sessionId) setSessionId(event.sessionId);
            onDone?.({ sessionId: event.sessionId, title: event.title, isNew: !sessionId });
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) patchLast((message) => ({ ...message, pending: false, meta: { ...message.meta, stopped: true } }));
      else patchLast((message) => ({ ...message, pending: false, error: error instanceof Error ? "The connection dropped. Please try again." : "Aquibot could not answer." }));
    } finally {
      patchLast((message) => (message.pending ? { ...message, pending: false, error: message.content ? undefined : message.error ?? "No answer was returned." } : message));
      abortRef.current = null;
      setBusy(false);
      setStage(null);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    if (busy) return;
    setSessionId(null);
    setMessages([]);
  }

  return { messages, sessionId, busy, stage, usage, setUsage, limitReached, send, stop, reset };
}
