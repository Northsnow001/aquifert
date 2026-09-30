import { PageHeader } from "@/components/admin/ui";
import { WpImport } from "@/components/admin/wp-import";
import { defaultOptions, loadExport, loadState, pendingFiles, planImport, summarize } from "@/lib/wp-import/import";

export const maxDuration = 300;

export default async function ImportPage() {
  const data = await loadExport();
  const state = await loadState();
  let ready = null;
  if (data) {
    const options = defaultOptions(data, state);
    ready = { summary: summarize(data, state), options, sections: await planImport(data, options), pending: await pendingFiles(data) };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Import from WordPress"
        description="Bring Telex, indicators, hedge tables, freight routes, tools commentary, the library and Order Desk enquiries across from Aquifert One on WordPress. You can run it again at any time: items update in place instead of being duplicated."
      />
      <WpImport key={ready?.summary.uploadedAt ?? "none"} ready={ready} lastRunAt={state?.lastRun?.at ?? null} />
    </div>
  );
}
