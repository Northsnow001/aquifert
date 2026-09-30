import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { BriefingEditor } from "@/components/admin/aq-content/briefing-editor";
import { DeleteEntry } from "@/components/admin/aq-content/shared";
import { PageHeader, StatusBadge, btnSecondary } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";
import { deskNow, formatDay } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export default async function EditBriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = (await getAqModules()).briefings.find((item) => item.id === id);
  if (!issue) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Edit Briefing issue"
        description={`${issue.status === "published" ? "Published" : "Draft"} · ${formatDay(issue.date)}`}
        crumbs={[{ href: "/admin/briefing", label: "The Briefing" }]}
        actions={
          <>
            <StatusBadge status={issue.status} />
            {issue.status === "published" ? (
              <Link href="/hub/analytics/briefing" className={btnSecondary}>
                <ExternalLink className="h-4 w-4" />
                View on hub
              </Link>
            ) : null}
            <Link href="/admin/briefing/new" className={btnSecondary}>
              New issue
            </Link>
            <DeleteEntry kind="briefing" id={issue.id} name={issue.title} redirectTo="/admin/briefing" />
          </>
        }
      />
      <BriefingEditor key={issue.id} issue={issue} defaultDate={deskNow().slice(0, 10)} />
    </div>
  );
}
