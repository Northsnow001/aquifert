"use server";

import { saveEnquiry } from "@/app/(auth)/actions";
import { EMAIL_PATTERN } from "@/lib/desk-settings/email-rules";
import { monthLabel, orderSections, orderVars, type OrderSubmission } from "@/lib/desk-settings/forms";
import { notifySubmission } from "@/lib/desk-settings/notify";
import { activePorts, getFreightDesk } from "@/lib/freight-desk/store";
import { resolvePort, portText } from "@/lib/ports";
import { listInbox } from "@/lib/inbox";
import { getSession } from "@/lib/session";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_IN_WINDOW = 5;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

type OrderInput = Omit<OrderSubmission, "submittedAt"> & { website?: string };

const REQUIRED: [keyof Omit<OrderSubmission, "submittedAt">, string][] = [
  ["name", "your name"],
  ["email", "your email"],
  ["product", "a product"],
  ["quantity", "a quantity"],
  ["packaging", "packaging"],
  ["destination", "a destination"],
  ["shipFrom", "the preferred shipment month"],
  ["shipTo", "the preferred arrival month"],
];

export async function submitOrderEnquiry(input: OrderInput) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Your session has ended. Sign in again to send the enquiry." };
  if (input.website?.trim()) return { ok: true as const };

  const order = Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => key !== "website")
      .map(([key, value]) => [key, String(value ?? "").trim().slice(0, key === "notes" ? 4000 : key === "product" ? 600 : 300)]),
  ) as Omit<OrderSubmission, "submittedAt">;
  const missing = REQUIRED.filter(([key]) => !order[key]).map(([, text]) => text);
  if (missing.length) return { ok: false as const, message: `Add ${missing.join(", ")}.` };
  if (!EMAIL_PATTERN.test(order.email)) return { ok: false as const, message: "Enter a valid email address." };
  if (!(Number(order.quantity) > 0)) return { ok: false as const, message: "Enter the quantity in metric tonnes." };
  const port = resolvePort(order.destination, activePorts(await getFreightDesk()));
  if (!port) return { ok: false as const, message: "Choose a destination port from the list." };
  order.destination = portText(port);
  if (!MONTH.test(order.shipFrom) || !MONTH.test(order.shipTo)) return { ok: false as const, message: "Choose the shipment and arrival months from the lists." };
  if (order.shipTo < order.shipFrom) return { ok: false as const, message: "The arrival month is before the shipment month." };
  if (![order.largeVolume, order.wantsCall].every((answer) => answer === "yes" || answer === "no"))
    return { ok: false as const, message: "Answer the two questions under Additional information." };

  const account = user.email.toLowerCase();
  const since = Date.now() - WINDOW_MS;
  const recent = (await listInbox()).filter((item) => item.table === "order_enquiries" && item.payload.account === account && Date.parse(item.at) > since).length;
  if (recent >= MAX_IN_WINDOW) return { ok: false as const, message: "You have sent several enquiries in the last few minutes. Wait a little, then try again." };

  const submission: OrderSubmission = { ...order, submittedAt: new Date().toISOString() };
  const notes = [
    `Name: ${order.name}`,
    `Email: ${order.email}`,
    order.company && `Company: ${order.company}`,
    order.grade && `Grade: ${order.grade}`,
    `Packaging: ${order.packaging}`,
    `Pallets: ${order.pallets || "no"}`,
    `Customised packaging: ${order.customPackaging || "no"}`,
    `Shipment month: ${monthLabel(order.shipFrom)}`,
    `Arrival month: ${monthLabel(order.shipTo)}`,
    `Incoterm: ${order.incoterm || "CFR"}`,
    `Over 1,000 t a year: ${order.largeVolume}`,
    `Interested in a call: ${order.wantsCall}`,
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
      packaging: `${order.packaging}${order.pallets === "yes" ? ", palletised" : ""}${order.customPackaging === "yes" ? ", customised" : ""}`,
      shipping: `Ships ${monthLabel(order.shipFrom)}, arrives ${monthLabel(order.shipTo)}`,
      volume: order.largeVolume,
      call: order.wantsCall,
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
