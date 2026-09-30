import { ContactBoard } from "@/components/hub/contact-board";
import { getSession } from "@/lib/session";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string | string[] }> }) {
  const [user, { topic }] = await Promise.all([getSession(), searchParams]);
  const about = (Array.isArray(topic) ? topic[0] : (topic ?? "")).replace(/[^\p{L}\p{N} &'(),./-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return <ContactBoard name={user?.name ?? ""} email={user?.email ?? ""} topic={about} />;
}
