"use server";

import { redirect } from "next/navigation";
import { BillingError, beginCheckout, beginPortal } from "@/lib/billing/stripe";
import { checkoutCancelPath, isBillingOffer } from "@/lib/billing/catalog";
import { getSession } from "@/lib/session";

function redirectError(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

/** Sends the member to Stripe Checkout for AQ Analytics or an AQ Zero tier. */
export async function startCheckout(form: FormData) {
  const raw = String(form.get("offer") ?? "");
  const offer = isBillingOffer(raw) ? raw : null;
  const back = offer ? checkoutCancelPath(offer) : "/hub/account/membership";
  const user = await getSession();
  if (!user) redirect(`/login?redirect_to=${encodeURIComponent(back)}`);
  if (!offer) redirect("/hub/account/membership?billing=invalid");
  try {
    const url = await beginCheckout(user, offer);
    redirect(url);
  } catch (error) {
    if (redirectError(error)) throw error;
    const code = error instanceof BillingError ? error.code : "stripe";
    redirect(`${back}?billing=${code}`);
  }
}

/** Opens Stripe's customer portal so the member can update the card or cancel. */
export async function openBillingPortal() {
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/hub/account/billing");
  try {
    redirect(await beginPortal(user.id));
  } catch (error) {
    if (redirectError(error)) throw error;
    redirect("/hub/account/billing?billing=portal");
  }
}
