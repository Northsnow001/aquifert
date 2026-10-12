import { MembersDirectory } from "@/components/admin/members/members-directory";
import { PageHeader } from "@/components/admin/ui";
import { listMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const list = await listMembers();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Members"
        description="Everyone with an Aquifert ONE account, sorted into work email (company, education, government) and personal or public email (Gmail, Yahoo, internet providers)."
      />
      {list.available ? (
        <MembersDirectory members={list.members} />
      ) : (
        <div className="rounded-2xl border border-[#f2d9a0] bg-[#fffaf0] px-5 py-4 text-[13.5px] text-[#7a5200]">{list.reason}</div>
      )}
    </div>
  );
}
