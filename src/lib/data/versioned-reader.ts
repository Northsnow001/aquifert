export type VersionedValue<T> = { version: string | null; value: T };

/**
 * Keep only the latest snapshot in this process. Probe the small version column on
 * every read so edits from other server instances are visible without a stale TTL.
 * Errors propagate: an unavailable database must never look like empty content.
 */
export function versionedReader<T>(
  readVersion: () => Promise<string | null>,
  load: () => Promise<VersionedValue<T>>,
): () => Promise<T> {
  let saved: VersionedValue<T> | undefined;
  let pending: { version: string | null; promise: Promise<VersionedValue<T>> } | undefined;

  return async () => {
    const version = await readVersion();
    if (saved && saved.version === version) return saved.value;
    if (pending && pending.version === version) return (await pending.promise).value;

    const request = { version, promise: load() };
    pending = request;
    try {
      const snapshot = await request.promise;
      // A read started before a newer edit must not replace the newer snapshot.
      if (pending === request) saved = snapshot;
      return snapshot.value;
    } finally {
      if (pending === request) pending = undefined;
    }
  };
}
