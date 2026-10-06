import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { deleteTelex, duplicateTelex } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/form-controls";
import { TelexEditor } from "@/components/admin/telex-editor";
import { Flash, PageHeader, btnDanger, btnSecondary } from "@/components/admin/ui";
import { formatStamp } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  published: "Published. Members see this message on the hub now.",
  draft: "Draft saved. Members do not see it until you publish.",
  private: "Saved as private. Only admins can see it.",
};

export default async function EditTelexPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, getSession()]);
  const telex = (await getHubContent()).telex;
  const item = telex.find((entry) => entry.id === id);
  if (!item) notFound();
  const knownTags = Array.from(new Set(telex.flatMap((entry) => entry.tags))).sort((a, b) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Edit Telex message"
        description={`Last saved ${formatStamp(item.updatedAt)}`}
        crumbs={[{ href: "/admin/telex", label: "Telex" }]}
        actions={
          <form className="flex gap-2">
            <input type="hidden" name="id" value={item.id} />
            <Link href="/admin/telex/new" className={btnSecondary}>
              New message
            </Link>
            <button type="submit" formAction={duplicateTelex} className={btnSecondary}>
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
            <ConfirmSubmit formAction={deleteTelex} message="Delete this Telex message? Members will no longer see it." className={btnDanger}>
              <Trash2 className="h-4 w-4" />
              Delete
            </ConfirmSubmit>
          </form>
        }
      />
      <Flash saved={query.saved ? SAVED[query.saved] ?? SAVED.published : undefined} message={query.saved ? SAVED[query.saved] : undefined} />
      <Flash
        error={query.error}
        message={query.error === "thumb" ? "The message saved, but the thumbnail did not. Use a JPG, PNG, WebP or GIF under 3 MB, or an image link that starts with https://." : "Write the message body before saving."}
      />
      <TelexEditor key={`${item.id}-${item.updatedAt}`} item={item} knownTags={knownTags} defaultAuthor={user?.name ?? "Aquifert Desk"} />
    </div>
  );
}
