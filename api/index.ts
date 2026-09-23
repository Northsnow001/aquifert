/**
 * Temporary minimal handler to verify Vercel function + rewrite wiring.
 * Replace with boot.js import once /api/health returns 200.
 */
export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  return Response.json({
    ok: true,
    path: url.pathname,
    method: req.method,
    probe: "minimal-api-index",
  });
}
