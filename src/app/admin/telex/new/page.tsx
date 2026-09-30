import { TelexEditor } from "@/components/admin/telex-editor";
import { Flash, PageHeader } from "@/components/admin/ui";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewTelexPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const user = await getSession();
  const knownTags = Array.from(new Set((await getHubContent()).telex.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b));
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="New Telex message" crumbs={[{ href: "/admin/telex", label: "Telex" }]} />
      <Flash error={params.error} message="Write the message body before saving." />
      <TelexEditor knownTags={knownTags} defaultAuthor={user?.name ?? "Aquifert Desk"} />
    </div>
  );
}
