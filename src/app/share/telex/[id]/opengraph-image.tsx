import { sharedTelex } from "@/lib/share";
import { CARD_SIZE, shareCard } from "@/lib/share-card";

export const dynamic = "force-dynamic";
export const alt = "TELEX flash on Aquifert ONE";
export const size = CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return shareCard(await sharedTelex(id));
}
