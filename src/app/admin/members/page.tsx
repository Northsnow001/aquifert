import { MembersDirectory } from "@/components/admin/members/members-directory";
import { PageHeader } from "@/components/admin/ui";
import { listMembers } from "@/lib/members";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [list, user] = await Promise.all([listMembers(), getSession()]);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Members"
        description="Everyone with an Aquifert ONE account. Make a member an admin from their row. Admins can open the admin console; built-in admins cannot be removed here."
      />
      {list.available ? (
        <MembersDirectory members={list.members} viewerId={user?.id ?? ""} />
      ) : (
        <div className="rounded-2xl border border-[#f2d9a0] bg-[#fffaf0] px-5 py-4 text-[13.5px] text-[#7a5200]">{list.reason}</div>
      )}
    </div>
  );
}
