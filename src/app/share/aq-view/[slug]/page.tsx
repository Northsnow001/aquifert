import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShareTeaser } from "@/components/share/share-teaser";
import { getSession } from "@/lib/session";
import { shareMetadata, sharedNote } from "@/lib/share";
import { hubPathFor } from "@/lib/share-links";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/share/aq-view/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return shareMetadata(await sharedNote(slug));
}

export default async function SharedNotePage({ params }: PageProps<"/share/aq-view/[slug]">) {
  const { slug } = await params;
  const post = await sharedNote(slug);
  if (!post) notFound();
  if (await getSession().catch(() => null)) redirect(hubPathFor("aq-view", slug));
  return <ShareTeaser post={post} />;
}
