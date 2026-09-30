import "server-only";

import { CircleAlert } from "lucide-react";
import { dataClient, isMissingTable } from "@/lib/data/db";

/** Warns when a member table from `005_aq_modules.sql` is not in Supabase yet: reads come back empty and saves fail. */
export async function MissingTableNotice({ table, what }: { table: string; what: string }) {
  const db = dataClient();
  if (!db) return null;
  const { error } = await db.from(table).select("id", { count: "exact", head: true });
  if (!error || !isMissingTable(error)) return null;
  return (
    <p className="mb-5 flex items-start gap-2 rounded-xl border border-[#f5dfb3] bg-[#fff8ea] px-4 py-2.5 text-[13px] font-medium text-[#9a5b00]">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        The <code className="font-mono text-[12px]">{table}</code> table is not in Supabase yet, so {what} stay empty and changes cannot be saved. Run{" "}
        <code className="font-mono text-[12px]">supabase/migrations/005_aq_modules.sql</code> in the Supabase SQL editor.
      </span>
    </p>
  );
}
