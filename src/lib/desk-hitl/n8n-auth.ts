import type { NextRequest } from "next/server";

/** n8n uses DESK_HITL_SECRET, or FIRM_ORDER_PDF_SECRET if that is already set. */
export function deskHitlAuthorized(req: NextRequest) {
  const secret = process.env.DESK_HITL_SECRET?.trim() || process.env.FIRM_ORDER_PDF_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("x-desk-hitl-secret") || req.headers.get("x-firm-order-secret") || "";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  return header === secret || bearer === secret;
}
