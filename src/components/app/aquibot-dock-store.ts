"use client";

import { useSyncExternalStore } from "react";

type DockState = { open: boolean };

const CLOSED: DockState = { open: false };
let state: DockState = CLOSED;
const listeners = new Set<() => void>();

function emit(next: DockState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openAquibot() {
  if (!state.open) emit({ open: true });
}

export function closeAquibot() {
  if (state.open) emit({ open: false });
}

export function toggleAquibot() {
  emit({ open: !state.open });
}

export function useAquibotDock() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => CLOSED,
  );
}
