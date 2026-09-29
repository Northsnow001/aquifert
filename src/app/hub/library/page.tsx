import { hedgeRows, libraryFiles } from "@/data/sample";

export default function LibraryPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-lg font-black">Library</h1>
          <p className="text-sm text-mid">Document library snapshot.</p>
        </div>
        <ul className="divide-y divide-border">
          {libraryFiles.map((file) => (
            <li key={file.title} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>
                <span className="font-semibold">{file.title}</span>
                <span className="ml-2 font-mono text-[10px] uppercase text-dim">{file.collection}</span>
              </span>
              <span className="rounded-full border border-border px-2 py-1 font-mono text-[10px] uppercase text-mid">
                {file.access}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-xs font-bold">Direct Hedge</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-s3 text-left font-mono text-[10px] uppercase text-mid">
              <th className="px-5 py-2">Period</th>
              <th className="px-5 py-2">Commodity</th>
              <th className="px-5 py-2">Bid</th>
              <th className="px-5 py-2">Ask</th>
            </tr>
          </thead>
          <tbody>
            {hedgeRows.map((row) => (
              <tr key={`${row.period}-${row.commodity}`} className="border-t border-border">
                <td className="px-5 py-2">{row.period}</td>
                <td className="px-5 py-2">{row.commodity}</td>
                <td className="px-5 py-2 font-mono">{row.bid}</td>
                <td className="px-5 py-2 font-mono">{row.ask}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
