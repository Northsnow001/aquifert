import "server-only";

import type { TelexOption } from "@/components/admin/aq-content/options";
import { telexHeadline } from "@/lib/content-types";
import { getHubContent, sortTelex } from "@/lib/hub-content";

/** The latest 50 Telex, plus any older ones the note already links to. */
export async function telexOptions(linked: string[] = []): Promise<TelexOption[]> {
  const all = sortTelex((await getHubContent()).telex);
  const latest = all.slice(0, 50);
  const keep = new Set(latest.map((item) => item.id));
  const older = all.filter((item) => !keep.has(item.id) && linked.includes(item.id));
  return [...latest, ...older].map((item) => ({ id: item.id, headline: telexHeadline(item), publishedAt: item.publishedAt }));
}
