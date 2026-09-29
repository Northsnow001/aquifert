"use server";

import { saveEnquiry } from "@/app/(auth)/actions";

export async function submitOrderEnquiry(input: {
  product: string;
  quantity: string;
  origin: string;
  destination: string;
  incoterm: string;
  notes: string;
}) {
  const product = input.product.trim();
  const quantity = input.quantity.trim();
  const destination = input.destination.trim();
  if (!product || !quantity || !destination) {
    return { ok: false as const, message: "Product, quantity, and destination are required." };
  }
  const result = await saveEnquiry("order_enquiries", {
    product,
    quantity,
    origin: input.origin.trim(),
    destination,
    incoterm: input.incoterm.trim() || "CFR",
    notes: input.notes.trim(),
  });
  if (result.saved === "error") return { ok: false as const, message: result.message ?? "Could not submit the enquiry." };
  return { ok: true as const, delivered: result.saved === "remote" };
}
