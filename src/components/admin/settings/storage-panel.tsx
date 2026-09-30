import { CheckCircle2, CircleAlert, Database, HardDrive } from "lucide-react";
import { Panel } from "@/components/admin/aquibot/shared";
import type { StorageStatus } from "@/lib/data/status";

const code = "rounded bg-s2 px-1.5 py-0.5 font-mono text-[11.5px] text-ink";

export function StoragePanel({ status }: { status: StorageStatus }) {
  const failing = status.checks.filter((check) => !check.ok).length;

  if (status.backend === "local") {
    return (
      <Panel title="Data storage" description="Where admin content, member logs and library files are kept." icon={<HardDrive className="h-4 w-4" />}>
        <div className={`rounded-xl px-4 py-3 text-[13px] ${status.hosted ? "bg-[#fdecec] text-[#b42318]" : "bg-[#fff6e5] text-[#9a5b00]"}`}>
          <p className="font-semibold">{status.hosted ? "Supabase is not connected on this deployment, so nothing can be saved." : "Saving to files on this computer, under data/."}</p>
          <p className="mt-1 leading-relaxed">
            Set <span className={code}>NEXT_PUBLIC_SUPABASE_URL</span> and <span className={code}>SUPABASE_SERVICE_ROLE_KEY</span> on the server, then restart it. Every module then reads and writes
            Supabase.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Data storage"
      description="Every module reads and writes Supabase. Each line checks one table or bucket right now."
      icon={<Database className="h-4 w-4" />}
    >
      {failing ? (
        <p className="mb-4 rounded-xl bg-[#fdecec] px-4 py-3 text-[13px] text-[#b42318]">
          {failing} {failing === 1 ? "check fails" : "checks fail"}. Run <span className={code}>supabase/migrations/003_app_data.sql</span> in the Supabase SQL editor, then reload this page.
        </p>
      ) : (
        <p className="mb-4 rounded-xl bg-[#e7f6ec] px-4 py-3 text-[13px] text-[#1f7a45]">All tables and the library bucket are in place.</p>
      )}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {status.checks.map((check) => (
          <li key={check.name} className="flex items-center gap-3 px-4 py-2.5">
            {check.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1f7a45]" /> : <CircleAlert className="h-4 w-4 shrink-0 text-danger" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{check.label}</span>
              <span className="block font-mono text-[11px] text-dim">{check.name}</span>
            </span>
            <span className={`text-right text-[12px] ${check.ok ? "text-mid" : "text-danger"}`}>{check.detail}</span>
          </li>
        ))}
      </ul>
      {status.localFiles.length ? (
        <div className="mt-4 rounded-xl bg-blue-light/60 px-4 py-3 text-[12.5px] text-blue">
          <p className="font-semibold">This computer still has data saved before the move ({status.localFiles.length} files in data/).</p>
          <p className="mt-1 leading-relaxed">
            Copy it across with <span className={code}>npm run data:push</span> to preview, then <span className={code}>npm run data:push -- --apply</span>.
          </p>
        </div>
      ) : null}
    </Panel>
  );
}
