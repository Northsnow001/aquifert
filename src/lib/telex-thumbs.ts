import "server-only";

import { putLibraryFile, readLibraryFile, removeLibraryFiles } from "@/lib/data/files";

/** Uploaded thumbnails share the library bucket, one folder per flash. */
const folder = (telexId: string) => `telex-thumb-${telexId}`;

export const THUMB_MAX_BYTES = 3 * 1024 * 1024;

export const THUMB_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const TYPE_OF_EXT: Record<string, string> = Object.fromEntries(Object.entries(THUMB_TYPES).map(([type, ext]) => [ext, type]));

export const thumbContentType = (name: string) => TYPE_OF_EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** Stores the image and drops any older one. Returns the stored name, which also busts browser caches. */
export async function saveTelexThumb(telexId: string, bytes: Uint8Array, contentType: string) {
  const name = `thumb-${Date.now()}.${THUMB_TYPES[contentType] ?? "jpg"}`;
  await putLibraryFile(folder(telexId), name, bytes, contentType);
  return name;
}

export const readTelexThumb = (telexId: string, name: string) => readLibraryFile({ id: folder(telexId), storedName: name });

export const removeTelexThumb = (telexId: string) => removeLibraryFiles(folder(telexId));
