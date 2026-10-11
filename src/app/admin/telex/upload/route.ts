import { isAdminUser } from "@/lib/admin-access";
import { checkTelexDocFile, isTelexDocId, newId, telexDocTitle, type TelexDocument } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";
import { checkStoredTelexDoc, prepareTelexDocUpload, putTelexDoc, removeTelexDoc } from "@/lib/telex-docs";

export const maxDuration = 300;

function fail(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

/**
 * Telex documents. With Supabase the browser asks for a signed link (`prepare`), sends the file straight
 * to Storage, then `confirm`s; without it the file comes in the form (`store`). The flash itself only
 * lists the document once the editor is saved; `discard` drops an upload the desk took back before saving.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return fail("Sign in with an admin account to upload.", 401);

  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const intent = field("intent");

  if (intent === "prepare") {
    const checked = checkTelexDocFile(field("name"), Number(field("size")) || 0);
    if ("error" in checked) return fail(checked.error);
    const doc = { id: newId("txd"), name: checked.name };
    const upload = await prepareTelexDocUpload(doc);
    return Response.json({ ok: true, ...doc, upload });
  }

  if (intent === "store") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.");
    const checked = checkTelexDocFile(file.name, file.size);
    if ("error" in checked) return fail(checked.error);
    const doc: TelexDocument = { id: newId("txd"), name: checked.name, title: telexDocTitle(file.name), size: file.size };
    await putTelexDoc(doc, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ ok: true, document: doc });
  }

  const id = field("id");
  if (!isTelexDocId(id)) return fail("That upload is not valid. Try again.");

  if (intent === "confirm") {
    const checked = checkTelexDocFile(field("name"), 0);
    if ("error" in checked) return fail(checked.error);
    const stored = await checkStoredTelexDoc({ id, name: checked.name });
    if ("error" in stored) return fail(stored.error);
    const document: TelexDocument = { id, name: checked.name, title: telexDocTitle(field("originalName") || checked.name), size: stored.size };
    return Response.json({ ok: true, document });
  }

  if (intent === "discard") {
    const inUse = (await getHubContent()).telex.some((item) => item.documents?.some((doc) => doc.id === id));
    if (!inUse) await removeTelexDoc(id);
    return Response.json({ ok: true });
  }

  return fail("Unknown request.");
}
