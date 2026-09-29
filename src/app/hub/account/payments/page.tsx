import { payments } from "@/data/sample";

export default function PaymentsPage() {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <h1 className="border-b border-border px-5 py-4 text-lg font-black">Payments</h1>
      <table className="w-full text-sm">
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.date} className="border-t border-border">
              <td className="px-5 py-3">{payment.date}</td>
              <td className="px-5 py-3">{payment.description}</td>
              <td className="px-5 py-3 font-mono">{payment.amount}</td>
              <td className="px-5 py-3">{payment.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
