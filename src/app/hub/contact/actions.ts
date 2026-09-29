"use server";

import { saveEnquiry } from "@/app/(auth)/actions";

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
  const result = await saveEnquiry("contact_messages", {
    channel: "message",
    name,
    email,
    company,
    message,
  });
  if (result.saved === "error") return { ok: false as const, message: result.message ?? "Could not send your message." };
  return { ok: true as const, delivered: result.saved === "remote" };
}
