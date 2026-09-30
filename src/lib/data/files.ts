import "server-only";

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import path from "path";
import { assertLocalAllowed, databaseError, dataClient } from "@/lib/data/db";
import { LIBRARY_BUCKET } from "@/lib/data/tables";

type StoredFile = { id: string; storedName: string | null };

const libraryRoot = path.join(process.cwd(), "data", "library");

function localDir(id: string) {
  const dir = path.join(libraryRoot, path.basename(id));
  if (!dir.startsWith(libraryRoot + path.sep)) throw new Error("Invalid file id");
  return dir;
}

const objectPath = (id: string, name: string) => `${path.basename(id)}/${path.basename(name)}`;

/** Letters, digits and a few safe marks, so the name works as a Storage key and a download name. */
export const safeFileName = (name: string, fallback: string) => path.basename(name).replace(/[^\w.\- ()&]+/g, "_") || fallback;

/** Saves the only copy of a library file, replacing whatever the record held before. */
export async function putLibraryFile(id: string, name: string, bytes: Uint8Array, contentType: string) {
  const db = dataClient();
  if (db) {
    const { error } = await db.storage.from(LIBRARY_BUCKET).upload(objectPath(id, name), bytes, { contentType, upsert: true });
    if (error) throw databaseError("store the file", error);
    await removeOtherFiles(id, name);
    return;
  }
  assertLocalAllowed();
  const dir = localDir(id);
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) rmSync(path.join(dir, entry), { force: true });
  writeFileSync(path.join(dir, path.basename(name)), bytes);
}

/** Deletes every stored object for this record except `keep`. */
export async function removeOtherFiles(id: string, keep: string | null) {
  const db = dataClient();
  if (!db) {
    const dir = localDir(id);
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) if (entry !== keep) rmSync(path.join(dir, entry), { force: true });
    return;
  }
  const bucket = db.storage.from(LIBRARY_BUCKET);
  const { data, error } = await bucket.list(path.basename(id), { limit: 100 });
  if (error) throw databaseError("list stored files", error);
  const stale = (data ?? []).filter((item) => item.name !== keep).map((item) => objectPath(id, item.name));
  if (stale.length) {
    const { error: removeError } = await bucket.remove(stale);
    if (removeError) throw databaseError("remove old files", removeError);
  }
}

export const removeLibraryFiles = (id: string) => removeOtherFiles(id, null);

/** Size in bytes, or null when the file has not been stored. */
export async function libraryFileSize(file: StoredFile): Promise<number | null> {
  if (!file.storedName) return null;
  const db = dataClient();
  if (!db) {
    const target = path.join(localDir(file.id), path.basename(file.storedName));
    return existsSync(target) ? statSync(target).size : null;
  }
  const { data, error } = await db.storage.from(LIBRARY_BUCKET).list(path.basename(file.id), { limit: 100, search: path.basename(file.storedName) });
  if (error) throw databaseError("look up the file", error);
  const match = (data ?? []).find((item) => item.name === path.basename(file.storedName!));
  if (!match) return null;
  const size = Number((match.metadata as { size?: number } | null)?.size);
  return Number.isFinite(size) ? size : 0;
}

export async function readLibraryFile(file: StoredFile): Promise<Buffer | null> {
  if (!file.storedName) return null;
  const db = dataClient();
  if (!db) {
    const target = path.join(localDir(file.id), path.basename(file.storedName));
    return existsSync(target) ? readFileSync(target) : null;
  }
  const { data, error } = await db.storage.from(LIBRARY_BUCKET).download(objectPath(file.id, file.storedName));
  if (error) {
    if (/not.?found|404|400/i.test(error.message)) return null;
    throw databaseError("read the file", error);
  }
  return Buffer.from(await data.arrayBuffer());
}

/** A link the browser can fetch directly for one minute, or null when files are kept on this machine. */
export async function librarySignedUrl(file: StoredFile, download: string | null): Promise<string | null> {
  const db = dataClient();
  if (!db || !file.storedName) return null;
  const { data, error } = await db.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(objectPath(file.id, file.storedName), 60, download === null ? undefined : { download });
  if (error) throw databaseError("sign the download link", error);
  return data.signedUrl;
}

/** A two-hour link the admin's browser uploads straight to, skipping the host's request size limit. Null when files stay on this machine. */
export async function librarySignedUpload(id: string, name: string) {
  const db = dataClient();
  if (!db) return null;
  const { data, error } = await db.storage.from(LIBRARY_BUCKET).createSignedUploadUrl(objectPath(id, name), { upsert: true });
  if (error) throw databaseError("prepare the upload", error);
  return { url: data.signedUrl, path: data.path };
}
