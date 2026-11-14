import { NextResponse } from "next/server";
import { sendDeskAlert } from "@/lib/email/member-emails";
import { createClient } from "@/lib/supabase/server";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Emails noreply@aquifert.com once, after a new member finishes creating an account. */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const meta = user.user_metadata ?? {};
  if (meta.desk_notified === true) return NextResponse.json({ ok: true });

  const name = text(meta.full_name) || text(meta.name) || "New member";
  await sendDeskAlert({
    kind: "signup-admin",
    subject: `New account — ${name}`,
    heading: "New account",
    preheader: `${name} created an Aquifert account.`,
    rows: [
      ["Name", name],
      ["Email", user.email ?? ""],
      ["Phone", user.phone ?? text(meta.phone)],
      ["Company", text(meta.company)],
      ["Country", text(meta.country)],
    ],
  });
  await supabase.auth.updateUser({ data: { desk_notified: true } });
  return NextResponse.json({ ok: true });
}
