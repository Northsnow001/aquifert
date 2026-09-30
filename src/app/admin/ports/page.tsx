import { Download } from "lucide-react";
import { PortsManager } from "@/components/admin/ports/ports-manager";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import { COUNTRIES } from "@/lib/flags";
import { auditPorts, type PortIssue } from "@/lib/freight-desk/port-quality";
import { getFreightDesk, listCalcLogs, seedPorts } from "@/lib/freight-desk/store";

export const dynamic = "force-dynamic";

export default async function PortsAdminPage() {
  const desk = await getFreightDesk();
  const issues: Record<string, PortIssue[]> = Object.fromEntries(auditPorts(desk.ports));
  const usage: Record<string, { quotes: number; fixtures: number }> = {};
  const bump = (code: string, key: "quotes" | "fixtures") => {
    if (!code) return;
    usage[code] ??= { quotes: 0, fixtures: 0 };
    usage[code][key] += 1;
  };
  for (const log of await listCalcLogs()) {
    bump(log.load.code, "quotes");
    bump(log.discharge.code, "quotes");
  }
  for (const fixture of desk.fixtures) {
    bump(fixture.loadCode, "fixtures");
    bump(fixture.dischargeCode, "fixtures");
  }
  const countries = Array.from(new Set([...COUNTRIES, ...desk.ports.map((port) => port.country)])).sort((a, b) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Ports"
        description="The port registry behind the freight and netback calculators. Inactive ports disappear from member search, and every port is checked for code, region and coordinate problems."
        crumbs={[{ href: "/admin/freight-calculator", label: "Freight Calculator" }]}
        actions={
          <a href="/admin/ports/export" className={btnSecondary}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        }
      />
      <PortsManager ports={desk.ports} issues={issues} usage={usage} customized={desk.portsCustomized} seedCount={seedPorts().length} countries={countries} />
    </div>
  );
}
