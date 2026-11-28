import { redirect } from "next/navigation";

export default async function LegacyTradePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  redirect(`/hub/trade/${encodeURIComponent(ref)}`);
}
