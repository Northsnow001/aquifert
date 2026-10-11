import "server-only";

import { TELEX_DOC_MAX_BYTES, telexDocExt, type TelexDocument } from "@/lib/content-types";
import { copyLibraryFile, libraryFileSize, librarySignedUpload, librarySignedUrl, putLibraryFile, readLibraryFile, removeLibraryFiles } from "@/lib/data/files";

/** Each document has its own folder in the library bucket, so flashes can share, copy and drop them one by one. */
const folder = (docId: string) => `telex-doc-${docId}`;

const stored = (doc: Pick<TelexDocument, "id" | "name">) => ({ id: folder(doc.id), storedName: doc.name });

export const TELEX_DOC_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const telexDocMime = (name: string) => TELEX_DOC_MIME[telexDocExt(name)] ?? "application/octet-stream";

export const prepareTelexDocUpload = (doc: Pick<TelexDocument, "id" | "name">) => librarySignedUpload(folder(doc.id), doc.name);

export const putTelexDoc = (doc: Pick<TelexDocument, "id" | "name">, bytes: Uint8Array) => putLibraryFile(folder(doc.id), doc.name, bytes, telexDocMime(doc.name));

/** Bytes in storage, or null when the upload never arrived. */
export const telexDocSize = (doc: Pick<TelexDocument, "id" | "name">) => libraryFileSize(stored(doc));

export const readTelexDoc = (doc: Pick<TelexDocument, "id" | "name">) => readLibraryFile(stored(doc));

/** A one-minute storage link; `download` names the saved file, null opens it in the browser. */
export const telexDocSignedUrl = (doc: Pick<TelexDocument, "id" | "name">, download: string | null) => librarySignedUrl(stored(doc), download);

export const removeTelexDoc = (docId: string) => removeLibraryFiles(folder(docId));

export async function copyTelexDoc(doc: TelexDocument, copyId: string): Promise<TelexDocument> {
  await copyLibraryFile(stored(doc), folder(copyId));
  return { ...doc, id: copyId };
}

/** The storage size, refusing uploads that are missing or over the limit. */
export async function checkStoredTelexDoc(doc: Pick<TelexDocument, "id" | "name">): Promise<{ size: number } | { error: string }> {
  const size = await telexDocSize(doc);
  if (size === null) return { error: "The upload did not reach storage. Try again." };
  if (size > TELEX_DOC_MAX_BYTES) {
    await removeTelexDoc(doc.id).catch(() => undefined);
    return { error: "Documents are limited to 50 MB." };
  }
  return { size };
}
