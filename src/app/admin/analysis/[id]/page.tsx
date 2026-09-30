import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AnalysisEditor } from "@/components/admin/aq-content/analysis-editor";
import { DeleteEntry } from "@/components/admin/aq-content/shared";
import { telexOptions } from "@/components/admin/aq-content/telex-options";
import { PageHeader, StatusBadge, btnSecondary } from "@/components/admin/ui";
import { getAqModules } from "@/lib/aq-modules/store";
import { deskNow, formatStamp } from "@/lib/content-types";

export const dynamic = "force-dynamic";

export default async function EditAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modules = await getAqModules();
  const note = modules.analysis.find((item) => item.id === id);
  if (!note) notFound();
  const telex = await telexOptions(note.relatedTelexIds);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Edit analysis note"
        description={`${note.status === "published" ? "Published" : "Draft"} · ${formatStamp(note.publishedAt)}`}
        crumbs={[{ href: "/admin/analysis", label: "AQ Market Analysis" }]}
        actions={
          <>
            <StatusBadge status={note.status} />
            {note.status === "published" ? (
              <Link href={`/hub/analysis/${note.slug}`} className={btnSecondary}>
                <ExternalLink className="h-4 w-4" />
                View on hub
              </Link>
            ) : null}
            <Link href="/admin/analysis/new" className={btnSecondary}>
              New note
            </Link>
            <DeleteEntry kind="analysis" id={note.id} name={note.title} redirectTo="/admin/analysis" />
          </>
        }
      />
      <AnalysisEditor key={note.id} note={note} defaultPublishedAt={deskNow()} slugs={modules.analysis.map((item) => ({ id: item.id, slug: item.slug }))} telex={telex} />
    </div>
  );
}
