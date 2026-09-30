import { existsSync, readFileSync } from "fs";
import path from "path";
import { isAdminUser } from "@/lib/admin-access";
import { canReadTelex, isFileListed } from "@/lib/content-types";
import { getHubContent, libraryFilePath } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
};

export async function GET(request: Request, ctx: RouteContext<"/hub/library/file/[id]">) {
  const { id } = await ctx.params;
  const user = await getSession();
  if (!user) return new Response("Sign in to download library files.", { status: 401 });

  const { libraryDocuments, collections } = getHubContent();
  const file = libraryDocuments.find((item) => item.id === id);
  const admin = isAdminUser(user);
  if (!file || (!admin && !isFileListed(file, collections))) return new Response("File not found.", { status: 404 });
  if (!admin && !canReadTelex(file.access, user.plan)) return new Response("Your plan does not include this file.", { status: 403 });

  const filePath = libraryFilePath(file);
  if (!filePath || !existsSync(filePath)) return new Response("This file has not been uploaded yet.", { status: 404 });

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const inline = new URL(request.url).searchParams.get("inline") === "1" && ext === "pdf";
  const name = path.basename(filePath);
  return new Response(readFileSync(filePath), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
