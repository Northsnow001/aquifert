import { BriefingEditor } from "@/components/admin/aq-content/briefing-editor";
import { PageHeader } from "@/components/admin/ui";
import { deskNow } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export default function NewBriefingPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="New Briefing issue" crumbs={[{ href: "/admin/briefing", label: "The Briefing" }]} />
      <BriefingEditor defaultDate={deskNow().slice(0, 10)} />
    </div>
  );
}
