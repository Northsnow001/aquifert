export type SupplierRegistration = {
  code: string;
  email: string;
  status: "form_done";
  form_submitted_at: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE = /^[A-Z0-9-]{3,20}$/;

const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** "sup 002 " and "sup-002" both become "SUP-002"-style codes the sheet can match. */
export const normaliseSupplierCode = (v: unknown) => text(v, 40).toUpperCase().replace(/\s+/g, "");

/** The code and email come from the supplier's personal invite link; either may be missing. */
export function parseSupplierRegistration(
  body: Record<string, unknown>,
  now = new Date(),
): { ok: true; value: SupplierRegistration } | { ok: false; error: string } {
  if (body.consent !== true) return { ok: false, error: "Please tick the box to agree before submitting." };

  const code = normaliseSupplierCode(body.code);
  const email = text(body.email, 320).toLowerCase();
  return {
    ok: true,
    value: {
      code: CODE.test(code) ? code : "",
      email: EMAIL.test(email) ? email : "",
      status: "form_done",
      form_submitted_at: now.toISOString(),
    },
  };
}
