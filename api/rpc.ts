/**
 * Vercel serves this file at exactly /api/rpc.
 * Dynamic /api/trpc/[procedure] was deployed as a literal path, so
 * /api/trpc/<procedure> fell through to index.html and POST returned 405.
 * Callers pass the procedure in ?trpcPath= and this rebuilds the Hono URL.
 */
// @ts-nocheck
import app from "../dist/boot.js";

type NodeReq = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>;
};

type NodeRes = {
  statusCode: number;
  setHeader: (name: string, value: string | string[]) => void;
  end: (body?: Buffer) => void;
};

function headerEntries(headers: NodeReq["headers"]): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) value.forEach((v) => out.push([key, v]));
    else out.push([key, value]);
  }
  return out;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  let trpcPath = "";
  let pathname = "/api/trpc";
  try {
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string) || "localhost";
    const incoming = new URL(req.url || "/", `${proto}://${host}`);
    trpcPath = incoming.searchParams.get("trpcPath") || "";
    incoming.searchParams.delete("trpcPath");
    pathname = trpcPath
      ? `/api/trpc/${trpcPath}`
      : incoming.pathname.startsWith("/api/trpc")
        ? incoming.pathname
        : "/api/trpc";
    const qs = incoming.searchParams.toString();
    const url = `${proto}://${host}${pathname}${qs ? `?${qs}` : ""}`;

    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const method = req.method || "GET";

    const request = new Request(url, {
      method,
      headers: headerEntries(req.headers),
      body: method === "GET" || method === "HEAD" || body.length === 0 ? undefined : body,
    });

    const response = await app.fetch(request);
    // #region agent log
    fetch("http://127.0.0.1:7493/ingest/4e11581d-7f60-4e24-b571-b73ce990ecc0",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"9db8e3"},body:JSON.stringify({sessionId:"9db8e3",runId:"post-fix",hypothesisId:"A",location:"api/rpc.ts:handler",message:"trpc function responded",data:{method,trpcPath,pathname,status:response.status},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    res.statusCode = response.status;

    const setCookies =
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });
    if (setCookies.length > 0) res.setHeader("set-cookie", setCookies);

    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (err) {
    const message = err instanceof Error ? err.message : "API error";
    // #region agent log
    fetch("http://127.0.0.1:7493/ingest/4e11581d-7f60-4e24-b571-b73ce990ecc0",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"9db8e3"},body:JSON.stringify({sessionId:"9db8e3",runId:"post-fix",hypothesisId:"A",location:"api/rpc.ts:catch",message:"trpc function threw",data:{trpcPath,pathname,message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(Buffer.from(JSON.stringify({ error: message })));
  }
}
