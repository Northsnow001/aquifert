import "server-only";

import { putLibraryFile, readLibraryFile, removeLibraryFiles, safeFileName } from "@/lib/data/files";
import { FO_ATTACHMENT_KINDS, type DeskFoAttachment, type FoAttachmentKind } from "@/lib/desk-hitl/types";

export const FO_MAX_FILES = 8;
export const FO_MAX_BYTES = 4 * 1024 * 1024;

const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isFoAttachmentKind(value: string): value is FoAttachmentKind {
  return (FO_ATTACHMENT_KINDS as readonly string[]).includes(value);
}

export function foStorageId(attachmentId: string) {
  return `foatt-${attachmentId}`;
}

export function parseFoUpload(file: File, kindRaw: string): { error: string } | { kind: FoAttachmentKind; filename: string; contentType: string } {
  if (!isFoAttachmentKind(kindRaw)) return { error: "Choose COA, TDS or photo." };
  const contentType = (file.type || "").toLowerCase();
  if (!TYPES[contentType]) return { error: "Use a PDF or an image (JPG, PNG, WebP, GIF)." };
  if (file.size <= 0) return { error: "That file is empty." };
  if (file.size > FO_MAX_BYTES) return { error: "Each file must be 4 MB or smaller." };
  const fallback = `document.${TYPES[contentType]}`;
  return { kind: kindRaw, filename: safeFileName(file.name || fallback, fallback), contentType };
}

export async function storeFoAttachmentFile(attachmentId: string, filename: string, bytes: Uint8Array, contentType: string) {
  await putLibraryFile(foStorageId(attachmentId), filename, bytes, contentType);
}

export async function readFoAttachmentFile(file: DeskFoAttachment): Promise<Buffer | null> {
  return readLibraryFile({ id: foStorageId(file.id), storedName: file.filename });
}

export async function deleteFoAttachmentFile(attachmentId: string) {
  await removeLibraryFiles(foStorageId(attachmentId));
}
