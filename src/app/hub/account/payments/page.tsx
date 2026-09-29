import { payments } from "@/data/sample";

export default function PaymentsPage() {
  return (
    <div className="max-w-6xl space-y-5">
      <div className="rounded-xl border border-border bg-bg px-4 py-3 text-sm text-mid">You have no pending payments.</div>
      <div className="overflow-hidden rounded-lg border border-border bg-s2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Payments</caption>
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-dim">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Membership</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.date} className="border-t border-border">
                  <td className="px-4 py-4 text-mid">{payment.date}</td>
                  <td className="px-4 py-4 font-semibold text-ink">{payment.amount}</td>
                  <td className="px-4 py-4 text-ink">{payment.description}</td>
                  <td className="px-4 py-4 text-dim">--</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-border bg-s2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mid">
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-dim">--</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
