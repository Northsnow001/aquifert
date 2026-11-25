import "server-only";

import { headers } from "next/headers";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/session-shared";
import { checkoutCancelPath, isBillingOffer, offerAccess, offerForPrice, priceIdFor, productHome, type BillingOffer } from "@/lib/billing/catalog";

export class BillingError extends Error {
  constructor(public code: "missing_key" | "missing_price" | "stripe" | "forbidden" | "incomplete" | "portal") {
    super(code);
  }
}

type BillingRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new BillingError("missing_key");
  return new Stripe(key);
}

async function origin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function billingRow(userId: string): Promise<BillingRow | null> {
  const db = createAdminClient();
  if (!db) throw new BillingError("stripe");
  const { data, error } = await db.from("profiles").select("stripe_customer_id, stripe_subscription_id").eq("id", userId).maybeSingle();
  if (error) throw new BillingError("stripe");
  return data;
}

/** Opens the membership as soon as Stripe has an active subscription. Safe to call from the return page and the webhook. */
export async function grantSubscription(input: { userId: string; offer: BillingOffer; customerId: string; subscriptionId: string }) {
  const db = createAdminClient();
  if (!db) throw new BillingError("stripe");
  const access = offerAccess(input.offer);
  const { error } = await db
    .from("profiles")
    .update({
      plan: access.plan,
      membership_tier: access.tier,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscriptionId,
    })
    .eq("id", input.userId);
  if (error) throw new BillingError("stripe");
}

/** Drops a cancelled subscription back to AQ ONE, unless another active subscription remains. */
export async function revokeIfIdle(customerId: string) {
  const stripe = stripeClient();
  const db = createAdminClient();
  if (!db) throw new BillingError("stripe");
  const active = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
  if (active.data.length) return;
  const trialing = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
  if (trialing.data.length) return;
  const { error } = await db
    .from("profiles")
    .update({ plan: "core", membership_tier: null, stripe_subscription_id: null })
    .eq("stripe_customer_id", customerId);
  if (error) throw new BillingError("stripe");
}

async function cancelOtherSubscriptions(customerId: string, keepId: string) {
  const stripe = stripeClient();
  const listed = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  await Promise.all(
    listed.data
      .filter((subscription) => subscription.id !== keepId && (subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due"))
      .map((subscription) => stripe.subscriptions.cancel(subscription.id)),
  );
}

export async function beginCheckout(user: SessionUser, offer: BillingOffer) {
  const price = priceIdFor(offer);
  if (!price) throw new BillingError("missing_price");
  const stripe = stripeClient();
  const row = await billingRow(user.id);
  const site = await origin();
  const metadata = { userId: user.id, offer };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    ...(row?.stripe_customer_id ? { customer: row.stripe_customer_id } : { customer_email: user.email }),
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    metadata,
    subscription_data: { metadata },
    success_url: `${site}/hub/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}${checkoutCancelPath(offer)}`,
  });
  if (!session.url) throw new BillingError("stripe");
  return session.url;
}

/** Confirms a Checkout Session belongs to this member and opens the product. */
export async function fulfillCheckoutSession(userId: string, sessionId: string) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId) throw new BillingError("forbidden");
  if (session.status !== "complete") throw new BillingError("incomplete");
  const offer = session.metadata?.offer;
  const customerId = customerIdOf(session.customer);
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!isBillingOffer(offer) || !customerId || !subscriptionId) throw new BillingError("incomplete");
  await grantSubscription({ userId, offer, customerId, subscriptionId });
  await cancelOtherSubscriptions(customerId, subscriptionId);
  return productHome(offer);
}

export async function applySubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer);
  if (!customerId) return;
  const alive = subscription.status === "active" || subscription.status === "trialing";
  if (!alive) {
    if (subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "incomplete_expired") {
      await revokeIfIdle(customerId);
    }
    return;
  }
  const priceId = subscription.items.data[0]?.price.id;
  const offer = (isBillingOffer(subscription.metadata?.offer) ? subscription.metadata.offer : null) ?? (priceId ? offerForPrice(priceId) : null);
  const userId = subscription.metadata?.userId;
  if (!offer || !userId) return;
  await grantSubscription({ userId, offer, customerId, subscriptionId: subscription.id });
}

export async function beginPortal(userId: string) {
  const stripe = stripeClient();
  const row = await billingRow(userId);
  if (!row?.stripe_customer_id) throw new BillingError("portal");
  const site = await origin();
  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${site}/hub/account/billing`,
  });
  return session.url;
}
