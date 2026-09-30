import { redirect } from "next/navigation";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  redirect(plan ? `/hub/membership?plan=${encodeURIComponent(plan)}` : "/hub/membership");
}
