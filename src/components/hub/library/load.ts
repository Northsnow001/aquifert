import "server-only";

import { isAdminUser } from "@/lib/admin-access";
import { canReadTelex, isFileListed, type LibraryDocument } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";
import { dayKey, type LibraryFile } from "./model";

/** Files and collections the viewer may see. Admins can open any file, matching the download route. */
export async function loadLibrary() {
  const [user, { libraryDocuments, collections }] = await Promise.all([getSession(), getHubContent()]);
  const plan = user?.plan ?? "core";
  const admin = isAdminUser(user);
  const open = collections.filter((item) => !item.private);
  const openNames = new Map(open.map((item) => [item.id, item.name]));
  const allNames = new Map(collections.map((item) => [item.id, item.name]));

  const describe = (file: LibraryDocument, names: Map<string, string>): LibraryFile => {
    const collectionIds = file.collectionIds.filter((id) => names.has(id));
    return {
      ...file,
      collectionIds,
      collectionNames: collectionIds.map((id) => names.get(id)!),
      readable: admin || canReadTelex(file.access, plan),
      day: dayKey(file.updated),
    };
  };

  const files = libraryDocuments.filter((file) => isFileListed(file, collections)).map((file) => describe(file, openNames));

  const find = (id: string): LibraryFile | null => {
    const listed = files.find((file) => file.id === id);
    if (listed) return listed;
    const hidden = admin ? libraryDocuments.find((file) => file.id === id) : undefined;
    return hidden ? describe(hidden, allNames) : null;
  };

  return { admin, plan, files, collections: open, find };
}
