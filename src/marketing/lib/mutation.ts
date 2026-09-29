"use client";

import { useCallback, useRef, useState } from "react";

type Options<TOut> = {
  onSuccess?: (data: TOut) => void;
  onError?: (e: Error) => void;
};

/** Minimal mutation state for marketing forms (mirrors the call-site shape the pages already use). */
export function useMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>, opts: Options<TOut> = {}) {
  const [isPending, setPending] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const mutateAsync = useCallback(
    async (input: TIn) => {
      setPending(true);
      try {
        const out = await fn(input);
        optsRef.current.onSuccess?.(out);
        return out;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        optsRef.current.onError?.(e);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  const mutate = useCallback((input: TIn) => void mutateAsync(input).catch(() => {}), [mutateAsync]);

  return { mutate, mutateAsync, isPending };
}

/** POST JSON to an app route; surfaces the route's `error` message on failure. */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
  return json;
}
