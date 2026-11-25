import { NextResponse } from "next/server";
import Stripe from "stripe";
import { BillingError, applySubscriptionEvent, fulfillCheckoutSession, revokeIfIdle } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!key || !secret) return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });

  const stripe = new Stripe(key);
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.client_reference_id && session.id) {
        try {
          await fulfillCheckoutSession(session.client_reference_id, session.id);
        } catch (error) {
          if (!(error instanceof BillingError) || (error.code !== "incomplete" && error.code !== "forbidden")) throw error;
        }
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      await applySubscriptionEvent(event.data.object);
    } else if (event.type === "customer.subscription.deleted") {
      const id = customerId(event.data.object.customer);
      if (id) await revokeIfIdle(id);
    }
  } catch (error) {
    console.error("stripe webhook", event.type, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
