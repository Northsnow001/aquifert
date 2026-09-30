import { Info } from "lucide-react";
import { MissingTableNotice } from "@/components/admin/aq-data/table-notice";
import { RequestsPanel } from "@/components/admin/aq-data/requests-panel";
import { PageHeader } from "@/components/admin/ui";
import { listMembershipRequests } from "@/lib/aq-modules/members";

export const dynamic = "force-dynamic";

export default async function MembershipRequestsAdminPage() {
  const rows = await listMembershipRequests();
  const fresh = rows.filter((row) => row.status === "new").length;
  const contacted = rows.filter((row) => row.status === "contacted").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Membership requests"
        description={`Members asking for a higher plan, from a locked AQ module or the Membership page. ${fresh ? `${fresh} new` : "Nothing new"}${contacted ? `, ${contacted} contacted and waiting` : ""}.`}
      />

      <MissingTableNotice table="membership_requests" what="requests" />

      <p className="mb-5 flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed text-mid">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <span>
          Change the member&apos;s plan in Supabase, then mark the request done. The plan is the <code className="font-mono text-[12px] text-ink">plan</code> column on the member&apos;s row in the{" "}
          <code className="font-mono text-[12px] text-ink">profiles</code> table (Table Editor, match the account id shown on the request), set to{" "}
          <code className="font-mono text-[12px] text-ink">core</code>, <code className="font-mono text-[12px] text-ink">growth</code> or <code className="font-mono text-[12px] text-ink">enterprise</code> (shown to members as AQ ONE, AQ Analytics and AQ ZERO). It is not
          read from user metadata, and the member sees the new plan on their next page load.
        </span>
      </p>

      <RequestsPanel rows={rows} />
    </div>
  );
}
