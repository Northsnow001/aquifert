import { NextResponse, type NextRequest } from "next/server";
import { emailReference } from "@/lib/email/brand";
import { sendContactReceipt } from "@/lib/email/member-emails";
import { createAdminClient, notifyAdmins } from "@/lib/supabase/admin";

const CHANNELS = {
  whatsapp: "WhatsApp",
  book_call: "Call booking",
  message: "Message",
  callback: "Callback request",
} as const;

type Channel = keyof typeof CHANNELS;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max = 255) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Public contact-page message (no account needed). Always notifies the desk. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const channel = str(body?.channel, 32) as Channel;
  const name = str(body?.name);
  const email = str(body?.email, 320);
  const company = str(body?.company) || null;
  const message = str(body?.message, 2000);

  if (!(channel in CHANNELS) || name.length < 2 || !EMAIL.test(email) || message.length < 4) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Contact form is not configured" }, { status: 503 });

  const reference = emailReference("C");
  const { error } = await db.from("contact_messages").insert({ channel, name, email, company, message: `Reference: ${reference}\n${message}` });
  if (error) return NextResponse.json({ error: "Could not send your message." }, { status: 500 });

  await notifyAdmins(
    db,
    "CONTACT_MESSAGE",
    `Contact page: ${CHANNELS[channel]}`,
    `${reference} · ${name} (${email}${company ? ", " + company : ""}): ${message.slice(0, 300)}`,
  );
  await sendContactReceipt({ name, email, message, reference, topic: CHANNELS[channel] });
  return NextResponse.json({ ok: true });
}
