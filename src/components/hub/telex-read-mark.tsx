"use client";

import { useSyncExternalStore } from "react";
import { CheckCheck } from "lucide-react";

/**
 * Flashes read since this tab loaded, here or in another tab. Pages restored by Back carry the read list
 * from when they first rendered, so the marks also listen here and tick as soon as a read is saved.
 */
const readNow = new Set<string>();
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null | undefined;

function add(telexId: string) {
  if (readNow.has(telexId)) return;
  readNow.add(telexId);
  listeners.forEach((listener) => listener());
}

function tabs() {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("aq:telex-reads");
    channel?.addEventListener("message", (event: MessageEvent) => {
      if (typeof event.data === "string") add(event.data);
    });
  }
  return channel;
}

/** Called by the read tracker once the server has saved the read. */
export function markTelexRead(telexId: string) {
  add(telexId);
  tabs()?.postMessage(telexId);
}

function subscribe(listener: () => void) {
  tabs();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The Read chip on a flash. `read` is what the server knew when the page rendered. */
export function TelexReadMark({ telexId, read = false, size = "row" }: { telexId: string; read?: boolean; size?: "row" | "tile" }) {
  const readHere = useSyncExternalStore(
    subscribe,
    () => readNow.has(telexId),
    () => false,
  );
  if (!read && !readHere) return null;
  return (
    <span
      data-read-mark
      title="You have read this flash"
      className={
        size === "tile"
          ? "inline-flex items-center gap-0.5 rounded-md bg-s2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim"
          : "inline-flex items-center gap-1 rounded-full bg-s2 px-2 py-0.5 text-[11px] font-semibold text-dim"
      }
    >
      <CheckCheck className="h-3 w-3" aria-hidden /> Read
    </span>
  );
}
