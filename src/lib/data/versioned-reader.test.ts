import assert from "node:assert/strict";
import test from "node:test";
import { versionedReader, type VersionedValue } from "./versioned-reader";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test("unchanged hub reads probe the version without downloading the document again", async () => {
  let probes = 0;
  let downloads = 0;
  const value = { telex: [{ headline: "Market update" }] };
  const read = versionedReader(async () => { probes++; return "v1"; }, async () => {
    downloads++;
    return { version: "v1", value };
  });
  for (let i = 0; i < 20; i++) assert.equal(await read(), value);
  assert.equal(probes, 20);
  assert.equal(downloads, 1);
});

test("edits from another instance, deletion and recreation are visible immediately", async () => {
  let snapshot: VersionedValue<string | null> = { version: "v1", value: "old" };
  const read = versionedReader(async () => snapshot.version, async () => ({ ...snapshot }));
  assert.equal(await read(), "old");
  snapshot = { version: "v2", value: "new" };
  assert.equal(await read(), "new");
  snapshot = { version: null, value: null };
  assert.equal(await read(), null);
  snapshot = { version: "v3", value: "restored" };
  assert.equal(await read(), "restored");
});

test("concurrent cache misses share a single document download", async () => {
  const download = deferred<VersionedValue<string>>();
  let downloads = 0;
  const read = versionedReader(async () => "v1", () => { downloads++; return download.promise; });
  const reads = Array.from({ length: 20 }, () => read());
  await Promise.resolve();
  download.resolve({ version: "v1", value: "content" });
  assert.deepEqual(await Promise.all(reads), Array(20).fill("content"));
  assert.equal(downloads, 1);
});

test("version probe failures propagate instead of serving stale data", async () => {
  let fail = false;
  const read = versionedReader(async () => {
    if (fail) throw new Error("statement timeout");
    return "v1";
  }, async () => ({ version: "v1", value: "old" }));
  await read();
  fail = true;
  await assert.rejects(read, /statement timeout/);
});

test("failed downloads are not cached and the next request can retry", async () => {
  let attempts = 0;
  const read = versionedReader(async () => "v1", async () => {
    if (++attempts === 1) throw new Error("upstream timeout");
    return { version: "v1", value: "recovered" };
  });
  await assert.rejects(read, /upstream timeout/);
  assert.equal(await read(), "recovered");
  assert.equal(attempts, 2);
});

test("a slow pre-edit read cannot overwrite a newer snapshot", async () => {
  let version = "v1";
  const old = deferred<VersionedValue<string>>();
  let downloads = 0;
  const read = versionedReader(async () => version, async () => {
    downloads++;
    return version === "v1" ? old.promise : { version, value: "new" };
  });
  const first = read();
  await Promise.resolve();
  version = "v2";
  assert.equal(await read(), "new");
  old.resolve({ version: "v1", value: "old" });
  assert.equal(await first, "old");
  assert.equal(await read(), "new");
  assert.equal(downloads, 2);
});

test("an edit between the probe and download is cached under its actual version", async () => {
  let version = "v1";
  let downloads = 0;
  const read = versionedReader(async () => version, async () => {
    downloads++;
    version = "v2";
    return { version, value: "new" };
  });
  assert.equal(await read(), "new");
  assert.equal(await read(), "new");
  assert.equal(downloads, 1);
});
