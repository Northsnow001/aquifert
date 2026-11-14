import { NextResponse } from "next/server";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { sendSignupCodes } from "@/lib/signup-codes";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Sends the email code and the SMS together for one new account. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Enter your details again." }, { status: 400 });
  }
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = text(raw.email, 320).toLowerCase();
  const phone = text(raw.phone, 32);
  const name = text(raw.name, 120);
  const company = text(raw.company, 160);
  const country = text(raw.country, 80);
  if (name.length < 2 || !EMAIL_PATTERN.test(email) || !company || !country || !phone) {
    return NextResponse.json({ message: "Enter your name, email, company, country, and phone number." }, { status: 400 });
  }

  const result = await sendSignupCodes({ email, phone, name, company, country });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
