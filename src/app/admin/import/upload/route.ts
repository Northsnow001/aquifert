import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { saveExport } from "@/lib/wp-import/import";

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return Response.json({ ok: false, message: "Sign in with an admin account." }, { status: 401 });
  const form = await request.formData();
  const upload = form.get("file");
  if (!(upload instanceof File) || upload.size === 0) return Response.json({ ok: false, message: "Choose the export file." }, { status: 400 });
  if (upload.size > MAX_BYTES) return Response.json({ ok: false, message: "The export file is larger than 200 MB." }, { status: 400 });
  try {
    const data = await saveExport(await upload.text(), upload.name);
    return Response.json({ ok: true, site: data.site, telex: data.telex.length, files: data.library.length });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "The file could not be read." }, { status: 400 });
  }
}
