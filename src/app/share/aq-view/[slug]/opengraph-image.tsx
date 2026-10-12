import { sharedNote } from "@/lib/share";
import { CARD_SIZE, shareCard } from "@/lib/share-card";

export const dynamic = "force-dynamic";
export const alt = "AQ View note on Aquifert ONE";
export const size = CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return shareCard(await sharedNote(slug));
}
