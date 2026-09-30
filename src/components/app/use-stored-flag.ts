"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** A boolean UI preference kept in localStorage (false on the server). */
export function useStoredFlag(key: string): [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) === "1",
    () => false,
  );
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(key, localStorage.getItem(key) === "1" ? "0" : "1");
    } catch {
      return;
    }
    listeners.forEach((listener) => listener());
  }, [key]);
  return [value, toggle];
}
