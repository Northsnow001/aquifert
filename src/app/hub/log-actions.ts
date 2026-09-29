"use server";

import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function logCalculation(
  calculator: "freight" | "netback",
  input: Record<string, unknown>,
  output: Record<string, unknown>,
) {
  const supabase = await createClient();
  const session = await getSession();
  if (!supabase || !session || session.id === "demo") return;
  await supabase.from("calculation_logs").insert({
    user_id: session.id,
    calculator,
    input,
    output,
  });
}
