const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** WeChat scene_str is at most 64 bytes. */
export const WECHAT_SCENE_MAX_BYTES = 64;

export function inviteEmail(raw: string | null | undefined) {
  return String(raw ?? "").trim().toLowerCase();
}

export function inviteScene(email: string, fallbackCode: string) {
  const scene = inviteEmail(email);
  if (!scene) return "";
  if (Buffer.byteLength(scene, "utf8") <= WECHAT_SCENE_MAX_BYTES) return scene;
  const code = String(fallbackCode || "").trim().toLowerCase();
  return Buffer.byteLength(code, "utf8") <= WECHAT_SCENE_MAX_BYTES ? code : "";
}

export function wechatTokenStillValid(expiresAtIso: string | null | undefined, nowMs = Date.now()) {
  if (!expiresAtIso) return false;
  const exp = Date.parse(expiresAtIso);
  if (!Number.isFinite(exp)) return false;
  return exp - nowMs > 5 * 60_000;
}

export function supplierInviteEligible(row: {
  email: string | null | undefined;
  code: string;
  wechatOpenid: string | null | undefined;
  onboardingStatus: string;
}) {
  const email = inviteEmail(row.email);
  if (!EMAIL.test(email)) return { ok: false as const, reason: "Add a valid email before inviting." };
  if (row.wechatOpenid?.trim() || row.onboardingStatus === "subscribed") {
    return { ok: false as const, reason: "Already on WeChat." };
  }
  if (row.onboardingStatus === "skipped") return { ok: false as const, reason: "Marked skipped." };
  const scene = inviteScene(email, row.code);
  if (!scene) return { ok: false as const, reason: "Email is too long for a WeChat QR scene." };
  return { ok: true as const, email, scene };
}

/** WF2 subscribe / SCAN: scene is email, new follows prefix it with qrscene_. */
export function parseWechatFollow(input: { openid?: unknown; email?: unknown; eventKey?: unknown; event?: unknown }) {
  const openid = String(input.openid ?? "").trim();
  const fromKey = String(input.eventKey ?? input.email ?? "")
    .replace(/^qrscene_/i, "")
    .trim()
    .toLowerCase();
  const email = inviteEmail(fromKey);
  const linked = Boolean(openid) && EMAIL.test(email);
  return { openid, email: linked ? email : "", linked };
}
