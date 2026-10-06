"use server";

import { saveEnquiry } from "@/app/(auth)/actions";
import { emailReference } from "@/lib/email/brand";
import { sendContactReceipt } from "@/lib/email/member-emails";

export async function sendContactMessage(input: {
  name: string;
  email: string;
  company: string;
  message: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim();
  const company = input.company.trim();
  const message = input.message.trim();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 4) {
    return { ok: false as const, message: "Check your name, email, and message, then try again." };
  }
  const reference = emailReference("C");
  const result = await saveEnquiry("contact_messages", {
    channel: "message",
    name,
    email,
    company,
    message: `Reference: ${reference}\n${message}`,
  });
  if (result.saved === "error") return { ok: false as const, message: result.message ?? "Could not send your message." };
  await sendContactReceipt({ name, email, message, reference });
  return { ok: true as const, delivered: result.saved === "remote" };
}
