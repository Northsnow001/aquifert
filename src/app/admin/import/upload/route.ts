import { gunzipSync } from "node:zlib";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { saveExport } from "@/lib/wp-import/import";

const MAX_BYTES = 200 * 1024 * 1024;

function readText(bytes: Buffer, encoding: FormDataEntryValue | null) {
  if (encoding !== "gzip") return bytes.toString("utf8");
  try {
    return gunzipSync(bytes, { maxOutputLength: MAX_BYTES }).toString("utf8");
  } catch {
    throw new Error("The compressed upload could not be opened. Try again, or use another browser.");
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return Response.json({ ok: false, message: "Sign in with an admin account." }, { status: 401 });
  const form = await request.formData();
  const upload = form.get("file");
  if (!(upload instanceof File) || upload.size === 0) return Response.json({ ok: false, message: "Choose the export file." }, { status: 400 });
  if (upload.size > MAX_BYTES) return Response.json({ ok: false, message: "The export file is larger than 200 MB." }, { status: 400 });
  try {
    const text = readText(Buffer.from(await upload.arrayBuffer()), form.get("encoding"));
    const data = await saveExport(text, upload.name);
    return Response.json({ ok: true, site: data.site, telex: data.telex.length, files: data.library.length });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "The file could not be read." }, { status: 400 });
  }
}
