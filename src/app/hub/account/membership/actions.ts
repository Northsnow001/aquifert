"use server";

import { revalidatePath } from "next/cache";
import { isPlan } from "@/components/hub/plans/shared";
import { getHubAccess } from "@/lib/aq-modules/access";
import { isCycle, isTier, TIER_LABEL } from "@/lib/aq-modules/membership";
import { addMembershipRequest } from "@/lib/aq-modules/members";
import { PLAN_LABEL } from "@/lib/aq-modules/types";

type Result = { ok: true; email: string } | { ok: false; message: string };

export async function requestPlan(input: {
  requestedPlan: string;
  tier?: string | null;
  cycle?: string | null;
  company: string;
  message: string;
  source: string;
}): Promise<Result> {
  const { user } = await getHubAccess();
  const requestedPlan = input?.requestedPlan;
  if (!isPlan(requestedPlan)) return { ok: false, message: "Choose the plan you would like." };
  const tier = requestedPlan === "enterprise" && isTier(input.tier) ? input.tier : null;
  if (requestedPlan === "enterprise" && !tier) return { ok: false, message: "Choose AQ Sprout, AQ Harvest or AQ Scale." };
  if (requestedPlan === user.plan && !tier) {
    return { ok: false, message: `You are already on ${PLAN_LABEL[requestedPlan]}. Choose a different plan, or message the desk from Contact Us.` };
  }
  const cycle = requestedPlan !== "core" && isCycle(input.cycle) ? input.cycle : null;
  const source = String(input.source ?? "").trim();
  const note = String(input.message ?? "").trim().slice(0, 1000);
  try {
    await addMembershipRequest({
      userId: user.id,
      email: user.email,
      name: user.name,
      company: String(input.company ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
      currentPlan: user.plan,
      requestedPlan,
      tier,
      cycle,
      source: /^[a-z0-9-]{1,40}$/.test(source) ? source : "",
      message: note || (tier && requestedPlan === user.plan ? `Move my membership to ${TIER_LABEL[tier]}.` : ""),
    });
    revalidatePath("/hub/account/membership");
    return { ok: true, email: user.email };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && /table is missing/.test(error.message)
          ? "Plan requests need the latest database update. Ask the desk to run it, or message them from Contact Us in the meantime."
          : "Your request could not be sent just now. Try again, or message the desk from Contact Us.",
    };
  }
}
