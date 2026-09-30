import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin-access";
import { syncKnowledgeLater } from "@/lib/aquibot-engine/indexer";
import { deskNow, formatBytes, formatDay, newId, type LibraryDocument, type TelexAccess } from "@/lib/content-types";
import { getHubContent, libraryFileDir, updateHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

const MAX_BYTES = 50 * 1024 * 1024;
const EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "zip"]);
const ACCESS: TelexAccess[] = ["public", "growth", "enterprise"];

function fail(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return fail("Sign in with an admin account to upload.", 401);

  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const existingId = field("id");
  const existing = existingId ? getHubContent().libraryDocuments.find((item) => item.id === existingId) : undefined;
  if (existingId && !existing) return fail("That file no longer exists. Reload the page.", 404);

  const upload = form.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (!existing && !file) return fail("Choose a file to upload.");

  const id = existing?.id ?? newId("file");
  let stored: Pick<LibraryDocument, "storedName" | "type" | "size"> | null = null;

  if (file) {
    if (file.size > MAX_BYTES) return fail(`Files are limited to ${formatBytes(MAX_BYTES)}.`);
    const original = path.basename(file.name).replace(/[^\w.\- ()&]+/g, "_");
    const ext = path.extname(original).slice(1).toLowerCase();
    if (!EXTENSIONS.has(ext)) return fail(`.${ext || "?"} files are not accepted. Upload PDF, Office, CSV, image or ZIP files.`);
    const dir = libraryFileDir(id);
    mkdirSync(dir, { recursive: true });
    for (const name of readdirSync(dir)) rmSync(path.join(dir, name), { force: true });
    writeFileSync(path.join(dir, original), Buffer.from(await file.arrayBuffer()));
    stored = { storedName: original, type: ext.toUpperCase(), size: formatBytes(file.size) };
  }

  const title = field("title") || existing?.title || (file ? path.parse(file.name).name.replace(/[_]+/g, " ") : "");
  const accessField = field("access") as TelexAccess;
  const next: LibraryDocument = {
    id,
    title,
    filename: field("filename") || (file ? path.parse(file.name).name : existing?.filename ?? title),
    collectionIds: form.getAll("collectionIds").map(String).filter(Boolean),
    type: stored?.type ?? existing?.type ?? "PDF",
    size: stored?.size ?? existing?.size ?? "",
    updated: file || !existing ? formatDay(deskNow().slice(0, 10)) : existing.updated,
    summary: field("summary"),
    access: ACCESS.includes(accessField) ? accessField : "public",
    private: form.get("private") === "on",
    author: existing?.author ?? user.name,
    storedName: stored?.storedName ?? existing?.storedName ?? null,
  };
  if (!next.title) return fail("Give the file a title.");

  updateHubContent((content) => {
    const index = content.libraryDocuments.findIndex((item) => item.id === id);
    if (index >= 0) content.libraryDocuments[index] = next;
    else content.libraryDocuments.unshift(next);
  });
  syncKnowledgeLater([`file:${id}`]);
  revalidatePath("/hub", "layout");
  revalidatePath("/admin", "layout");
  return Response.json({ ok: true, id, created: !existing });
}
