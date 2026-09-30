import path from "path";
import { revalidatePath } from "next/cache";
import { isAdminUser } from "@/lib/admin-access";
import { syncKnowledgeLater } from "@/lib/aquibot-engine/indexer";
import { deskNow, formatBytes, formatDay, newId, type LibraryDocument, type TelexAccess } from "@/lib/content-types";
import { libraryFileSize, librarySignedUpload, putLibraryFile, removeOtherFiles, safeFileName } from "@/lib/data/files";
import { getHubContent, updateHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export const maxDuration = 300;

const MAX_BYTES = 50 * 1024 * 1024;
const EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "png", "jpg", "jpeg", "zip"]);
const ACCESS: TelexAccess[] = ["public", "growth", "enterprise"];
const ID_PATTERN = /^[\w-]{1,80}$/;

function fail(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

/** The stored name for an upload, or an error message when the file is refused. */
function checkFile(name: string, size: number): { name: string; ext: string } | { error: string } {
  if (size > MAX_BYTES) return { error: `Files are limited to ${formatBytes(MAX_BYTES)}.` };
  const stored = safeFileName(name, "file");
  const ext = path.extname(stored).slice(1).toLowerCase();
  if (!EXTENSIONS.has(ext)) return { error: `.${ext || "?"} files are not accepted. Upload PDF, Office, CSV, image or ZIP files.` };
  return { name: stored, ext };
}

/**
 * Library uploads. With Supabase the browser sends the file straight to Storage: it asks for a
 * signed link (`intent=prepare`), uploads, then posts the details with `uploadId` and `storedName`.
 * Without Supabase the file comes in the form itself.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return fail("Sign in with an admin account to upload.", 401);

  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const existingId = field("id");
  const documents = (await getHubContent()).libraryDocuments;
  const existing = existingId ? documents.find((item) => item.id === existingId) : undefined;
  if (existingId && !existing) return fail("That file no longer exists. Reload the page.", 404);

  if (field("intent") === "prepare") {
    const checked = checkFile(field("name"), Number(field("size")) || 0);
    if ("error" in checked) return fail(checked.error);
    const id = existing?.id ?? newId("file");
    const upload = await librarySignedUpload(id, checked.name);
    return Response.json({ ok: true, id, storedName: checked.name, upload });
  }

  const uploadId = field("uploadId");
  const direct = field("storedName");
  if (!existing && uploadId && (!ID_PATTERN.test(uploadId) || documents.some((item) => item.id === uploadId))) return fail("That upload link is not valid. Try again.");
  const id = existing?.id ?? (uploadId || newId("file"));

  const upload = form.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (!existing && !file && !direct) return fail("Choose a file to upload.");

  let stored: Pick<LibraryDocument, "storedName" | "type" | "size"> | null = null;
  let originalName = "";
  if (file) {
    const checked = checkFile(file.name, file.size);
    if ("error" in checked) return fail(checked.error);
    await putLibraryFile(id, checked.name, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
    stored = { storedName: checked.name, type: checked.ext.toUpperCase(), size: formatBytes(file.size) };
    originalName = file.name;
  } else if (direct) {
    const checked = checkFile(direct, 0);
    if ("error" in checked) return fail(checked.error);
    const bytes = await libraryFileSize({ id, storedName: checked.name });
    if (bytes === null) return fail("The upload did not reach storage. Try again.");
    if (bytes > MAX_BYTES) return fail(`Files are limited to ${formatBytes(MAX_BYTES)}.`);
    await removeOtherFiles(id, checked.name);
    stored = { storedName: checked.name, type: checked.ext.toUpperCase(), size: formatBytes(bytes) };
    originalName = field("originalName") || checked.name;
  }

  const title = field("title") || existing?.title || (originalName ? path.parse(originalName).name.replace(/[_]+/g, " ") : "");
  const accessField = field("access") as TelexAccess;
  const next: LibraryDocument = {
    id,
    title,
    filename: field("filename") || (originalName ? path.parse(originalName).name : existing?.filename ?? title),
    collectionIds: form.getAll("collectionIds").map(String).filter(Boolean),
    type: stored?.type ?? existing?.type ?? "PDF",
    size: stored?.size ?? existing?.size ?? "",
    updated: stored || !existing ? formatDay(deskNow().slice(0, 10)) : existing.updated,
    summary: field("summary"),
    access: ACCESS.includes(accessField) ? accessField : "public",
    private: form.get("private") === "on",
    author: existing?.author ?? user.name,
    storedName: stored?.storedName ?? existing?.storedName ?? null,
  };
  if (!next.title) return fail("Give the file a title.");

  await updateHubContent((content) => {
    const index = content.libraryDocuments.findIndex((item) => item.id === id);
    if (index >= 0) content.libraryDocuments[index] = next;
    else content.libraryDocuments.unshift(next);
  });
  syncKnowledgeLater([`file:${id}`]);
  revalidatePath("/hub", "layout");
  revalidatePath("/admin", "layout");
  return Response.json({ ok: true, id, created: !existing });
}
