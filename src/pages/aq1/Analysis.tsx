import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";

/** AQ Market Analysis Feed — the desk's interpretation, separate from TELEX. */
export default function Aq1Analysis() {
  const { slug } = useParams();
  return slug ? <NoteDetail slug={slug} /> : <NoteList />;
}

function NoteList() {
  const tips = useAq1Tips();
  const q = trpc.aq1.analysis.useQuery({});
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">AQ Market Analysis Feed <InfoTip label="AQ Market Analysis Feed" text={tips.analysis} /></span>}
        description={q.data?.freshnessAsOf ? `What it means, not just what happened. Latest note ${new Date(q.data.freshnessAsOf).toLocaleDateString("en-GB")}.` : "What it means, not just what happened."}
      />
      {q.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>}
      {q.isError && <EmptyState title="Could not load the analysis feed" description="Something went wrong on our side. Retry in a moment." actionLabel="Retry" onAction={() => q.refetch()} />}
      {q.data && q.data.items.length === 0 && (
        <EmptyState title="No entries yet" description="The desk publishes most weekday mornings." />
      )}
      <div className="space-y-3">
        {q.data?.items.map((n) => (
          <Link key={n.id} to={`/account/analysis/${n.slug}`} className="block">
            <Card className="transition-colors hover:border-teal-500/50">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {n.products.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
                  {n.regions.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                </div>
                <h2 className="mt-2 text-lg font-semibold">{n.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{n.excerpt}…</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n.authorName} · {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString("en-GB") : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NoteDetail({ slug }: { slug: string }) {
  const q = trpc.aq1.analysisNote.useQuery({ slug });
  if (q.isLoading) return <div className="mx-auto max-w-3xl p-6"><Skeleton className="h-64 w-full" /></div>;
  if (q.isError || !q.data) return <div className="mx-auto max-w-3xl p-6"><EmptyState title="Note not found" description="It may have been unpublished." actionLabel="Back to the feed" onAction={() => history.back()} /></div>;
  const n = q.data;
  return (
    <article className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Link to="/account/analysis" className="text-sm text-teal-700 underline underline-offset-2 dark:text-teal-300">← All analysis</Link>
      <h1 className="text-2xl font-bold">{n.title}</h1>
      <p className="text-sm text-muted-foreground">{n.authorName} · {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString("en-GB") : ""}</p>
      {n.body.split(/\n\s*\n/).map((para, i) => <p key={i} className="leading-relaxed">{para}</p>)}
      {n.relatedTelex.length > 0 && (
        <aside className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">TELEX items this note interprets</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {n.relatedTelex.map((t) => <li key={t.id}>{t.title} ({new Date(t.createdAt).toLocaleDateString("en-GB")})</li>)}
          </ul>
        </aside>
      )}
    </article>
  );
}
