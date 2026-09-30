import { LibraryBoard } from "@/components/hub/library-board";
import { isFileListed } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getSession();
  const { libraryDocuments, collections } = getHubContent();
  const open = collections.filter((item) => !item.private);
  const openIds = new Set(open.map((item) => item.id));
  const documents = libraryDocuments
    .filter((file) => isFileListed(file, collections))
    .map((file) => ({ ...file, collectionIds: file.collectionIds.filter((id) => openIds.has(id)) }));
  const used = open.filter((item) => documents.some((file) => file.collectionIds.includes(item.id)));
  return <LibraryBoard documents={documents} collections={used} plan={user?.plan ?? "core"} />;
}
