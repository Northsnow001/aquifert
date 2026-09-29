import { ContactBoard } from "@/components/hub/contact-board";
import { getSession } from "@/lib/session";

export default async function ContactPage() {
  const user = await getSession();
  return <ContactBoard name={user?.name ?? ""} email={user?.email ?? ""} />;
}
