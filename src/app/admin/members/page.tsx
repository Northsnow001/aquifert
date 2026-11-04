import { CreateMemberForm } from "@/components/admin/members/create-member-form";
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
        description="Create an account and send an invitation, or grant admin from a member's row. Built-in admins cannot be removed here."
      />
      {list.available ? <CreateMemberForm /> : null}
      {list.available ? (
        <MembersDirectory members={list.members} viewerId={user?.id ?? ""} />
      ) : (
        <div className="rounded-2xl border border-[#f2d9a0] bg-[#fffaf0] px-5 py-4 text-[13.5px] text-[#7a5200]">{list.reason}</div>
      )}
    </div>
  );
}
