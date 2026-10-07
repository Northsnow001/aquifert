"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { SITE_IMAGE_MAX_BYTES, SITE_IMAGE_TYPES, saveSiteImage } from "@/lib/site-content/media";
import { validatePage, type ContentIssue } from "@/lib/site-content/normalize";
import { SITE_PAGE_KEYS, SITE_SCHEMA, type SiteContent, type SitePageKey } from "@/lib/site-content/schema";
import { saveSitePage } from "@/lib/site-content/store";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string; issues?: ContentIssue[] };

export async function saveSiteContent<K extends SitePageKey>(key: K, value: SiteContent[K]): Promise<Result<{ page: SiteContent[K]; at: string; by: string }>> {
  const user = await requireAdmin();
  if (!SITE_PAGE_KEYS.includes(key)) return { ok: false, message: "Unknown page." };
  const issues = validatePage(key, value);
  if (issues.length) return { ok: false, message: issues[0].message, issues };

  const by = user.name || user.email;
  const { page, at } = await saveSitePage(key, value, by);
  const path = SITE_SCHEMA[key].path;
  if (path) revalidatePath(path);
  else revalidatePath("/(site)", "layout");
  revalidatePath("/admin/site-content");
  return { ok: true, page, at, by };
}

export async function uploadSiteImage(form: FormData): Promise<Result<{ url: string }>> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a picture to upload." };
  if (!SITE_IMAGE_TYPES[file.type]) return { ok: false, message: "Use a JPG, PNG, WebP or GIF picture." };
  if (file.size > SITE_IMAGE_MAX_BYTES) return { ok: false, message: `Pictures can be up to ${SITE_IMAGE_MAX_BYTES / 1024 / 1024} MB. This one is ${(file.size / 1024 / 1024).toFixed(1)} MB.` };
  try {
    return { ok: true, url: await saveSiteImage(new Uint8Array(await file.arrayBuffer()), file.type) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "The picture could not be stored." };
  }
}
