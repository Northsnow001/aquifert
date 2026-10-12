import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShareTeaser } from "@/components/share/share-teaser";
import { getSession } from "@/lib/session";
import { shareMetadata, sharedTelex } from "@/lib/share";
import { hubPathFor } from "@/lib/share-links";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/share/telex/[id]">): Promise<Metadata> {
  const { id } = await params;
  return shareMetadata(await sharedTelex(id));
}

export default async function SharedTelexPage({ params }: PageProps<"/share/telex/[id]">) {
  const { id } = await params;
  const post = await sharedTelex(id);
  if (!post) notFound();
  if (await getSession().catch(() => null)) redirect(hubPathFor("telex", id));
  return <ShareTeaser post={post} />;
}
