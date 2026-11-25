import { redirect } from "next/navigation";
import { BillingError, fulfillCheckoutSession } from "@/lib/billing/stripe";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Stripe sends the member here after checkout. Access is granted only after Stripe confirms the session. */
export default async function BillingReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const user = await getSession();
  if (!user) redirect("/login?redirect_to=/hub/account/billing");
  if (!sessionId) redirect("/hub/account/billing?billing=incomplete");
  try {
    redirect(await fulfillCheckoutSession(user.id, sessionId));
  } catch (error) {
    if (typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw error;
    const code = error instanceof BillingError ? error.code : "stripe";
    redirect(`/hub/account/billing?billing=${code}`);
  }
}
