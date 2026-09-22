import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";

const app = new Hono<{ Bindings: HttpBindings }>();

/* Security headers, required once OTP codes and OAuth tokens are in play */
app.use("*", async (c, next) => {
  await next();
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (env.isProduction) {
    c.header(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "media-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'self'",
      ].join("; ")
    );
  }
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

/* ------------------------------------------------------------------ */
/* Library: authenticated file upload + expiring signed downloads.     */
/* Files live OUTSIDE the public web root and are only ever served     */
/* through the signed-URL endpoint below.                              */
/* ------------------------------------------------------------------ */
const LIBRARY_UPLOAD_DIR = "uploads/library";
const LIBRARY_MIME_BY_SIGNATURE: [number[], string][] = [
  [[0x25, 0x50, 0x44, 0x46], "application/pdf"], // %PDF
  [[0x50, 0x4b, 0x03, 0x04], "application/zip"], // OOXML container (docx/xlsx/pptx)
];
const LIBRARY_EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

app.post("/api/library/upload", async (c) => {
  if (process.env.LIBRARY_ENABLED === "false") return c.json({ error: "Library is disabled" }, 404);
  const { authenticateRequest } = await import("./kimi/auth");
  const { effUser } = await import("./rbac");
  const user = await authenticateRequest(c.req.raw.headers).catch(() => null);
  if (!user) return c.json({ error: "Sign in required" }, 401);
  const me = await effUser(user);
  if (!me.portalRole || !["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(me.portalRole)) {
    return c.json({ error: "Staff only" }, 403);
  }
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "No file" }, 400);
  if (file.size > 25 * 1024 * 1024) return c.json({ error: "File exceeds 25MB" }, 400);
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!Object.keys(LIBRARY_EXT_MIME).includes(ext)) {
    return c.json({ error: "Only PDF, DOCX, XLSX or PPTX files are accepted" }, 400);
  }
  // Validate MIME by signature, never by extension (Section 4.2)
  const buf = Buffer.from(await file.arrayBuffer());
  const sigOk = LIBRARY_MIME_BY_SIGNATURE.some(([sig]) => sig.every((b, i) => buf[i] === b));
  if (!sigOk) return c.json({ error: "File content does not match an allowed document type" }, 400);
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  await fs.mkdir(LIBRARY_UPLOAD_DIR, { recursive: true });
  const storageName = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(LIBRARY_UPLOAD_DIR, storageName), buf);
  return c.json({
    storagePath: path.join(LIBRARY_UPLOAD_DIR, storageName),
    fileName: file.name,
    fileSizeBytes: file.size,
    fileMime: LIBRARY_EXT_MIME[ext],
  });
});

app.get("/api/library/file/:id", async (c) => {
  const { verifyFileToken } = await import("./library-router");
  const id = c.req.param("id");
  const uid = Number(c.req.query("uid"));
  const exp = Number(c.req.query("exp"));
  const sig = c.req.query("sig") ?? "";
  if (!uid || !exp || !sig || sig.length !== 64) return c.json({ error: "Invalid link" }, 403);
  if (!verifyFileToken(id, uid, exp, sig)) return c.json({ error: "Link expired or invalid" }, 403);
  const { getDb } = await import("./queries/connection");
  const s = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const report = await getDb().query.libraryReports.findFirst({ where: eq(s.libraryReports.id, id) });
  if (!report?.filePath || !report.filePath.startsWith(LIBRARY_UPLOAD_DIR)) {
    return c.json({ error: "File not found" }, 404);
  }
  // Authenticated serving (§1.4): the requester must be signed in and must
  // be the user the link was minted for, and their tier is re-checked at
  // serve time, so a shared or leaked link is useless to anyone else.
  const { authenticateRequest } = await import("./kimi/auth");
  const requester = await authenticateRequest(c.req.raw.headers).catch(() => null);
  if (!requester || Number(requester.id) !== uid) {
    return c.json({ error: "Sign in with the account this link belongs to" }, 403);
  }
  const { userAccessRank, canRead } = await import("./library-router");
  const holder = await getDb().query.users.findFirst({ where: eq(s.users.id, uid) });
  const rank = await userAccessRank(uid, holder?.portalRole ?? null);
  if (!canRead(rank, report.accessLevel)) {
    return c.json({ error: "This report is locked at your access level" }, 403);
  }
  const fs = await import("node:fs/promises");
  const buf = await fs.readFile(report.filePath).catch(() => null);
  if (!buf) return c.json({ error: "File not found" }, 404);
  c.header("Content-Type", report.fileMime ?? "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${(report.fileName ?? "report.pdf").replace(/"/g, "")}"`);
  return c.body(new Uint8Array(buf));
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

// Long-running Node listen (Docker / npm start). Skip on Vercel serverless.
if (env.isProduction && !process.env.VERCEL) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
