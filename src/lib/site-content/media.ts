import "server-only";

import { randomBytes } from "crypto";
import { putLibraryFile, readLibraryFile } from "@/lib/data/files";

/** Pictures uploaded for the public website. Each sits in its own library folder, so storing one never touches another. */
export const SITE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

export const SITE_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const TYPE_OF_EXT: Record<string, string> = Object.fromEntries(Object.entries(SITE_IMAGE_TYPES).map(([type, ext]) => [ext, type]));

/** `<stamp>-<random>.<ext>`, also the public file name under /site-media. */
export const SITE_MEDIA_NAME = /^([a-z0-9]+-[a-f0-9]{8})\.(jpg|png|webp|gif)$/;

const folder = (stem: string) => `site-media-${stem}`;

export async function saveSiteImage(bytes: Uint8Array, contentType: string) {
  const ext = SITE_IMAGE_TYPES[contentType];
  if (!ext) throw new Error("Use a JPG, PNG, WebP or GIF picture.");
  const stem = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const name = `${stem}.${ext}`;
  await putLibraryFile(folder(stem), name, bytes, contentType);
  return `/site-media/${name}`;
}

export async function readSiteImage(name: string) {
  const match = SITE_MEDIA_NAME.exec(name);
  if (!match) return null;
  const data = await readLibraryFile({ id: folder(match[1]), storedName: name });
  return data ? { data, contentType: TYPE_OF_EXT[match[2]] } : null;
}
