import { readFileSync } from "fs";
import path from "path";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { createZip } from "@/lib/zip";

const PLUGIN = path.join(process.cwd(), "wordpress", "aquifert-export", "aquifert-export.php");

export async function GET() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in with an admin account.", { status: 401 });
  const body = createZip([{ name: "aquifert-export/aquifert-export.php", data: readFileSync(PLUGIN) }]);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="aquifert-export.zip"',
      "Cache-Control": "no-store",
    },
  });
}
