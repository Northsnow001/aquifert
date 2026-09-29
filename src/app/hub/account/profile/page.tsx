import { ProfileForm } from "@/components/hub/profile-form";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const params = await searchParams;
  return <ProfileForm user={user} saved={params.saved === "1"} />;
}
