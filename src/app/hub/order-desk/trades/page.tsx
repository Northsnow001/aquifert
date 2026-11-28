import { redirect } from "next/navigation";

export default async function LegacyTradesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab && tab !== "active" ? `/hub/trade?tab=${encodeURIComponent(tab)}` : "/hub/trade");
}
