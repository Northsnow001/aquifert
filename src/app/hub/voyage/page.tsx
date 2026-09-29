export default function VoyagePage() {
  const lanes = [
    { lane: "AG to Brazil", vessel: "Supramax", rate: "$42–46", change: "+1.5" },
    { lane: "Baltic to ECSA", vessel: "Handymax", rate: "$38–41", change: "-0.5" },
    { lane: "US Gulf to India", vessel: "Panamax", rate: "$48–52", change: "+0.8" },
  ];
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h1 className="text-lg font-black">Voyage</h1>
        <p className="text-sm text-mid">Sample freight analytics. Live fixtures connect in a later phase.</p>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-s3 text-left font-mono text-[10px] uppercase tracking-wider text-mid">
            <th className="px-5 py-2">Lane</th>
            <th className="px-5 py-2">Vessel</th>
            <th className="px-5 py-2">Rate</th>
            <th className="px-5 py-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {lanes.map((row) => (
            <tr key={row.lane} className="border-t border-border">
              <td className="px-5 py-3">{row.lane}</td>
              <td className="px-5 py-3">{row.vessel}</td>
              <td className="px-5 py-3 font-mono">{row.rate}</td>
              <td className="px-5 py-3 font-mono">{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
