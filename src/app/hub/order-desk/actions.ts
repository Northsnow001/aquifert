"use server";

import { saveEnquiry } from "@/app/(auth)/actions";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { orderSections, orderVars, type OrderSubmission } from "@/lib/desk-settings/forms";
import { notifySubmission } from "@/lib/desk-settings/notify";
import { listInbox } from "@/lib/inbox";
import { getSession } from "@/lib/session";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;

type OrderInput = Omit<OrderSubmission, "submittedAt"> & { website?: string };

const REQUIRED: [keyof Omit<OrderSubmission, "submittedAt">, string][] = [
  ["name", "your name"],
  ["email", "your email"],
  ["product", "a product"],
  ["quantity", "a quantity"],
  ["packaging", "packaging"],
  ["destination", "a destination"],
  ["shipFrom", "the shipping period start"],
  ["shipTo", "the shipping period end"],
  ["targetPrice", "a target price"],
  ["paymentTerms", "payment terms"],
];

export async function submitOrderEnquiry(input: OrderInput) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Your session has ended. Sign in again to send the enquiry." };
  if (input.website?.trim()) return { ok: true as const };

  const order = Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key !== "website")
      .map(([key, value]) => [key, String(value ?? "").trim().slice(0, key === "notes" ? 4000 : 300)]),
  ) as Omit<OrderSubmission, "submittedAt">;
  const missing = REQUIRED.filter(([key]) => !order[key]).map(([, text]) => text);
  if (missing.length) return { ok: false as const, message: `Add ${missing.join(", ")}.` };
  if (!EMAIL_PATTERN.test(order.email)) return { ok: false as const, message: "Enter a valid email address." };
  if (!(Number(order.quantity) > 0)) return { ok: false as const, message: "Enter the quantity in metric tonnes." };
  if (order.shipTo < order.shipFrom) return { ok: false as const, message: "The shipping period ends before it starts." };

  const account = user.email.toLowerCase();
  const since = Date.now() - WINDOW_MS;
  const recent = listInbox().filter((item) => item.table === "order_enquiries" && item.payload.account === account && Date.parse(item.at) > since).length;
  if (recent >= MAX_IN_WINDOW) return { ok: false as const, message: "You have sent several enquiries in the last few minutes. Wait a little, then try again." };

  const submission: OrderSubmission = { ...order, submittedAt: new Date().toISOString() };
  const notes = [
    `Name: ${order.name}`,
    `Email: ${order.email}`,
    order.company && `Company: ${order.company}`,
    order.grade && `Grade: ${order.grade}`,
    `Packaging: ${order.packaging}`,
    `Pallets: ${order.pallets || "no"}`,
    `Shipping: ${order.shipFrom} to ${order.shipTo}`,
    `Target: ${order.currency} ${order.targetPrice} ${order.incoterm}`,
    order.prepayment && `Prepayment: ${order.prepayment}%`,
    `Payment: ${order.paymentTerms}`,
    order.frequency && `Frequency: ${order.frequency}`,
    order.notes,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await saveEnquiry(
    "order_enquiries",
    { product: order.grade ? `${order.product} (${order.grade})` : order.product, quantity: order.quantity, origin: order.origins, destination: order.destination, incoterm: order.incoterm || "CFR", notes },
    {
      name: order.name,
      email: order.email,
      company: order.company,
      packaging: `${order.packaging}${order.pallets === "yes" ? ", palletised" : ""}`,
      shipping: `${order.shipFrom} to ${order.shipTo}`,
      target: `${order.currency} ${order.targetPrice} ${order.incoterm}`,
      payment: [order.paymentTerms, order.prepayment && `${order.prepayment}% prepaid`].filter(Boolean).join(" · "),
      frequency: order.frequency,
      notes: order.notes,
      account,
    },
  );
  if (result.saved === "error") return { ok: false as const, message: result.message ?? "The enquiry could not be sent. Try again in a moment." };

  await notifySubmission("order", {
    vars: orderVars(submission),
    sections: orderSections(submission),
    applicantEmail: order.email,
    adminPath: "/admin/enquiries?type=order",
  });
  return { ok: true as const };
}
